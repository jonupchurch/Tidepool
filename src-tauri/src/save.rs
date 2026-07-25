//! Save file I/O for the desktop build.
//!
//! Deliberately dumb: it loads and stores one opaque text document and knows
//! nothing about what's inside it. All the save *logic* lives in TypeScript
//! (`src/platform/tauri-backend.ts`) where it's unit-testable without spinning up
//! a webview — this side just has to not lose the bytes.
//!
//! The file lives in the app data directory as `save.json`, one file, so Steam
//! Auto-Cloud can sync it with a single pattern and a player's progress moves
//! between machines as one consistent unit.

use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;

/// `<app data dir>/save.json`, creating the directory on first use.
fn save_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no app data directory: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("could not create {}: {e}", dir.display()))?;
    Ok(dir.join("save.json"))
}

/// The stored save document, or `None` when the player has never saved.
///
/// A missing file is not an error — it's a new player.
#[tauri::command]
pub fn save_load(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = save_path(&app)?;
    match fs::read_to_string(&path) {
        Ok(text) => Ok(Some(text)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("could not read {}: {e}", path.display())),
    }
}

/// Write the save document.
///
/// Writes to a temporary file, flushes it to the physical disk, then renames it
/// over the real one. Renaming within a directory is atomic, so a crash or power
/// cut can leave the old save or the new one but never a half-written file. The
/// naive version — truncate `save.json` and write into it — is exactly how a
/// player loses hours of progress to a badly-timed crash.
#[tauri::command]
pub fn save_store(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let path = save_path(&app)?;
    let tmp = path.with_extension("json.tmp");

    {
        let mut file =
            fs::File::create(&tmp).map_err(|e| format!("could not create {}: {e}", tmp.display()))?;
        file.write_all(contents.as_bytes())
            .map_err(|e| format!("could not write {}: {e}", tmp.display()))?;
        // Without this the rename can land before the data does.
        file.sync_all()
            .map_err(|e| format!("could not flush {}: {e}", tmp.display()))?;
    }

    fs::rename(&tmp, &path).map_err(|e| format!("could not replace {}: {e}", path.display()))?;
    Ok(())
}

/// Where the save lives — surfaced so the Steam Auto-Cloud path can be confirmed
/// on a real machine rather than guessed at from documentation.
#[tauri::command]
pub fn save_location(app: tauri::AppHandle) -> Result<String, String> {
    Ok(save_path(&app)?.display().to_string())
}
