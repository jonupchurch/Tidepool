// request.ts — the single funnel every mode produces: a BoardRequest that maps
// to the engine's BoardParams. Human labels (Small/Medium/Large, Calm/Tricky/
// Deep) are the engine tiers verbatim; this module validates + attaches clues.
// Pure — no DOM, no randomness (determinism lives in the engine, Principle XI).
import type { BoardParams, ClueToggles, DifficultyTier, SizeTier } from '@/core'

// stub — implemented in Phase 2 (T004/T006)
export interface BoardRequest {
  seed: string
  size: SizeTier
  difficulty: DifficultyTier
}

export const DEFAULT_CLUES: ClueToggles = { connectivity: true, lineTotals: true }

export function toBoardParams(_request: BoardRequest): BoardParams {
  throw new Error('not implemented')
}

export function launchBoard(request: BoardRequest): BoardRequest {
  return request
}
