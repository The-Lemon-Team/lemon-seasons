import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'node:module';
import type { DatabaseSync } from 'node:sqlite';
import { LemonBusEnvelope } from '../types/bus-contract.types.js';
import { ModerationDb } from './moderation.db.js';

const nodeRequire = typeof require !== 'undefined' ? require : createRequire(path.resolve('.'));
const { DatabaseSync: SQLiteDatabase } = nodeRequire('node:' + 'sqlite') as {
  DatabaseSync: new (path: string, options?: any) => DatabaseSync;
};

export interface BusDatabaseConfig {
  dbPath?: string;
  retentionDays?: number;
}

export class BusDatabase {
  private readonly db: DatabaseSync;
  public readonly moderation: ModerationDb;

  constructor(config: BusDatabaseConfig = {}) {
    const defaultPath = fs.existsSync('/data') ? '/data/lemon-bus.db' : './lemon-bus.db';
    const resolvedPath = config.dbPath || process.env.LEMON_BUS_DB_PATH || defaultPath;
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new SQLiteDatabase(resolvedPath);
    this.initSchema();
    this.moderation = new ModerationDb(this.db);
  }

  private initSchema(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS lemon_bus_events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        entity_type TEXT NOT NULL,
        action TEXT NOT NULL,
        origin TEXT NOT NULL,
        transport_via TEXT NOT NULL DEFAULT 'hybrid',
        device_id TEXT NOT NULL,
        stream_slug TEXT,
        feed_slug TEXT,
        external_id TEXT,
        content_hash TEXT,
        privacy TEXT NOT NULL DEFAULT 'private',
        payload TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_events_seq ON lemon_bus_events (seq ASC);
      CREATE INDEX IF NOT EXISTS idx_events_feed_seq ON lemon_bus_events (feed_slug, seq ASC);
      CREATE INDEX IF NOT EXISTS idx_events_stream_seq ON lemon_bus_events (stream_slug, seq ASC);
      CREATE INDEX IF NOT EXISTS idx_events_content_hash ON lemon_bus_events (content_hash);

      CREATE TABLE IF NOT EXISTS lemon_spark_documents (
        id TEXT PRIMARY KEY,
        canonical_path TEXT NOT NULL UNIQUE,
        file_name TEXT NOT NULL,
        folder_path TEXT NOT NULL,
        feed_slug TEXT NOT NULL,
        title TEXT NOT NULL,
        content_markdown TEXT NOT NULL,
        frontmatter TEXT NOT NULL DEFAULT '{}',
        content_hash TEXT NOT NULL,
        privacy TEXT NOT NULL DEFAULT 'private',
        origin_provider TEXT NOT NULL DEFAULT 'CLOUD_SPARK',
        updated_by_device TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_sparks_feed ON lemon_spark_documents (feed_slug, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sparks_hash ON lemon_spark_documents (content_hash);

      CREATE TABLE IF NOT EXISTS lemon_bus_watermarks (
        device_id TEXT PRIMARY KEY,
        last_seq INTEGER NOT NULL DEFAULT 0,
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    try {
      this.db.exec(`ALTER TABLE lemon_bus_events ADD COLUMN transport_via TEXT NOT NULL DEFAULT 'hybrid';`);
    } catch {
      // Column already exists or table created with it
    }
  }

  insertEvent(envelope: Omit<LemonBusEnvelope, 'seq'>): LemonBusEnvelope {
    const stmt = this.db.prepare(`
      INSERT INTO lemon_bus_events (
        event_id, entity_type, action, origin, transport_via, device_id,
        stream_slug, feed_slug, external_id, content_hash, privacy, payload, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING seq, created_at;
    `);

    const result = stmt.get(
      envelope.eventId,
      envelope.entityType,
      envelope.action,
      envelope.origin,
      envelope.transportVia || 'hybrid',
      envelope.deviceId,
      envelope.streamSlug || null,
      envelope.feedSlug || null,
      envelope.externalId || null,
      envelope.contentHash || null,
      envelope.privacy || 'private',
      JSON.stringify(envelope.payload ?? {}),
      envelope.timestamp || new Date().toISOString()
    ) as { seq: number; created_at: string };

    this.updateWatermark(envelope.deviceId, result.seq);

    return {
      ...envelope,
      seq: result.seq,
      timestamp: envelope.timestamp || result.created_at,
    };
  }

  queryEvents(params: {
    afterSeq?: number;
    feedSlug?: string;
    streamSlug?: string;
    action?: string;
    limit?: number;
  }): { items: LemonBusEnvelope[]; lastSeq: number; total: number } {
    const conditions: string[] = [];
    const values: any[] = [];

    if (params.afterSeq != null && params.afterSeq >= 0) {
      conditions.push('seq > ?');
      values.push(params.afterSeq);
    }
    if (params.feedSlug) {
      conditions.push('feed_slug = ?');
      values.push(params.feedSlug);
    }
    if (params.streamSlug) {
      conditions.push('stream_slug = ?');
      values.push(params.streamSlug);
    }
    if (params.action) {
      conditions.push('action = ?');
      values.push(params.action);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(Math.max(1, params.limit || 50), 500);

    const countStmt = this.db.prepare(`SELECT COUNT(*) as cnt FROM lemon_bus_events ${whereClause}`);
    const countRow = countStmt.get(...values) as { cnt: number };

    const queryStmt = this.db.prepare(`
      SELECT seq, event_id, entity_type, action, origin, transport_via, device_id,
             stream_slug, feed_slug, external_id, content_hash, privacy, payload, created_at
      FROM lemon_bus_events
      ${whereClause}
      ORDER BY seq ASC
      LIMIT ?
    `);

    const rows = queryStmt.all(...values, limit) as any[];
    const items: LemonBusEnvelope[] = rows.map((r) => ({
      seq: r.seq,
      eventId: r.event_id,
      entityType: r.entity_type,
      action: r.action,
      origin: r.origin,
      transportVia: r.transport_via || 'hybrid',
      deviceId: r.device_id,
      streamSlug: r.stream_slug,
      feedSlug: r.feed_slug,
      externalId: r.external_id,
      contentHash: r.content_hash,
      privacy: r.privacy,
      payload: safeJsonParse(r.payload),
      timestamp: r.created_at,
    }));

    const lastSeq = items.length > 0 ? items[items.length - 1].seq! : (params.afterSeq || 0);

    return {
      items,
      lastSeq,
      total: countRow?.cnt || 0,
    };
  }

  upsertSparkDocument(doc: {
    id: string;
    canonicalPath: string;
    fileName: string;
    folderPath: string;
    feedSlug: string;
    title: string;
    contentMarkdown: string;
    frontmatter: Record<string, any>;
    contentHash: string;
    privacy: 'public' | 'private';
    originProvider: string;
    updatedByDevice: string;
  }): { id: string; canonicalPath: string; contentHash: string; updatedAt: string } {
    const stmt = this.db.prepare(`
      INSERT INTO lemon_spark_documents (
        id, canonical_path, file_name, folder_path, feed_slug,
        title, content_markdown, frontmatter, content_hash, privacy,
        origin_provider, updated_by_device, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(canonical_path) DO UPDATE SET
        title = excluded.title,
        content_markdown = excluded.content_markdown,
        frontmatter = excluded.frontmatter,
        content_hash = excluded.content_hash,
        privacy = excluded.privacy,
        origin_provider = excluded.origin_provider,
        updated_by_device = excluded.updated_by_device,
        updated_at = datetime('now')
      RETURNING id, canonical_path, content_hash, updated_at;
    `);

    const row = stmt.get(
      doc.id,
      doc.canonicalPath,
      doc.fileName,
      doc.folderPath,
      doc.feedSlug,
      doc.title,
      doc.contentMarkdown,
      JSON.stringify(doc.frontmatter || {}),
      doc.contentHash,
      doc.privacy,
      doc.originProvider,
      doc.updatedByDevice
    ) as any;

    return {
      id: row.id,
      canonicalPath: row.canonical_path,
      contentHash: row.content_hash,
      updatedAt: row.updated_at,
    };
  }

  getSparkDocument(canonicalPath: string): any | null {
    const stmt = this.db.prepare(`SELECT * FROM lemon_spark_documents WHERE canonical_path = ?`);
    const row = stmt.get(canonicalPath) as any;
    if (!row) return null;
    return {
      id: row.id,
      canonicalPath: row.canonical_path,
      fileName: row.file_name,
      folderPath: row.folder_path,
      feedSlug: row.feed_slug,
      title: row.title,
      contentMarkdown: row.content_markdown,
      frontmatter: safeJsonParse(row.frontmatter),
      contentHash: row.content_hash,
      privacy: row.privacy,
      originProvider: row.origin_provider,
      updatedByDevice: row.updated_by_device,
      updatedAt: row.updated_at,
    };
  }

  updateWatermark(deviceId: string, lastSeq: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO lemon_bus_watermarks (device_id, last_seq, last_seen_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(device_id) DO UPDATE SET
        last_seq = MAX(last_seq, excluded.last_seq),
        last_seen_at = datetime('now');
    `);
    stmt.run(deviceId, lastSeq);
  }

  getWatermark(deviceId: string): number {
    const row = this.db.prepare(`SELECT last_seq FROM lemon_bus_watermarks WHERE device_id = ?`).get(deviceId) as any;
    return row?.last_seq || 0;
  }

  hasEvent(eventId: string): boolean {
    const row = this.db.prepare(`SELECT 1 FROM lemon_bus_events WHERE event_id = ? LIMIT 1`).get(eventId);
    return Boolean(row);
  }

  hasSparkDocumentByHash(contentHash: string): boolean {
    const row = this.db.prepare(`SELECT 1 FROM lemon_spark_documents WHERE content_hash = ? LIMIT 1`).get(contentHash);
    return Boolean(row);
  }

  purgeExpiredBuffer(retentionDays = 30): { purgedEvents: number; purgedSparks: number } {
    const days = Math.max(1, retentionDays);
    const deleteEventsStmt = this.db.prepare(`
      DELETE FROM lemon_bus_events WHERE created_at < datetime('now', '-' || ? || ' days')
    `);
    const eventsRes = deleteEventsStmt.run(days);

    const deleteSparksStmt = this.db.prepare(`
      DELETE FROM lemon_spark_documents WHERE updated_at < datetime('now', '-' || ? || ' days')
    `);
    const sparksRes = deleteSparksStmt.run(days);

    return {
      purgedEvents: Number(eventsRes.changes || 0),
      purgedSparks: Number(sparksRes.changes || 0),
    };
  }

  getStats(): {
    totalEvents: number;
    lastSeq: number;
    totalSparks: number;
    moderation: ReturnType<ModerationDb['getStats']>;
  } {
    const eventsRow = this.db.prepare(`SELECT COUNT(*) as cnt, COALESCE(MAX(seq), 0) as maxSeq FROM lemon_bus_events`).get() as any;
    const sparksRow = this.db.prepare(`SELECT COUNT(*) as cnt FROM lemon_spark_documents`).get() as any;
    return {
      totalEvents: eventsRow?.cnt || 0,
      lastSeq: eventsRow?.maxSeq || 0,
      totalSparks: sparksRow?.cnt || 0,
      moderation: this.moderation.getStats(),
    };
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      // Ignore if already closed
    }
  }
}

function safeJsonParse(val: any): any {
  if (typeof val !== 'string') return val || {};
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}
