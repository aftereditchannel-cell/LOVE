// Couple OS native shell (Tauri v2).
// The native app loads the same React frontend and talks to your self-hosted
// API (the same backend that serves the web/PWA) — no re-implementation.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![app_version])
        .run(tauri::generate_context!())
        .expect("failed to run Couple OS");
}
