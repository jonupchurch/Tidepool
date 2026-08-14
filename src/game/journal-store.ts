// journal-store.ts — the journal's persistence adapter over the 008 SaveStore
// seam. Reads/writes the versioned `journal` (discoveries) + `stats` records via
// the injected store's typed accessors — never localStorage/IndexedDB directly
// (enforced by journal-store.guard.test.ts + game/purity.test.ts).
import { type SaveStore, loadRecord, saveRecord } from '@/platform'
import { type DiscoveryMap, type JournalStats, countCleanCurated } from './journal'

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
  return {
    boardsSolved: rec.boardsSolved,
    poolsFilled: rec.poolsFilled,
    creaturesFound: rec.creaturesFound,
    boardsPerfect: rec.boardsPerfect,
  }
}

export async function saveStats(store: SaveStore, stats: JournalStats): Promise<void> {
  const rec = await loadRecord(store, 'stats')
  // Spread the record first so bookkeeping the view model doesn't carry —
  // `perfectSeeded` — survives a stats write.
  await saveRecord(store, 'stats', { ...rec, ...stats })
}

/**
 * One-time backfill of `boardsPerfect` from curated progress (FR-007).
 *
 * Curated entries already record the fewest mistakes of any run, so a player
 * upgrading into 011 has evidence of clean solves on disk. Without this they
 * would open the new counter and see a zero, which reads as the game having
 * forgotten.
 *
 * This is deliberately NOT part of the v1 → v2 migration: `migrateRecord` is
 * pure and receives one raw record, with no store to read another namespace
 * from. Forcing it there would break the property that makes migrations
 * testable. So it runs at boot instead, guarded by a persisted flag.
 *
 * Idempotent: the flag is written in the same pass, so a second call — or a
 * hundred restarts — adds nothing.
 */
export async function seedPerfectFromCurated(store: SaveStore): Promise<void> {
  const rec = await loadRecord(store, 'stats')
  if (rec.perfectSeeded) return
  const curated = await loadRecord(store, 'curatedProgress')
  await saveRecord(store, 'stats', {
    ...rec,
    boardsPerfect: rec.boardsPerfect + countCleanCurated(curated.solved),
    perfectSeeded: true,
  })
}
