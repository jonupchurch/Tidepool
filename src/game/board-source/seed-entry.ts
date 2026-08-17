// seed-entry.ts — parse/validate a human seed token into a BoardRequest. Total:
// never throws to the user — returns a gentle reason on invalid input. A bare
// `WORD-NNNN` uses the current prefs; extra tokens override size/difficulty/
// shore/hints so a shared token reproduces the exact board (SC-003). Reuses core
// parseSeed. Pure.
import type { DifficultyTier, SizeTier } from '@/core'
import { DIFFICULTY_TIERS, SIZE_TIERS, parseSeed } from '@/core'
import type { BoardRequest } from './request'
import { shapeField } from './endless'
import {
  DEFAULT_SHORE,
  type ShoreChoice,
  endlessClues,
  resolveShore,
  shoreName,
  shoresFor,
} from './shore'

export type SeedEntryResult = { ok: true; request: BoardRequest } | { ok: false; reason: string }

/** What a bare seed inherits — the Home picker's current state. */
export interface SeedEntryPrefs {
  size: SizeTier
  difficulty: DifficultyTier
  /** 016. Absent = the hexagon, so a caller that predates shores still compiles. */
  shore?: ShoreChoice
  edgeHints?: boolean
  /** 018. Absent = off, so a caller that predates parity clues still compiles. */
  evenOdd?: boolean
}

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const matchSize = (tok: string): SizeTier | null =>
  (SIZE_TIERS as readonly string[]).find((s) => eq(s, tok)) as SizeTier | undefined ?? null
const matchDifficulty = (tok: string): DifficultyTier | null =>
  (DIFFICULTY_TIERS as readonly string[]).find((d) => eq(d, tok)) as DifficultyTier | undefined ??
  null

/**
 * A shore token, by id (`atoll`) or by the name the board label prints
 * (`Crescent`), plus `Any`. Matched against every choice the catalog knows
 * rather than only the ones the *named* size supports, because tokens arrive in
 * any order — `Small wedge` has to parse before it can be rejected.
 */
function matchShore(tok: string): ShoreChoice | null {
  for (const choice of shoresFor('Large')) {
    if (eq(choice, tok) || eq(shoreName(choice), tok)) return choice
  }
  return null
}

/** `hints` / `nohints` — the second form exists so a token can turn OFF a pref
 *  that is currently on, which silence alone can't express. */
function matchHints(tok: string): boolean | null {
  if (eq(tok, 'hints')) return true
  if (eq(tok, 'nohints') || eq(tok, 'no-hints')) return false
  return null
}

/**
 * `evenodd` / `noevenodd` (018), mirroring `matchHints`.
 *
 * One word, necessarily: `parseSeedEntry` splits tokens on `/` among other
 * separators, so an `even/odd` token would arrive as two and could never round-
 * trip. `even-odd` is accepted as well, the way `no-hints` is.
 */
function matchEvenOdd(tok: string): boolean | null {
  if (eq(tok, 'evenodd') || eq(tok, 'even-odd')) return true
  if (eq(tok, 'noevenodd') || eq(tok, 'no-even-odd')) return false
  return null
}

/**
 * Parse a seed token (+ optional overrides) into a launchable request. Total —
 * invalid input yields `{ ok: false, reason }`, never a throw. Tokens are
 * separated by spaces, commas, slashes, or the `·` the board label uses (so the
 * label can be pasted straight back in); the first is the seed.
 *
 * The request carries `clues`/`shape` only when they differ from the default,
 * so a token that names neither produces exactly the board it always has.
 */
export function parseSeedEntry(input: string, currentPrefs: SeedEntryPrefs): SeedEntryResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, reason: 'Enter a seed to dive in — try CORAL-4417.' }

  const parts = trimmed.split(/[\s,/·]+/).filter(Boolean)
  const seed = parseSeed(parts[0])
  if (!seed) {
    return { ok: false, reason: `“${parts[0]}” isn’t a seed — they look like CORAL-4417.` }
  }

  let size = currentPrefs.size
  let difficulty = currentPrefs.difficulty
  let shore = currentPrefs.shore ?? DEFAULT_SHORE
  let edgeHints = currentPrefs.edgeHints ?? false
  let evenOdd = currentPrefs.evenOdd ?? false

  for (const tok of parts.slice(1)) {
    const s = matchSize(tok)
    if (s) {
      size = s
      continue
    }
    const d = matchDifficulty(tok)
    if (d) {
      difficulty = d
      continue
    }
    const sh = matchShore(tok)
    if (sh) {
      shore = sh
      continue
    }
    const h = matchHints(tok)
    if (h !== null) {
      edgeHints = h
      continue
    }
    const eo = matchEvenOdd(tok)
    if (eo !== null) evenOdd = eo
    // Unknown trailing tokens are ignored — the seed still loads its board.
  }

  // Resolved LAST, once every token has been read: a shore is only valid
  // against the final size, and `Any` derives from the seed.
  const clues = endlessClues(difficulty, edgeHints, evenOdd)
  return {
    ok: true,
    request: {
      seed,
      size,
      difficulty,
      // Only what differs from the default is stated, so a token naming neither
      // produces the exact board it always has.
      ...(clues.lineConnectivity || clues.evenOdd ? { clues } : {}),
      ...shapeField(resolveShore(shore, seed, size)),
    },
  }
}
