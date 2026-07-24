// generate.ts — the deterministic pipeline: seed → layout → clues → verify →
// reduce → rate, advancing through seed-derived candidates until one matches
// the requested difficulty (else returning the closest, honestly rated). The
// served board is minimal, uniquely solvable, and guess-free (spec US1/US2/US5).
import type { Board, BoardParams, Cell, DifficultyTier, LineClue, SizeTier } from './board'
import { isDifficultyTier, isSizeTier, makeBoard } from './board'
import { type Layout, adjacencyClue, lineTotal } from './clues'
import { allowedTechniquesFor } from './difficulty'
import { hexRegion, key, linesOf, parseKey, presentSet } from './hex'
import { reduceClues } from './reduce'
import { type Rng, nextInt, seedToRng } from './rng'
import { countSolutions, solve, techniqueSolves } from './solver'

const SIZE_RADIUS: Record<SizeTier, number> = { Small: 3, Medium: 5, Large: 7 }
const MAX_CANDIDATES = 120
/** Probability (per-mille) a candidate cell is water. */
const WATER_PER_MILLE = 500
/** Reject near-degenerate layouts outside this water-fraction window. */
const MIN_WATER_FRACTION = 0.25
const MAX_WATER_FRACTION = 0.75

function rngSeedString(p: BoardParams, candidate: number): string {
  const c = `c${p.clues.connectivity ? 1 : 0}l${p.clues.lineTotals ? 1 : 0}`
  return `${p.seed}|${p.size}|${p.difficulty}|${c}|#${candidate}`
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
    lines = linesOf(present).map((ln) => ({
      axis: ln.axis,
      index: ln.index,
      total: lineTotal(ln.cells, layout),
      from: 'start' as const,
    }))
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
}

/**
 * Deterministic. Returns a minimal, verified board — solved && unique &&
 * guess-free — rated at `params.difficulty` when achievable, else the closest
 * honestly-rated board. Identical params → identical board on any machine.
 */
export function generateBoard(params: BoardParams): Board {
  validateParams(params)

  const radius = SIZE_RADIUS[params.size]
  const present = presentSet(hexRegion(radius))
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
