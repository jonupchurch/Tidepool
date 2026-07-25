// curated.ts — load the bundled manifest of blessed seeds, merge persisted
// progress, and derive per-entry BoardRequests + lock state. The manifest is
// oracle-validated in CI so no unsolvable board can ship. Pure (progress I/O
// goes through the SaveStore seam passed in).
import type { DifficultyTier, SizeTier } from '@/core'
import type { SaveStore } from '@/platform'
import type { BoardRequest } from './request'

// stub — implemented in US2 (T015-T019) + US4 (T031)
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
  earnedCreature: string | null
  locked: boolean
}

export interface GatingConfig {
  enabled: boolean
  /** How many prior entries (by order) must be solved to unlock the next. */
  unlockAfter?: number
}

export function loadCuratedPack(): CuratedManifest {
  return { version: 1, entries: [] }
}

export function resolveLocks(
  _entries: CuratedEntry[],
  _solvedIds: ReadonlySet<string>,
  _config: GatingConfig,
): Map<string, boolean> {
  return new Map()
}

export async function getCuratedRows(
  _store: SaveStore,
  _config?: GatingConfig,
): Promise<CuratedRow[]> {
  return []
}

export async function markCuratedSolved(
  _store: SaveStore,
  _id: string,
  _creature: string,
): Promise<void> {}
