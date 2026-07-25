// curated.ts — load the bundled manifest of blessed seeds, merge persisted
// progress, and derive per-entry BoardRequests + lock state. The manifest is
// oracle-validated in CI so no unsolvable board can ship. Pure (progress I/O
// goes through the injected SaveStore seam). No DOM, no randomness.
import type { DifficultyTier, SizeTier } from '@/core'
import { type SaveStore, loadRecord, saveRecord } from '@/platform'
import curatedJson from '@/content/curated.json'
import { creatureDef } from '../creatures'
import type { BoardRequest } from './request'

export interface CuratedEntry {
  id: string
  name: string
  seed: string
  size: SizeTier
  difficulty: DifficultyTier
  order: number
}

export interface CuratedManifest {
  version: number
  entries: CuratedEntry[]
}

export interface CuratedRow {
  entry: CuratedEntry
  request: BoardRequest
  solved: boolean
  /** Name of the creature earned on solve, or null if unsolved. */
  earnedCreature: string | null
  locked: boolean
}

/** Gating config — ships open by default; gentle prerequisite unlocks optional. */
export interface GatingConfig {
  enabled: boolean
  /** How many entries ahead of your solved frontier stay open (default 1). */
  unlockAfter?: number
}

/** Fully open — the default (FR-008). */
export const OPEN_GATING: GatingConfig = { enabled: false }

type SolvedMap = Record<string, { earnedCreatureId: string }>

/** The shipped manifest, entries sorted by `order`. */
export function loadCuratedPack(): CuratedManifest {
  const raw = curatedJson as CuratedManifest
  return { version: raw.version, entries: [...raw.entries].sort((a, b) => a.order - b.order) }
}

/** Soft-lock computation: an entry stays open while it's within `unlockAfter`
 *  of your solved frontier; open for everything when gating is disabled. */
export function resolveLocks(
  entries: CuratedEntry[],
  solvedIds: ReadonlySet<string>,
  config: GatingConfig,
): Map<string, boolean> {
  const sorted = [...entries].sort((a, b) => a.order - b.order)
  const lookahead = config.enabled ? (config.unlockAfter ?? 1) : Number.POSITIVE_INFINITY
  const locks = new Map<string, boolean>()
  let unsolvedBefore = 0
  for (const e of sorted) {
    locks.set(e.id, unsolvedBefore > lookahead)
    if (!solvedIds.has(e.id)) unsolvedBefore++
  }
  return locks
}

/** Merge the manifest with progress + gating into displayable rows. Pure. */
export function manifestRows(
  manifest: CuratedManifest,
  solved: SolvedMap,
  config: GatingConfig = OPEN_GATING,
): CuratedRow[] {
  const entries = [...manifest.entries].sort((a, b) => a.order - b.order)
  const solvedIds = new Set(Object.keys(solved))
  const locks = resolveLocks(entries, solvedIds, config)
  return entries.map((entry) => ({
    entry,
    request: { seed: entry.seed, size: entry.size, difficulty: entry.difficulty },
    solved: solvedIds.has(entry.id),
    earnedCreature: solved[entry.id]
      ? (creatureDef(solved[entry.id].earnedCreatureId)?.name ?? null)
      : null,
    locked: locks.get(entry.id) ?? false,
  }))
}

/** Read progress from the store and produce merged rows. */
export async function getCuratedRows(
  store: SaveStore,
  config: GatingConfig = OPEN_GATING,
): Promise<CuratedRow[]> {
  const progress = await loadRecord(store, 'curatedProgress')
  return manifestRows(loadCuratedPack(), progress.solved, config)
}

/** Record a curated board as solved with its earned creature (008 namespace). */
export async function markCuratedSolved(
  store: SaveStore,
  id: string,
  earnedCreatureId: string,
): Promise<void> {
  const progress = await loadRecord(store, 'curatedProgress')
  await saveRecord(store, 'curatedProgress', {
    ...progress,
    solved: { ...progress.solved, [id]: { earnedCreatureId } },
  })
}
