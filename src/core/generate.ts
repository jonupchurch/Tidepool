// generate.ts — the deterministic pipeline: seed → layout → clues → verify →
// reduce → rate, advancing through seed-derived candidates until one matches
// the requested difficulty (else returning the closest, honestly rated). The
// served board is minimal, uniquely solvable, and guess-free (spec US1/US2/US5).
import type { Board, BoardParams, Cell, DifficultyTier, LineClue } from './board'
import { isDifficultyTier, isSizeTier, makeBoard } from './board'
import { isShapeId } from './shapes'
import {
  type Layout,
  adjacencyClue,
  lineAdjacency,
  lineConnectivityInforms,
  lineConnectivityOf,
  lineTotal,
} from './clues'
import { allowedTechniquesFor } from './difficulty'
import { AXIS_STEP, key, linesOf, parseKey, presentSet } from './hex'
import { DEFAULT_SHAPE, shapeRegion, shapeSupportsSize } from './shapes'
import { reduceClues } from './reduce'
import { type Rng, nextInt, seedToRng } from './rng'
import { countSolutions, solve, techniqueSolves } from './solver'

const MAX_CANDIDATES = 120
/** Probability (per-mille) a candidate cell is water. */
const WATER_PER_MILLE = 500
/** Reject near-degenerate layouts outside this water-fraction window. */
const MIN_WATER_FRACTION = 0.25
const MAX_WATER_FRACTION = 0.75

/**
 * The reproducible key a board's RNG is derived from.
 *
 * DANGER: every segment here is load-bearing forever. Adding a field to the
 * existing `c…l…` segment would change the stream for EVERY board in existence
 * — every shipped curated board, every seed a player wrote down, and every
 * in-progress save (which resumes by regenerating from its stored params).
 *
 * So new mechanics append their own segment, and only when switched on:
 *
 *   off (today, forever):  COVE-0001|Medium|Calm|c1l1|#3
 *   row annotations on:    KELP-0007|Large|Deep|c1l1|lc1|#3
 *   even/odd on:           KELP-0007|Large|Deep|c1l1|eo1|#3
 *   both, plus a shore:    KELP-0007|Large|Deep|c1l1|lc1|eo1|s:atoll|#3
 *
 * `fingerprints.test.ts` is the guard. If it fails, this is the first place to
 * look, and the fix is almost never to update the table.
 */
export function rngSeedString(p: BoardParams, candidate: number): string {
  const c = `c${p.clues.connectivity ? 1 : 0}l${p.clues.lineTotals ? 1 : 0}`
  // Optional segments append in a FIXED order — clue toggles, then shape. Two
  // features each adding "their own segment" is only safe if that order is
  // decided once and pinned, or a board with both differs depending on which
  // code path composed the string.
  //
  // Exported solely so `generate.test.ts` can assert that order directly. It is
  // not part of the engine's public API and is not re-exported from `core/index`.
  const lc = p.clues.lineConnectivity ? '|lc1' : ''
  const eo = p.clues.evenOdd ? '|eo1' : ''
  const shape = p.shape && p.shape !== DEFAULT_SHAPE ? `|s:${p.shape}` : ''
  return `${p.seed}|${p.size}|${p.difficulty}|${c}${lc}${eo}${shape}|#${candidate}`
}

function randomLayout(present: Set<string>, rng: Rng): Layout {
  const layout: Layout = new Map()
  for (const k of present) {
    layout.set(k, nextInt(rng, 1000) < WATER_PER_MILLE ? 'water' : 'rock')
  }
  return layout
}

function waterFraction(layout: Layout): number {
  let water = 0
  for (const v of layout.values()) if (v === 'water') water++
  return water / layout.size
}

/** Fully-clued board: every rock revealed with its adjacency clue, all lines shown. */
function buildFullyCluedBoard(
  present: Set<string>,
  layout: Layout,
  params: BoardParams,
): Board {
  const cells = new Map<string, Cell>()
  for (const k of present) {
    const coord = parseKey(k)
    const state = layout.get(k)!
    if (state === 'rock') {
      cells.set(k, {
        coord,
        state,
        given: true,
        clue: adjacencyClue(coord, layout, present, params.clues.connectivity),
      })
    } else {
      cells.set(k, { coord, state, given: false })
    }
  }
  let lines: LineClue[] = []
  if (params.clues.lineTotals) {
    lines = linesOf(present).map((ln) => {
      const total = lineTotal(ln.cells, layout)
      const base = { axis: ln.axis, index: ln.index, total, from: 'start' as const }
      if (!params.clues.lineConnectivity) return base
      // Annotate only where it says something: a row whose water can only be
      // arranged one way learns nothing from `{}`/`--` (FR-004).
      const adjacent = lineAdjacency(ln.cells, AXIS_STEP[ln.axis])
      if (!lineConnectivityInforms(ln.cells.length, total, adjacent)) return base
      const water = ln.cells.map((k) => layout.get(k) === 'water')
      return { ...base, connectivity: lineConnectivityOf(water, adjacent) }
    })
  }
  return makeBoard({ params, present, cells, lines })
}

const TIER_INDEX: Record<DifficultyTier, number> = { Calm: 0, Tricky: 1, Deep: 2 }

function validateParams(params: BoardParams): void {
  if (!params || typeof params !== 'object') throw new Error('generateBoard: params required')
  if (!isSizeTier(params.size)) throw new Error(`generateBoard: unknown size "${params.size}"`)
  if (!isDifficultyTier(params.difficulty))
    throw new Error(`generateBoard: unknown difficulty "${params.difficulty}"`)
  if (!params.clues || typeof params.clues !== 'object')
    throw new Error('generateBoard: clue toggles required')
  if (typeof params.seed !== 'string' || params.seed.length === 0)
    throw new Error('generateBoard: seed required')
  if (params.shape !== undefined) {
    if (!isShapeId(params.shape)) throw new Error(`generateBoard: unknown shape "${params.shape}"`)
    if (!shapeSupportsSize(params.shape, params.size)) {
      throw new Error(`generateBoard: shape "${params.shape}" does not support ${params.size}`)
    }
  }
}

/**
 * Deterministic. Returns a minimal, verified board — solved && unique &&
 * guess-free — rated at `params.difficulty` when achievable, else the closest
 * honestly-rated board. Identical params → identical board on any machine.
 */
export function generateBoard(params: BoardParams): Board {
  validateParams(params)

  const present = presentSet(shapeRegion(params.size, params.shape ?? DEFAULT_SHAPE))
  const allowed = allowedTechniquesFor(params.difficulty)

  let best: Board | null = null
  let bestDistance = Infinity

  for (let cand = 0; cand < MAX_CANDIDATES; cand++) {
    const rng = seedToRng(rngSeedString(params, cand))
    const layout = randomLayout(present, rng)

    const frac = waterFraction(layout)
    if (frac < MIN_WATER_FRACTION || frac > MAX_WATER_FRACTION) continue

    const full = buildFullyCluedBoard(present, layout, params)
    // The fully-clued board must be guess-free within the tier's techniques...
    if (!techniqueSolves(full, allowed).solved) continue
    // ...and admit exactly one solution (independent oracle).
    const uc = countSolutions(full)
    if (uc.exhausted || uc.count !== 1) continue

    const reduced = reduceClues(full, rng, allowed)
    const res = solve(reduced)
    if (!res.solved || !res.unique) continue // safety: never serve an unverified board

    if (res.rating === params.difficulty) return reduced

    const distance = Math.abs(TIER_INDEX[res.rating] - TIER_INDEX[params.difficulty])
    if (distance < bestDistance) {
      bestDistance = distance
      best = reduced
    }
  }

  if (best) return best
  throw new Error(`generateBoard: no solvable board found for ${JSON.stringify(params)}`)
}

export { key }
