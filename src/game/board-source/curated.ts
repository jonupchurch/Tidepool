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
  /** id of the CuratedGroup this board belongs to (manifest v2+). */
  group?: string
  order: number
}

/** A run of boards sharing a size/difficulty band — one cluster on the screen. */
export interface CuratedGroup {
  id: string
  name: string
  blurb: string
  order: number
}

export interface CuratedManifest {
  version: number
  groups?: CuratedGroup[]
  entries: CuratedEntry[]
}

export interface CuratedRow {
  entry: CuratedEntry
  request: BoardRequest
  solved: boolean
  /** Name of the creature earned on solve, or null if unsolved. */
  earnedCreature: string | null
  /**
   * Fewest mistakes across your runs of this board. `null` when the number is
   * unknown — either never solved, or solved by a build from before mistakes
   * were tracked. Those two are both "no record", and neither is evidence of a
   * clean run; only an explicit `0` is (011 FR-008).
   */
  errors: number | null
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

type SolvedMap = Record<string, { earnedCreatureId: string; errors?: number }>

/** The shipped manifest, groups and entries sorted by `order`. */
export function loadCuratedPack(): CuratedManifest {
  const raw = curatedJson as CuratedManifest
  return {
    version: raw.version,
    groups: raw.groups ? [...raw.groups].sort((a, b) => a.order - b.order) : undefined,
    entries: [...raw.entries].sort((a, b) => a.order - b.order),
  }
}

/** A group with its rows, in play order — what the Curated screen renders. */
export interface CuratedGroupRows {
  group: CuratedGroup
  rows: CuratedRow[]
}

/**
 * Bucket `rows` into their manifest groups, in group order. Rows whose group is
 * missing (or a v1 manifest with no groups at all) fall into one unnamed run, so
 * an older pack still renders.
 */
export function groupRows(manifest: CuratedManifest, rows: CuratedRow[]): CuratedGroupRows[] {
  const groups = manifest.groups ?? []
  if (groups.length === 0) {
    return [{ group: { id: 'all', name: 'Curated shores', blurb: '', order: 1 }, rows }]
  }
  const byId = new Map(groups.map((g) => [g.id, [] as CuratedRow[]]))
  const orphans: CuratedRow[] = []
  for (const row of rows) {
    const bucket = row.entry.group ? byId.get(row.entry.group) : undefined
    if (bucket) bucket.push(row)
    else orphans.push(row)
  }
  const out = groups
    .map((group) => ({ group, rows: byId.get(group.id) ?? [] }))
    .filter((g) => g.rows.length > 0)
  if (orphans.length > 0) {
    out.push({ group: { id: 'other', name: 'More shores', blurb: '', order: 999 }, rows: orphans })
  }
  return out
}

/**
 * The entry after `id` in play order, or null at the end of the coastline.
 * Drives "Next board" while playing the curated ladder, so chaining stays on
 * the ladder (and each completion records against its own entry) instead of
 * drifting into the Endless stream.
 */
export function nextCuratedEntry(manifest: CuratedManifest, id: string): CuratedEntry | null {
  const entries = [...manifest.entries].sort((a, b) => a.order - b.order)
  const i = entries.findIndex((e) => e.id === id)
  if (i < 0 || i + 1 >= entries.length) return null
  return entries[i + 1]
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
    // `?? null`, not `?? 0`: an entry recorded before mistakes were tracked has
    // no `errors`, and reporting that as zero would award it a clean run it was
    // never checked for.
    errors: solved[entry.id]?.errors ?? null,
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

/**
 * Record a curated board as solved with its earned creature (008 namespace).
 *
 * `errors` keeps your BEST run: replaying a board you fumbled and finishing it
 * clean clears its mistakes for good, and a sloppier replay never adds them
 * back. Only curated boards keep a mistake record at all — Endless boards show
 * the live counter while you play and store nothing.
 */
export async function markCuratedSolved(
  store: SaveStore,
  id: string,
  earnedCreatureId: string,
  errors = 0,
): Promise<void> {
  const progress = await loadRecord(store, 'curatedProgress')
  const prev = progress.solved[id]
  const best = prev?.errors === undefined ? errors : Math.min(prev.errors, errors)
  await saveRecord(store, 'curatedProgress', {
    ...progress,
    solved: { ...progress.solved, [id]: { earnedCreatureId, errors: best } },
  })
}
