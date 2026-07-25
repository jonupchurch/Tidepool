// seed-entry.ts — parse/validate a human seed token into a BoardRequest. Total:
// never throws to the user — returns a gentle reason on invalid input. A bare
// `WORD-NNNN` uses the current prefs; extra tokens override size/difficulty so a
// shared token reproduces the exact board (SC-003). Reuses core parseSeed. Pure.
import type { DifficultyTier, SizeTier } from '@/core'
import { DIFFICULTY_TIERS, SIZE_TIERS, parseSeed } from '@/core'
import type { BoardRequest } from './request'

export type SeedEntryResult = { ok: true; request: BoardRequest } | { ok: false; reason: string }

const matchSize = (tok: string): SizeTier | null =>
  (SIZE_TIERS as readonly string[]).find((s) => s.toLowerCase() === tok.toLowerCase()) as
    | SizeTier
    | undefined ?? null
const matchDifficulty = (tok: string): DifficultyTier | null =>
  (DIFFICULTY_TIERS as readonly string[]).find((d) => d.toLowerCase() === tok.toLowerCase()) as
    | DifficultyTier
    | undefined ?? null

/**
 * Parse a seed token (+ optional size/difficulty) into a launchable request.
 * Total — invalid input yields `{ ok: false, reason }`, never a throw. Tokens
 * are separated by spaces, commas, or slashes; the first is the seed.
 */
export function parseSeedEntry(
  input: string,
  currentPrefs: { size: SizeTier; difficulty: DifficultyTier },
): SeedEntryResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, reason: 'Enter a seed to dive in — try CORAL-4417.' }

  const parts = trimmed.split(/[\s,/]+/).filter(Boolean)
  const seed = parseSeed(parts[0])
  if (!seed) {
    return { ok: false, reason: `“${parts[0]}” isn’t a seed — they look like CORAL-4417.` }
  }

  let size = currentPrefs.size
  let difficulty = currentPrefs.difficulty
  for (const tok of parts.slice(1)) {
    const s = matchSize(tok)
    if (s) {
      size = s
      continue
    }
    const d = matchDifficulty(tok)
    if (d) difficulty = d
    // Unknown trailing tokens are ignored — the seed still loads its board.
  }

  return { ok: true, request: { seed, size, difficulty } }
}
