// journal-store.ts — the journal's persistence adapter over the 008 SaveStore
// seam. Reads/writes the versioned `journal` (discoveries) + `stats` records via
// the injected store's typed accessors — never localStorage/IndexedDB directly
// (enforced by journal-store.guard.test.ts + game/purity.test.ts).
import { type SaveStore, loadRecord, saveRecord } from '@/platform'
import type { DiscoveryMap, JournalStats } from './journal'

export async function loadDiscoveries(store: SaveStore): Promise<DiscoveryMap> {
  const rec = await loadRecord(store, 'journal')
  return rec.discoveries
}

export async function saveDiscoveries(store: SaveStore, discoveries: DiscoveryMap): Promise<void> {
  const rec = await loadRecord(store, 'journal')
  await saveRecord(store, 'journal', { ...rec, discoveries })
}

export async function loadStats(store: SaveStore): Promise<JournalStats> {
  const rec = await loadRecord(store, 'stats')
  return { boardsSolved: rec.boardsSolved, poolsFilled: rec.poolsFilled, creaturesFound: rec.creaturesFound }
}

export async function saveStats(store: SaveStore, stats: JournalStats): Promise<void> {
  const rec = await loadRecord(store, 'stats')
  await saveRecord(store, 'stats', { ...rec, ...stats })
}
