// seed-entry.ts — parse/validate a human seed token into a BoardRequest. Total:
// never throws to the user — returns a gentle reason on invalid input. Reuses
// core parseSeed/formatSeed. Pure.
import type { DifficultyTier, SizeTier } from '@/core'
import type { BoardRequest } from './request'

// stub — implemented in US3 (T026)
export type SeedEntryResult = { ok: true; request: BoardRequest } | { ok: false; reason: string }

export function parseSeedEntry(
  _input: string,
  _currentPrefs: { size: SizeTier; difficulty: DifficultyTier },
): SeedEntryResult {
  return { ok: false, reason: 'not implemented' }
}
