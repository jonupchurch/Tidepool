// board-request.ts — how the shell turns a Play/seed choice into a BoardParams.
// Board-*source* behavior (curated sets, endless progression) belongs to feature
// 004; the shell only assembles a request. UI layer — Math.random is fine here
// (the engine stays deterministic per seed).
import type { BoardParams, ClueToggles, DifficultyTier, SizeTier } from '@/core'
import {
  DEFAULT_SHORE,
  type ShoreChoice,
  endlessClues,
  resolveShore,
  shapeField,
} from '@/game/board-source'

/** Default clue set for shell-launched boards (both signature clue types on). */
export const DEFAULT_CLUES: ClueToggles = { connectivity: true, lineTotals: true }

/** A fresh, readable seed for a new board, e.g. `TIDE-1Q9F`. */
export function freshSeed(): string {
  const n = Math.floor(Math.random() * 36 ** 4)
  return `TIDE-${n.toString(36).toUpperCase().padStart(4, '0')}`
}

/** The Endless variety choices a launch carries (016). Both optional, and both
 *  defaulting to the pre-016 board: hexagon, plain totals. */
export interface ShoreOpts {
  shore?: ShoreChoice
  edgeHints?: boolean
}

/**
 * Assemble a board request from a seed + size/difficulty, plus the Endless
 * variety choices. Omitting `opts` yields byte-identically the board this seed
 * has always produced — neither default reaches the RNG seed string.
 */
export function boardRequest(
  seed: string,
  size: SizeTier,
  difficulty: DifficultyTier,
  opts: ShoreOpts = {},
): BoardParams {
  const { shore = DEFAULT_SHORE, edgeHints = false } = opts
  return {
    seed,
    size,
    difficulty,
    clues: endlessClues(difficulty, edgeHints),
    ...shapeField(resolveShore(shore, seed, size)),
  }
}
