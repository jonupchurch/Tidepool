// board-request.ts — how the shell turns a Play/seed choice into a BoardParams.
// Board-*source* behavior (curated sets, endless progression) belongs to feature
// 004; the shell only assembles a request. UI layer — Math.random is fine here
// (the engine stays deterministic per seed).
import type { BoardParams, ClueToggles, DifficultyTier, SizeTier } from '@/core'

/** Default clue set for shell-launched boards (both signature clue types on). */
export const DEFAULT_CLUES: ClueToggles = { connectivity: true, lineTotals: true }

/** A fresh, readable seed for a new board, e.g. `TIDE-1Q9F`. */
export function freshSeed(): string {
  const n = Math.floor(Math.random() * 36 ** 4)
  return `TIDE-${n.toString(36).toUpperCase().padStart(4, '0')}`
}

/** Assemble a board request from a seed + size/difficulty. */
export function boardRequest(seed: string, size: SizeTier, difficulty: DifficultyTier): BoardParams {
  return { seed, size, difficulty, clues: DEFAULT_CLUES }
}
