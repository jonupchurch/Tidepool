// platform — the persistence/OS seam. Consumers import ONLY from this barrel:
// the SaveStore provider + typed accessors + record/blob types. Never a backend
// and never a storage/OS API directly (enforced by no-direct-storage.test.ts).
// Feature 009's Tauri backend drops into `createSaveStore` with no consumer
// changes (same SaveStore interface).
export type { ImportResult, SaveStore } from './save-store'
export { keyFor, loadRecord, namespaceOfKey, removeRecord, saveRecord } from './save-store'
export type {
  CuratedProgressRecord,
  InProgressBoardRecord,
  JournalRecord,
  Namespace,
  OnboardingRecord,
  SaveBlob,
  SchemaFor,
  SettingsRecord,
  ShellPrefsRecord,
  StatsRecord,
} from './schemas'
export { DEFAULTS, NAMESPACES } from './schemas'

import { createMemoryBackend } from './memory-backend'
import type { SaveStore } from './save-store'
import { createTauriBackend } from './tauri-backend'
import { type WebBackendOptions, createWebBackend } from './web-backend'

export type SaveStoreOptions = WebBackendOptions

/**
 * True when running inside the Tauri webview.
 *
 * Checks `__TAURI_INTERNALS__`, not `__TAURI__`: Tauri v2 only exposes the
 * latter when `app.withGlobalTauri` is turned on, which it isn't. Testing for
 * `__TAURI__` looked right and silently never matched, so the desktop app would
 * have quietly fallen through to the browser backend.
 */
function isTauri(): boolean {
  return typeof globalThis !== 'undefined' && '__TAURI_INTERNALS__' in globalThis
}

/** Whether real browser storage is present and writable this session. */
function storageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false
    const probe = '__tp_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

/**
 * Build a SaveStore for the current environment. Browser with working storage →
 * web backend; otherwise (private mode / disabled storage / non-DOM test host) →
 * the in-memory backend, so the app still runs for the session. The Tauri
 * backend from feature 009 slots in at the marked branch below.
 */
export function createSaveStore(opts: SaveStoreOptions = {}): SaveStore {
  // Desktop: a real file on disk, so Steam Auto-Cloud has something to sync.
  // The webview's own localStorage would work locally but is an opaque store
  // Steam can't see.
  if (isTauri()) return createTauriBackend(opts)
  if (!storageAvailable()) {
    opts.onNotice?.('Storage is unavailable — progress will not be saved this session.')
    return createMemoryBackend()
  }
  return createWebBackend(opts)
}

let singleton: SaveStore | null = null

/** The process-wide SaveStore (created on first use). */
export function getSaveStore(opts?: SaveStoreOptions): SaveStore {
  if (!singleton) singleton = createSaveStore(opts)
  return singleton
}

/** Test-only: drop the cached singleton so the next getSaveStore rebuilds it. */
export function resetSaveStoreForTests(): void {
  singleton = null
}
