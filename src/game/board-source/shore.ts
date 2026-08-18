// shore.ts — how a *generated* board picks its silhouette and whether its row
// totals carry `{n}` / `-n-` (016). The engine has accepted both since 012/010;
// until now only the curated manifest ever asked for them, so every Endless
// board was a filled hexagon with plain totals.
//
// Two rules shape everything here, and both are conservative on purpose:
//
//  1. **The defaults are today's board.** `hex` + hints off must produce a
//     byte-identical board to the one that seed has always produced, because a
//     seed is a promise (Principle XI) and this game is live. Both inputs reach
//     the RNG seed string only when they are something other than the default —
//     see `rngSeedString` — so the defaults never touch the stream.
//  2. **Degrade, never throw.** `generateBoard` refuses a shape/size pair the
//     catalog doesn't claim. A persisted `wedge` plus a switch to Small is an
//     ordinary thing for a player to do, so it resolves to the hexagon rather
//     than failing to serve a board.
//
// Pure and deterministic — the derivation is engine RNG over the seed, so
// `Any` is reproducible from the seed alone (SC-003) rather than being a roll.
import type { ClueToggles, DifficultyTier, ShapeId, SizeTier } from '@/core'
import {
  DEFAULT_SHAPE,
  SHAPE_IDS,
  nextInt,
  seedToRng,
  shapeName,
  shapeSupportsSize,
} from '@/core'
import { DEFAULT_CLUES } from './request'

/** "Let the seed choose" — the only non-literal choice the picker offers. */
export const ANY_SHORE = 'Any'

/** What the Home picker holds: a specific silhouette, or `Any`. */
export type ShoreChoice = typeof ANY_SHORE | ShapeId

/** The default — the filled hexagon every Endless board has been until now. */
export const DEFAULT_SHORE: ShoreChoice = DEFAULT_SHAPE

export function isShoreChoice(x: unknown): x is ShoreChoice {
  return x === ANY_SHORE || (typeof x === 'string' && (SHAPE_IDS as readonly string[]).includes(x))
}

/** Player-facing name for a choice — the catalog's own names, plus `Any`. */
export function shoreName(choice: ShoreChoice): string {
  return choice === ANY_SHORE ? ANY_SHORE : shapeName(choice)
}

/**
 * The choices worth offering at `size`, hexagon first.
 *
 * Small comes back as `['hex']` alone: no silhouette in the catalog claims
 * radius 3, and offering a choice that silently resolves to the hexagon would
 * read as a bug. `Any` is offered only where there is genuinely something to
 * choose between.
 */
export function shoresFor(size: SizeTier): readonly ShoreChoice[] {
  const supported = SHAPE_IDS.filter((s) => s !== DEFAULT_SHAPE && shapeSupportsSize(s, size))
  if (supported.length === 0) return [DEFAULT_SHAPE]
  return [DEFAULT_SHAPE, ANY_SHORE, ...supported]
}

/**
 * The silhouette a board actually gets. `Any` derives one from the seed, so the
 * same seed always lands on the same shore and a shared token still reproduces
 * the exact board.
 *
 * The derivation runs on its own RNG string (`shore|…`) rather than the board's
 * seed string, so it cannot perturb — or be perturbed by — the generator's own
 * stream. The pool includes the hexagon: `Any` that never serves the familiar
 * board would read as a different game rather than a varied one.
 */
export function resolveShore(choice: ShoreChoice, seed: string, size: SizeTier): ShapeId {
  const offered = shoresFor(size)
  if (choice !== ANY_SHORE) {
    // Includes the size check: a persisted shore the current size can't carry
    // degrades here rather than throwing out of `generateBoard`.
    return offered.includes(choice) ? choice : DEFAULT_SHAPE
  }
  const pool = offered.filter((c): c is ShapeId => c !== ANY_SHORE)
  if (pool.length <= 1) return DEFAULT_SHAPE
  return pool[nextInt(seedToRng(`shore|${seed}|${size}`), pool.length)]
}

/**
 * Whether the edge-hints toggle does anything at `difficulty`.
 *
 * Measured, not assumed: reduction offers every annotation for removal and
 * drops the ones the tier's technique set can't use, and `line-connectivity`
 * is Deep-only (`allowedTechniquesFor`). Across 5 seeds × 3 sizes, Tricky
 * produced 222 line clues with zero annotations and Calm produced no line
 * clues at all. Only Deep keeps them — which is also the only tier the curated
 * pack ever ships them on.
 */
export function edgeHintsApply(difficulty: DifficultyTier): boolean {
  return difficulty === 'Deep'
}

/**
 * The clue set an Endless board is generated with.
 *
 * Gated on `edgeHintsApply` rather than trusting the flag, because the toggle
 * feeds the RNG seed string: leaving a stale `true` in settings would otherwise
 * change which board a Calm seed produces in exchange for annotations that
 * reduction then strips anyway.
 */
/**
 * Whether the even/odd toggle does anything at `difficulty` (018).
 *
 * Deep-only, for the same reason `edgeHintsApply` is: the `parity` technique is
 * in `allowedTechniquesFor('Deep')` and nowhere else, and reduction will only
 * weaken a clue to `●●`/`●` when the tier's technique set can read it back.
 *
 * Measured before shipping: with the flag forced on at Calm and Tricky across 5
 * seeds, boards came back with zero parity clues — but the flag still reached
 * the RNG seed string and so still changed which board those seeds produced.
 * That is precisely what this gate prevents.
 */
export function evenOddApply(difficulty: DifficultyTier): boolean {
  return difficulty === 'Deep'
}

export function endlessClues(
  difficulty: DifficultyTier,
  edgeHints: boolean,
  evenOdd = false,
): ClueToggles {
  const wantHints = edgeHints && edgeHintsApply(difficulty)
  const wantEvenOdd = evenOdd && evenOddApply(difficulty)
  if (!wantHints && !wantEvenOdd) return DEFAULT_CLUES
  return {
    ...DEFAULT_CLUES,
    ...(wantHints ? { lineConnectivity: true } : {}),
    ...(wantEvenOdd ? { evenOdd: true } : {}),
  }
}
