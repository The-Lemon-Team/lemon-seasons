mod discovery;
mod store;

use discovery::{DiscoveryResult, Endpoint};
use serde::Serialize;
use serde_json::Value;
use store::{NotesPage, NotesQuery, Store};
use tauri::{Manager, State};

type CmdResult<T> = Result<T, String>;

fn err<E: ToString>(e: E) -> String {
    e.to_string()
}

#[derive(Serialize)]
struct RuntimeInfo {
    os: &'static str,
    mobile: bool,
}

#[tauri::command]
fn runtime_info() -> RuntimeInfo {
    RuntimeInfo {
        os: std::env::consts::OS, // "android" on Android
        mobile: cfg!(any(target_os = "android", target_os = "ios")),
    }
}

/// Wi-Fi + backend discovery. `online` is true when a paired LAN backend answers on Wi-Fi.
#[tauri::command]
async fn discover_backend(
    endpoints: Vec<Endpoint>,
    expected_instance_id: Option<String>,
    timeout_ms: Option<u64>,
) -> CmdResult<DiscoveryResult> {
    discovery::discover(endpoints, expected_instance_id, timeout_ms.unwrap_or(1500)).await
}

#[tauri::command]
fn store_kv_get(store: State<Store>, key: String) -> CmdResult<Option<String>> {
    store.kv_get(&key).map_err(err)
}

#[tauri::command]
fn store_kv_set(store: State<Store>, key: String, value: String) -> CmdResult<()> {
    store.kv_set(&key, &value).map_err(err)
}

#[tauri::command]
fn store_outbox_push(store: State<Store>, events: Vec<Value>) -> CmdResult<usize> {
    store.outbox_push(&events).map_err(err)
}

#[tauri::command]
fn store_outbox_list(store: State<Store>, limit: Option<i64>) -> CmdResult<Vec<Value>> {
    store.outbox_list(limit.unwrap_or(100)).map_err(err)
}

#[tauri::command]
fn store_outbox_ack(store: State<Store>, event_ids: Vec<String>) -> CmdResult<usize> {
    store.outbox_ack(&event_ids).map_err(err)
}

#[tauri::command]
fn store_outbox_count(store: State<Store>) -> CmdResult<i64> {
    store.outbox_count().map_err(err)
}

#[tauri::command]
fn store_applied_seen(store: State<Store>, event_ids: Vec<String>) -> CmdResult<Vec<String>> {
    store.applied_seen(&event_ids).map_err(err)
}

#[tauri::command]
fn store_applied_mark(store: State<Store>, event_ids: Vec<String>) -> CmdResult<()> {
    store.applied_mark(&event_ids).map_err(err)
}

#[tauri::command]
fn store_notes_upsert(store: State<Store>, notes: Vec<Value>) -> CmdResult<usize> {
    store.notes_upsert(&notes).map_err(err)
}

#[tauri::command]
fn store_notes_query(store: State<Store>, query: NotesQuery) -> CmdResult<NotesPage> {
    store.notes_query(&query).map_err(err)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            app.manage(Store::open(dir.join("lenta.db"))?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            runtime_info,
            discover_backend,
            store_kv_get,
            store_kv_set,
            store_outbox_push,
            store_outbox_list,
            store_outbox_ack,
            store_outbox_count,
            store_applied_seen,
            store_applied_mark,
            store_notes_upsert,
            store_notes_query,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lenta mobile");
}
