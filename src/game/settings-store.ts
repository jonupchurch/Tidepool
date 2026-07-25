// settings-store.ts — the reactive settings store + its persistence adapter
// over the 008 SaveStore seam (mirrors `journal-store.ts`). Framework-neutral:
// no React, no DOM, and never touches localStorage directly. Settings apply
// live by notifying subscribers synchronously; the write-back is fire-and-forget
// so a slow disk never stalls the UI.
import { type SaveStore, loadRecord, saveRecord } from '@/platform'
import { DEFAULT_SETTINGS, type Settings, cloneSettings, resolveSettings, toSettingsRecord } from './settings'

type Listener = () => void

let current: Settings = cloneSettings(DEFAULT_SETTINGS)
let backing: SaveStore | null = null
const listeners = new Set<Listener>()

/** The live settings. Referentially stable until something changes. */
export function getSettings(): Settings {
  return current
}

/** Subscribe to changes; returns an unsubscribe. */
export function subscribeSettings(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit(): void {
  for (const fn of [...listeners]) fn()
}

/**
 * Update one field. Typed by group so a typo can't silently write a key nothing
 * reads. Returns the new settings; persists in the background.
 */
export function setSetting<G extends keyof Settings, K extends keyof Settings[G]>(
  group: G,
  key: K,
  value: Settings[G][K],
): Settings {
  if (current[group][key] === value) return current
  current = { ...current, [group]: { ...current[group], [key]: value } }
  emit()
  void persist()
  return current
}

/** Replace everything (an import, or a reset to defaults). */
export function replaceSettings(next: Settings): Settings {
  current = cloneSettings(next)
  emit()
  void persist()
  return current
}

/** Load persisted settings, merged onto the defaults, and notify. */
export async function hydrateSettings(store: SaveStore): Promise<Settings> {
  backing = store
  const rec = await loadRecord(store, 'settings')
  current = resolveSettings(rec)
  emit()
  return current
}

async function persist(): Promise<void> {
  if (!backing) return
  await saveRecord(backing, 'settings', toSettingsRecord(current))
}

/** Test seam: drop the store binding and return to first-run defaults. */
export function resetSettingsStore(): void {
  current = cloneSettings(DEFAULT_SETTINGS)
  backing = null
  listeners.clear()
}
