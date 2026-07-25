// journal.ts — the Shore Journal read model + discovery recorder (005). Pure
// derivations (view, filters, the discovery branch) are testable in isolation;
// `recordDiscovery`/`recordBoardSolved` orchestrate persistence through the
// journal-store adapter (the 008 SaveStore seam — never storage directly).
import type { SaveStore } from '@/platform'
import { type CreatureDef, CREATURES, creatureDef } from './creatures'
import { loadDiscoveries, loadStats, saveDiscoveries, saveStats } from './journal-store'

/** A per-creature discovery as persisted (presence in the map ⇒ found). */
export interface DiscoveryRecord {
  firstFoundSeed: string
  count: number
}
export type DiscoveryMap = Record<string, DiscoveryRecord>

/** Lifetime totals shown by the journal footer (read from persistence). */
export interface JournalStats {
  boardsSolved: number
  poolsFilled: number
  creaturesFound: number
}

export type JournalFilter = 'all' | 'found' | 'missing'

/** A creature's row in the journal view: its definition + discovery state. */
export interface CreatureView {
  def: CreatureDef
  found: boolean
  count: number
  firstFoundSeed: string | null
}

export interface JournalView {
  cards: CreatureView[]
  foundCount: number
  total: number
}

/** Derive the per-creature view + "X of Y found" count from the catalog + records. */
export function buildJournalView(
  discoveries: DiscoveryMap,
  catalog: readonly CreatureDef[] = CREATURES,
): JournalView {
  const cards: CreatureView[] = catalog.map((def) => {
    const d = discoveries[def.id]
    return { def, found: Boolean(d), count: d?.count ?? 0, firstFoundSeed: d?.firstFoundSeed ?? null }
  })
  return { cards, foundCount: cards.filter((c) => c.found).length, total: catalog.length }
}

/** Partition the view by All / Found / Missing (SC-005). */
export function filterCards(cards: readonly CreatureView[], filter: JournalFilter): CreatureView[] {
  if (filter === 'found') return cards.filter((c) => c.found)
  if (filter === 'missing') return cards.filter((c) => !c.found)
  return cards.slice()
}

/** Whether recording a find of `creatureId` would newly discover it (drives stats). */
export function isNewDiscovery(discoveries: DiscoveryMap, creatureId: string): boolean {
  return !discoveries[creatureId]
}

/** Pure: the discoveries map after a find — first find sets seed + count 1; a
 *  re-find increments the count and preserves the first-found seed (FR-003/004). */
export function applyDiscovery(discoveries: DiscoveryMap, creatureId: string, seed: string): DiscoveryMap {
  const existing = discoveries[creatureId]
  const next: DiscoveryRecord = existing
    ? { firstFoundSeed: existing.firstFoundSeed, count: existing.count + 1 }
    : { firstFoundSeed: seed, count: 1 }
  return { ...discoveries, [creatureId]: next }
}

/**
 * Record a discovery on pool completion: update the discoveries map, then bump
 * the gentle lifetime stats (a filled pool always; creatures-found tracks the
 * map). Persisted via the journal-store adapter. Unknown ids are ignored.
 */
export async function recordDiscovery(store: SaveStore, creatureId: string, seed: string): Promise<void> {
  if (!creatureDef(creatureId)) return
  const discoveries = await loadDiscoveries(store)
  const next = applyDiscovery(discoveries, creatureId, seed)
  await saveDiscoveries(store, next)
  const stats = await loadStats(store)
  await saveStats(store, {
    ...stats,
    poolsFilled: stats.poolsFilled + 1,
    creaturesFound: Object.keys(next).length,
  })
}

/** Bump the lifetime boards-solved total (on board completion). */
export async function recordBoardSolved(store: SaveStore): Promise<void> {
  const stats = await loadStats(store)
  await saveStats(store, { ...stats, boardsSolved: stats.boardsSolved + 1 })
}
