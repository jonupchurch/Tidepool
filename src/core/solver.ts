// solver.ts — the fixpoint technique solver (proves a board is guess-free and,
// by completing, unique) plus an independent bounded backtracking counter (the
// uniqueness oracle). `solve` is the public solver / rater / CI oracle.
import type { Board, SolverResult, Technique } from './board'
import { rateDifficulty } from './difficulty'
import {
  type Assign,
  type Constraint,
  type SolveCtx,
  connectivityPass,
  forcedCountPass,
  setup,
  subsetPass,
} from './techniques'

const TECHNIQUE_ORDER: Technique[] = [
  'forced-count',
  'line-total',
  'connectivity',
  'subset-overlap',
]

/** The full technique catalog (forced-count / line-total are always allowed). */
export const ALL_TECHNIQUES: ReadonlySet<Technique> = new Set(TECHNIQUE_ORDER)

function orderTechniques(used: Set<Technique>): Technique[] {
  return TECHNIQUE_ORDER.filter((t) => used.has(t))
}

/**
 * Run the technique catalog to fixpoint, escalating only when simpler
 * techniques stall — so `techniquesUsed` reflects the minimal techniques the
 * board actually required (which the rating depends on). `allowed` gates which
 * techniques may fire (forced-count / line-total are always available); used by
 * reduction to cap a board's difficulty at a requested tier.
 */
function runTechniques(
  constraints: Constraint[],
  assign: Assign,
  allowed: ReadonlySet<Technique> = ALL_TECHNIQUES,
): { ctx: SolveCtx; depth: number } {
  const ctx: SolveCtx = { contradiction: false, used: new Set() }
  const allowLine = allowed.has('line-total')
  let depth = 0
  for (;;) {
    if (ctx.contradiction) break
    if (forcedCountPass(constraints, assign, ctx, allowLine)) {
      depth++
      continue
    }
    if (ctx.contradiction) break
    if (allowed.has('connectivity') && connectivityPass(constraints, assign, ctx)) {
      depth++
      continue
    }
    if (ctx.contradiction) break
    if (allowed.has('subset-overlap') && subsetPass(constraints, assign, ctx, allowLine)) {
      depth++
      continue
    }
    break
  }
  return { ctx, depth }
}

function allAssigned(assign: Assign): boolean {
  for (const v of assign.values()) if (v === 'unknown') return false
  return true
}

/** Default step budget for the uniqueness counter (bounded backtracking). */
export const DEFAULT_COUNT_BUDGET = 200_000

export interface CountResult {
  /** number of satisfying assignments found, capped at `limit` */
  count: number
  /** true if the step budget was hit before the search completed */
  exhausted: boolean
}

/**
 * Full propagation for the counter — forced-count, connectivity, and subset to
 * fixpoint. All three are sound (they only make forced deductions), so using
 * the whole catalog prunes far harder than forced-count alone; without this a
 * connectivity-dependent board can't propagate and blows the step budget.
 */
function propagate(constraints: Constraint[], assign: Assign): boolean {
  const ctx: SolveCtx = { contradiction: false, used: new Set() }
  for (;;) {
    if (forcedCountPass(constraints, assign, ctx, true)) {
      if (ctx.contradiction) return false
      continue
    }
    if (ctx.contradiction) return false
    if (connectivityPass(constraints, assign, ctx)) {
      if (ctx.contradiction) return false
      continue
    }
    if (ctx.contradiction) return false
    if (subsetPass(constraints, assign, ctx, true)) {
      if (ctx.contradiction) return false
      continue
    }
    if (ctx.contradiction) return false
    return true
  }
}

/** Choose the unknown cell in the most-constrained (fewest-unknown) constraint. */
function chooseVar(constraints: Constraint[], assign: Assign): string | null {
  let best: string | null = null
  let bestUnknowns = Infinity
  for (const c of constraints) {
    let unknownCount = 0
    let firstUnknown: string | null = null
    for (const k of c.cells) {
      if (assign.get(k) === 'unknown') {
        unknownCount++
        if (firstUnknown === null) firstUnknown = k
      }
    }
    if (firstUnknown !== null && unknownCount < bestUnknowns) {
      bestUnknowns = unknownCount
      best = firstUnknown
      if (unknownCount === 1) break
    }
  }
  return best
}

/** Any still-unknown cell (used to detect free/unconstrained cells). */
function anyUnknown(assign: Assign): string | null {
  for (const [k, v] of assign) if (v === 'unknown') return k
  return null
}

/**
 * Count satisfying assignments up to `limit`, using propagation + backtracking.
 * A cell in no constraint is free → makes the board ambiguous (returns ≥ limit).
 */
export function countSolutions(
  board: Board,
  limit = 2,
  budget = DEFAULT_COUNT_BUDGET,
): CountResult {
  const { assign, constraints } = setup(board)
  let steps = 0
  let exhausted = false

  function search(a: Assign): number {
    if (exhausted) return 0
    if (++steps > budget) {
      exhausted = true
      return 0
    }
    if (!propagate(constraints, a)) return 0
    const v = chooseVar(constraints, a)
    if (v === null) {
      // No constrained unknown left. Free unknowns ⇒ ambiguous.
      return anyUnknown(a) === null ? 1 : limit
    }
    let count = 0
    for (const val of ['water', 'rock'] as const) {
      const a2 = new Map(a)
      a2.set(v, val)
      count += search(a2)
      if (count >= limit || exhausted) break
    }
    return count
  }

  const count = search(assign)
  return { count, exhausted }
}

/**
 * The solver / difficulty rater / CI oracle. Runs the technique catalog to
 * decide guess-free solvability and derive a rating, and the independent
 * counter to confirm uniqueness.
 */
export function solve(board: Board): SolverResult {
  const { assign, constraints } = setup(board)
  const { ctx, depth } = runTechniques(constraints, assign)
  const solved = !ctx.contradiction && allAssigned(assign)

  const { count, exhausted } = countSolutions(board)
  const unique = !exhausted && count === 1

  const techniquesUsed = orderTechniques(ctx.used)
  return {
    solved,
    unique,
    techniquesUsed,
    maxDepth: depth,
    rating: rateDifficulty(techniquesUsed, depth),
    ...(ctx.contradiction ? { contradiction: true } : {}),
  }
}

/**
 * Guess-free technique solvability only (cheaper — no uniqueness counter).
 * `allowed` optionally restricts the catalog (reduction uses this to cap tier).
 */
export function techniqueSolves(
  board: Board,
  allowed: ReadonlySet<Technique> = ALL_TECHNIQUES,
): {
  solved: boolean
  techniquesUsed: Technique[]
  maxDepth: number
} {
  const { assign, constraints } = setup(board)
  const { ctx, depth } = runTechniques(constraints, assign, allowed)
  return {
    solved: !ctx.contradiction && allAssigned(assign),
    techniquesUsed: orderTechniques(ctx.used),
    maxDepth: depth,
  }
}
