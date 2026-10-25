//! Local SQLite store. The webview never touches the DB directly; it goes through the
//! `store_*` commands. Notes are cached as DTO JSON documents plus a few indexed columns,
//! not as a mirror of the backend's Prisma schema.

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;
use std::sync::Mutex;

pub struct Store {
    conn: Mutex<Connection>,
}

#[derive(Deserialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotesQuery {
    pub feed_id: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Serialize)]
pub struct NotesPage {
    pub items: Vec<Value>,
    pub total: i64,
}

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS outbox (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  hlc TEXT NOT NULL,
  body TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS applied_events (event_id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  feed_id TEXT,
  start_date TEXT,
  updated_at TEXT,
  deleted INTEGER NOT NULL DEFAULT 0,
  doc TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notes_feed_date ON notes (feed_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_notes_date ON notes (start_date DESC);
";

fn str_field(v: &Value, key: &str) -> Option<String> {
    v.get(key).and_then(|x| x.as_str()).map(str::to_owned)
}

impl Store {
    pub fn open(path: impl AsRef<Path>) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        Self::init(conn)
    }

    #[cfg(test)]
    pub fn open_in_memory() -> rusqlite::Result<Self> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(conn: Connection) -> rusqlite::Result<Self> {
        conn.execute_batch("PRAGMA journal_mode = WAL;")?;
        conn.execute_batch(SCHEMA)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    fn db(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().expect("store mutex poisoned")
    }

    pub fn kv_get(&self, key: &str) -> rusqlite::Result<Option<String>> {
        self.db()
            .query_row("SELECT value FROM kv WHERE key = ?1", [key], |r| r.get(0))
            .optional()
    }

    pub fn kv_set(&self, key: &str, value: &str) -> rusqlite::Result<()> {
        self.db().execute(
            "INSERT INTO kv (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    /// Idempotent by `eventId`. Returns how many events were newly queued.
    pub fn outbox_push(&self, events: &[Value]) -> rusqlite::Result<usize> {
        let mut db = self.db();
        let tx = db.transaction()?;
        let mut added = 0;
        for e in events {
            let (Some(id), Some(hlc)) = (str_field(e, "eventId"), str_field(e, "hlc")) else { continue };
            added += tx.execute(
                "INSERT OR IGNORE INTO outbox (event_id, hlc, body) VALUES (?1, ?2, ?3)",
                params![id, hlc, e.to_string()],
            )?;
        }
        tx.commit()?;
        Ok(added)
    }

    pub fn outbox_list(&self, limit: i64) -> rusqlite::Result<Vec<Value>> {
        let db = self.db();
        let mut stmt = db.prepare("SELECT body FROM outbox ORDER BY seq ASC LIMIT ?1")?;
        let rows = stmt.query_map([limit], |r| r.get::<_, String>(0))?;
        Ok(rows
            .filter_map(Result::ok)
            .filter_map(|b| serde_json::from_str(&b).ok())
            .collect())
    }

    pub fn outbox_ack(&self, event_ids: &[String]) -> rusqlite::Result<usize> {
        let mut db = self.db();
        let tx = db.transaction()?;
        let mut removed = 0;
        for id in event_ids {
            removed += tx.execute("DELETE FROM outbox WHERE event_id = ?1", [id])?;
        }
        tx.commit()?;
        Ok(removed)
    }

    pub fn outbox_count(&self) -> rusqlite::Result<i64> {
        self.db().query_row("SELECT COUNT(*) FROM outbox", [], |r| r.get(0))
    }

    pub fn applied_seen(&self, event_ids: &[String]) -> rusqlite::Result<Vec<String>> {
        let db = self.db();
        let mut stmt = db.prepare("SELECT 1 FROM applied_events WHERE event_id = ?1")?;
        let mut seen = Vec::new();
        for id in event_ids {
            if stmt.exists([id])? {
                seen.push(id.clone());
            }
        }
        Ok(seen)
    }

    pub fn applied_mark(&self, event_ids: &[String]) -> rusqlite::Result<()> {
        let mut db = self.db();
        let tx = db.transaction()?;
        for id in event_ids {
            tx.execute(
                "INSERT OR IGNORE INTO applied_events (event_id, applied_at) VALUES (?1, strftime('%s','now'))",
                [id],
            )?;
        }
        tx.commit()
    }

    /// Upserts note DTOs. A row is only replaced by a document with `updatedAt >=` the stored one,
    /// so replayed pull pages (boundary rows) can't roll a note back.
    pub fn notes_upsert(&self, notes: &[Value]) -> rusqlite::Result<usize> {
        let mut db = self.db();
        let tx = db.transaction()?;
        let mut written = 0;
        for n in notes {
            let Some(id) = str_field(n, "id") else { continue };
            let deleted = n.get("deletedAt").map_or(false, |d| !d.is_null());
            written += tx.execute(
                "INSERT INTO notes (id, feed_id, start_date, updated_at, deleted, doc)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                 ON CONFLICT(id) DO UPDATE SET
                   feed_id = excluded.feed_id, start_date = excluded.start_date,
                   updated_at = excluded.updated_at, deleted = excluded.deleted, doc = excluded.doc
                 WHERE COALESCE(excluded.updated_at, '') >= COALESCE(notes.updated_at, '')",
                params![
                    id,
                    str_field(n, "feedId"),
                    str_field(n, "startDate"),
                    str_field(n, "updatedAt"),
                    deleted as i64,
                    n.to_string()
                ],
            )?;
        }
        tx.commit()?;
        Ok(written)
    }

    pub fn notes_query(&self, q: &NotesQuery) -> rusqlite::Result<NotesPage> {
        let mut clauses = vec!["deleted = 0".to_string()];
        let mut args: Vec<String> = Vec::new();
        let mut push = |clause: &str, v: &Option<String>, args: &mut Vec<String>| {
            if let Some(v) = v.as_ref().filter(|s| !s.is_empty()) {
                args.push(v.clone());
                clauses.push(format!("{} ?{}", clause, args.len()));
            }
        };
        push("feed_id =", &q.feed_id, &mut args);
        push("start_date >=", &q.from, &mut args);
        push("start_date <=", &q.to, &mut args);
        let search = q.search.as_ref().filter(|s| !s.is_empty()).map(|s| format!("%{s}%"));
        push("doc LIKE", &search, &mut args);
        let where_sql = clauses.join(" AND ");

        let db = self.db();
        let total: i64 = db.query_row(
            &format!("SELECT COUNT(*) FROM notes WHERE {where_sql}"),
            rusqlite::params_from_iter(args.iter()),
            |r| r.get(0),
        )?;
        let limit = q.limit.unwrap_or(50).clamp(1, 500);
        let offset = q.offset.unwrap_or(0).max(0);
        let mut stmt = db.prepare(&format!(
            "SELECT doc FROM notes WHERE {where_sql} ORDER BY start_date DESC, id LIMIT {limit} OFFSET {offset}"
        ))?;
        let items = stmt
            .query_map(rusqlite::params_from_iter(args.iter()), |r| r.get::<_, String>(0))?
            .filter_map(Result::ok)
            .filter_map(|d| serde_json::from_str(&d).ok())
            .collect();
        Ok(NotesPage { items, total })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn note(id: &str, feed: &str, date: &str, updated: &str) -> Value {
        json!({ "id": id, "feedId": feed, "startDate": date, "updatedAt": updated, "title": id })
    }

    #[test]
    fn outbox_is_idempotent_and_ordered() {
        let s = Store::open_in_memory().unwrap();
        let e = |id: &str| json!({ "eventId": id, "hlc": "0000000000001-0000-d" });
        assert_eq!(s.outbox_push(&[e("a"), e("b")]).unwrap(), 2);
        assert_eq!(s.outbox_push(&[e("a")]).unwrap(), 0);
        let ids: Vec<_> = s.outbox_list(10).unwrap().iter().map(|v| v["eventId"].as_str().unwrap().to_owned()).collect();
        assert_eq!(ids, vec!["a", "b"]);
        s.outbox_ack(&["a".into()]).unwrap();
        assert_eq!(s.outbox_count().unwrap(), 1);
    }

    #[test]
    fn applied_log_tracks_seen_events() {
        let s = Store::open_in_memory().unwrap();
        s.applied_mark(&["x".into()]).unwrap();
        assert_eq!(s.applied_seen(&["x".into(), "y".into()]).unwrap(), vec!["x"]);
    }

    #[test]
    fn upsert_does_not_roll_back_to_older_document() {
        let s = Store::open_in_memory().unwrap();
        s.notes_upsert(&[note("n1", "f", "2026-01-02", "2026-01-05")]).unwrap();
        s.notes_upsert(&[note("n1", "f", "2026-01-02", "2026-01-03")]).unwrap();
        let page = s.notes_query(&NotesQuery::default()).unwrap();
        assert_eq!(page.items[0]["updatedAt"], "2026-01-05");
    }

    #[test]
    fn query_filters_and_hides_deleted() {
        let s = Store::open_in_memory().unwrap();
        let mut gone = note("n3", "f1", "2026-01-03", "2026-01-03");
        gone["deletedAt"] = json!("2026-01-04");
        s.notes_upsert(&[
            note("n1", "f1", "2026-01-01", "2026-01-01"),
            note("n2", "f2", "2026-01-02", "2026-01-02"),
            gone,
        ])
        .unwrap();
        let all = s.notes_query(&NotesQuery::default()).unwrap();
        assert_eq!(all.total, 2);
        assert_eq!(all.items[0]["id"], "n2"); // newest first
        let f1 = s.notes_query(&NotesQuery { feed_id: Some("f1".into()), ..Default::default() }).unwrap();
        assert_eq!(f1.total, 1);
        let ranged = s.notes_query(&NotesQuery { from: Some("2026-01-02".into()), ..Default::default() }).unwrap();
        assert_eq!(ranged.total, 1);
    }

    #[test]
    fn kv_roundtrip() {
        let s = Store::open_in_memory().unwrap();
        assert_eq!(s.kv_get("cursor").unwrap(), None);
        s.kv_set("cursor", "1").unwrap();
        s.kv_set("cursor", "2").unwrap();
        assert_eq!(s.kv_get("cursor").unwrap().as_deref(), Some("2"));
    }
}
