// techniques.ts — the human-technique catalog as constraint operations over a
// partial water/rock assignment. Each pass returns whether it deduced anything
// and records which techniques fired. A "constraint" is a set of present cells
// with an exact water count (from an adjacency clue or a line total), optionally
// carrying local connectivity for the ring it came from.
import type { Board, Connectivity, Technique } from './board'
import { isParityClue } from './board'
import type { Line } from './hex'
import { AXIS_STEP, DIRECTIONS, key, linesOf } from './hex'
import { circularRuns, lineAdjacency } from './clues'

export type CellVal = 'water' | 'rock' | 'unknown'
export type Assign = Map<string, CellVal>

/** What every constraint shares: the cells it governs, and where it came from. */
interface ConstraintBase {
  /** present cell keys governed by this constraint */
  cells: string[]
  source: 'adjacency' | 'line'
}

/** A constraint naming the exact water count among its cells. */
export interface ExactConstraint extends ConstraintBase {
  kind: 'exact'
  /** exact number of water among `cells` */
  water: number
  /** for connectivity: the origin's 6 ring slots (cell key or null if absent) */
  ring?: (string | null)[]
  connectivity?: Connectivity
  /**
   * For an annotated LINE only: whether `cells[i+1]` physically adjoins
   * `cells[i]`. Length is `cells.length - 1`. A `false` is a hole in the row,
   * which ends a run just as a stone does (010 FR-003).
   */
  adjacent?: boolean[]
}

/**
 * A constraint naming only the parity of the water among its cells (018).
 *
 * A discriminated union rather than an optional `water`, deliberately: reading
 * `water` off a parity constraint is now a compile error, where an optional
 * field would have yielded `undefined`, made `c.water - known` evaluate to
 * `NaN`, and let every comparison in `applyForcedCount` quietly return false.
 * That failure mode looks exactly like "the pass correctly declined to act".
 */
export interface ParityConstraint extends ConstraintBase {
  kind: 'parity'
  /** water among `cells` is congruent to this, mod 2 */
  parity: 0 | 1
}

export type Constraint = ExactConstraint | ParityConstraint

/** Accumulates progress across a solving run. */
export interface SolveCtx {
  contradiction: boolean
  used: Set<Technique>
}

/** Build the constraint set + initial assignment (given cells known rock). */
export function setup(board: Board): { assign: Assign; constraints: Constraint[] } {
  const assign: Assign = new Map()
  for (const k of board.present) assign.set(k, 'unknown')

  const constraints: Constraint[] = []
  for (const [k, cell] of board.cells) {
    if (cell.given) {
      assign.set(k, 'rock') // a given clue cell is a revealed rock
      if (cell.clue) {
        const clue = cell.clue
        const ring: (string | null)[] = DIRECTIONS.map((d) => {
          const nk = key({ q: cell.coord.q + d.q, r: cell.coord.r + d.r })
          return board.present.has(nk) ? nk : null
        })
        const cells = ring.filter((x): x is string => x !== null)
        if (isParityClue(clue)) {
          constraints.push({
            kind: 'parity',
            cells,
            parity: clue.parity === 'even' ? 0 : 1,
            source: 'adjacency',
          })
        } else {
          constraints.push({
            kind: 'exact',
            cells,
            water: clue.count,
            source: 'adjacency',
            ...(clue.connectivity ? { ring, connectivity: clue.connectivity } : {}),
          })
        }
      }
    }
  }

  if (board.lines.length > 0) {
    const byId = new Map<string, Line>()
    for (const ln of linesOf(board.present)) byId.set(`${ln.axis},${ln.index}`, ln)
    for (const lc of board.lines) {
      const ln = byId.get(`${lc.axis},${lc.index}`)
      if (!ln) continue
      constraints.push({
        kind: 'exact',
        cells: ln.cells,
        water: lc.total,
        source: 'line',
        ...(lc.connectivity
          ? {
              connectivity: lc.connectivity,
              adjacent: lineAdjacency(ln.cells, AXIS_STEP[lc.axis]),
            }
          : {}),
      })
    }
  }

  return { assign, constraints }
}

function tally(cells: string[], assign: Assign): { water: number; unknown: string[] } {
  let water = 0
  const unknown: string[] = []
  for (const k of cells) {
    const v = assign.get(k)
    if (v === 'water') water++
    else if (v === 'unknown') unknown.push(k)
  }
  return { water, unknown }
}

/** Forced-by-count on a single constraint. Returns whether it changed a cell. */
export function applyForcedCount(c: Constraint, assign: Assign, ctx: SolveCtx): boolean {
  if (c.kind !== 'exact') return false // a parity clue names no count to force from
  const { water, unknown } = tally(c.cells, assign)
  const remaining = c.water - water
  if (remaining < 0 || remaining > unknown.length) {
    ctx.contradiction = true
    return false
  }
  if (unknown.length === 0) return false
  if (remaining === 0) {
    for (const k of unknown) assign.set(k, 'rock')
    ctx.used.add(c.source === 'line' ? 'line-total' : 'forced-count')
    return true
  }
  if (remaining === unknown.length) {
    for (const k of unknown) assign.set(k, 'water')
    ctx.used.add(c.source === 'line' ? 'line-total' : 'forced-count')
    return true
  }
  return false
}

/**
 * One sweep of forced-count across all constraints. `allowLine` gates line
 * constraints (line totals read as a Tricky-level technique, so Calm excludes
 * them). Adjacency forced-counts are the always-available base.
 */
export function forcedCountPass(
  constraints: Constraint[],
  assign: Assign,
  ctx: SolveCtx,
  allowLine = true,
): boolean {
  let changed = false
  for (const c of constraints) {
    if (c.source === 'line' && !allowLine) continue
    if (applyForcedCount(c, assign, ctx)) changed = true
    if (ctx.contradiction) return changed
  }
  return changed
}

/**
 * Connectivity forcing: enumerate the ≤2^6 water/rock arrangements of a clue's
 * ring consistent with the known cells, the exact water count, AND the
 * `{}`/`--` property; force any slot that is the same in every valid one.
 */
export function applyConnectivity(c: Constraint, assign: Assign, ctx: SolveCtx): boolean {
  if (c.kind !== 'exact') return false // parity clues carry no {}/-- (018)
  if (!c.ring || !c.connectivity) return false
  const ring = c.ring
  // Fixed slots from current knowledge; collect unknown present slots.
  const base: (boolean | null)[] = ring.map((k) => {
    if (k === null) return false // absent slot never water
    const v = assign.get(k)
    if (v === 'water') return true
    if (v === 'rock') return false
    return null // unknown
  })
  const unknownIdx: number[] = []
  base.forEach((b, i) => {
    if (b === null) unknownIdx.push(i)
  })
  if (unknownIdx.length === 0) return false

  const wantSplit = c.connectivity === 'split'
  // For each unknown slot, track whether every valid arrangement made it water/rock.
  const alwaysWater = new Map<number, boolean>()
  const alwaysRock = new Map<number, boolean>()
  for (const i of unknownIdx) {
    alwaysWater.set(i, true)
    alwaysRock.set(i, true)
  }
  let anyValid = false

  const combos = 1 << unknownIdx.length
  for (let mask = 0; mask < combos; mask++) {
    const slots = base.map((b) => b === true)
    for (let b = 0; b < unknownIdx.length; b++) {
      if (mask & (1 << b)) slots[unknownIdx[b]] = true
    }
    const waterCount = slots.filter(Boolean).length
    if (waterCount !== c.water) continue
    const runs = circularRuns(slots)
    const isSplit = runs >= 2
    if (isSplit !== wantSplit) continue
    anyValid = true
    for (const i of unknownIdx) {
      if (slots[i]) alwaysRock.set(i, false)
      else alwaysWater.set(i, false)
    }
  }

  if (!anyValid) {
    ctx.contradiction = true
    return false
  }

  let changed = false
  for (const i of unknownIdx) {
    const k = ring[i]!
    if (alwaysWater.get(i)) {
      assign.set(k, 'water')
      changed = true
    } else if (alwaysRock.get(i)) {
      assign.set(k, 'rock')
      changed = true
    }
  }
  if (changed) ctx.used.add('connectivity')
  return changed
}

export function connectivityPass(
  constraints: Constraint[],
  assign: Assign,
  ctx: SolveCtx,
): boolean {
  let changed = false
  for (const c of constraints) {
    if (c.kind === 'exact' && c.connectivity && applyConnectivity(c, assign, ctx)) changed = true
    if (ctx.contradiction) return changed
  }
  return changed
}

/**
 * Row-connectivity forcing (010): given a row's total, its `{}`/`--`
 * annotation, and what is already known, force any cell that comes out the same
 * in every valid arrangement.
 *
 * The ring version enumerates 2^6 arrangements, which is fine for six slots. A
 * row can be 15 cells on a Large board, so this uses a forward/backward DP
 * instead — O(cells x water x 4) rather than 2^15.
 *
 * State is (index, water used, runs so far capped at 2, whether we are inside a
 * run). Capping runs at 2 is sound because the annotation only distinguishes
 * "exactly one run" from "more than one": once there are two, more make no
 * difference. `reach[i]` holds the states arrivable at position i; `viable[i]`
 * holds those from which a valid completion exists. A cell is forced when every
 * arrangement that is both reachable and viable agrees on it.
 */
export function applyLineConnectivity(
  c: Constraint,
  assign: Assign,
  ctx: SolveCtx,
): boolean {
  if (c.kind !== 'exact') return false // line constraints are always exact
  if (!c.connectivity || !c.adjacent || c.source !== 'line') return false
  const cells = c.cells
  const n = cells.length
  const adjacent = c.adjacent
  const wantRuns = c.connectivity === 'connected' ? 1 : 2

  const known: (boolean | null)[] = cells.map((k) => {
    const v = assign.get(k)
    return v === 'water' ? true : v === 'rock' ? false : null
  })
  // NB: a fully-known row is NOT an early return. It can still be *invalid* —
  // and saying so is what lets the uniqueness counter prune a branch that has
  // already violated the annotation. Skipping that check would let it count
  // assignments the annotation forbids, and report a board unique that isn't.
  const anyUnknown = known.some((v) => v === null)

  // `runs` saturates at 2, which MEANS "two or more". Three runs is still a
  // perfectly good `--` arrangement, so the cap must fold them together rather
  // than reject them — dropping them would shrink the space of valid
  // arrangements and force cells that aren't actually forced.
  const RUNS_MAX = 2
  const RUN_STATES = RUNS_MAX + 1 // 0, 1, "2 or more"
  const stateCount = (c.water + 1) * RUN_STATES * 2

  const encode = (water: number, runs: number, inRun: boolean): number =>
    (water * RUN_STATES + runs) * 2 + (inRun ? 1 : 0)
  const decode = (s: number): { water: number; runs: number; inRun: boolean } => {
    const inRun = (s & 1) === 1
    const rest = s >> 1
    const runs = rest % RUN_STATES
    return { water: (rest - runs) / RUN_STATES, runs, inRun }
  }

  /** Advance one cell. Returns the next state, or -1 if it can't be taken. */
  const step = (s: number, wet: boolean, i: number): number => {
    const { water, runs, inRun } = decode(s)
    if (!wet) return encode(water, runs, false)
    if (water + 1 > c.water) return -1
    // A water cell extends the current run only if it also touches its
    // predecessor; a hole in the row starts a new run just as a stone does.
    const continues = inRun && i > 0 && adjacent[i - 1]
    return encode(water + 1, continues ? runs : Math.min(runs + 1, RUNS_MAX), true)
  }

  /** The values cell `i` may take from state `s` (respecting what's known). */
  const options = (i: number): boolean[] =>
    known[i] === null ? [true, false] : [known[i] as boolean]

  // Forward: which states are arrivable at each position?
  const reach: Uint8Array[] = Array.from({ length: n + 1 }, () => new Uint8Array(stateCount))
  reach[0][encode(0, 0, false)] = 1
  for (let i = 0; i < n; i++) {
    for (let s = 0; s < stateCount; s++) {
      if (!reach[i][s]) continue
      for (const wet of options(i)) {
        const ns = step(s, wet, i)
        if (ns >= 0) reach[i + 1][ns] = 1
      }
    }
  }

  // Backward: from which states can a valid arrangement still be completed?
  const viable: Uint8Array[] = Array.from({ length: n + 1 }, () => new Uint8Array(stateCount))
  for (let s = 0; s < stateCount; s++) {
    const { water, runs } = decode(s)
    // `connected` is runs <= 1, not runs === 1 — matching `lineConnectivityOf`
    // and the ring's `circularRuns`. A row with no water at all is trivially
    // one arc. Informativeness keeps that off real boards, but the DP has to
    // agree with the definition, not with what generation happens to produce.
    if (water === c.water && (wantRuns === 1 ? runs <= 1 : runs >= 2)) viable[n][s] = 1
  }
  for (let i = n - 1; i >= 0; i--) {
    for (let s = 0; s < stateCount; s++) {
      if (!reach[i][s]) continue
      for (const wet of options(i)) {
        const ns = step(s, wet, i)
        if (ns >= 0 && viable[i + 1][ns]) {
          viable[i][s] = 1
          break
        }
      }
    }
  }

  if (!viable[0][encode(0, 0, false)]) {
    ctx.contradiction = true
    return false
  }
  if (!anyUnknown) return false // valid, and nothing left to force

  // A cell is forced when only one value survives across every arrangement that
  // is both reachable to here and completable from here.
  let changed = false
  for (let i = 0; i < n; i++) {
    if (known[i] !== null) continue
    let canBeWater = false
    let canBeRock = false
    for (let s = 0; s < stateCount; s++) {
      if (!reach[i][s] || !viable[i][s]) continue
      for (const wet of [true, false]) {
        const ns = step(s, wet, i)
        if (ns >= 0 && viable[i + 1][ns]) {
          if (wet) canBeWater = true
          else canBeRock = true
        }
      }
      if (canBeWater && canBeRock) break
    }
    if (canBeWater && !canBeRock) {
      assign.set(cells[i], 'water')
      changed = true
    } else if (canBeRock && !canBeWater) {
      assign.set(cells[i], 'rock')
      changed = true
    }
  }
  if (changed) ctx.used.add('line-connectivity')
  return changed
}

export function lineConnectivityPass(
  constraints: Constraint[],
  assign: Assign,
  ctx: SolveCtx,
): boolean {
  let changed = false
  for (const c of constraints) {
    if (
      c.kind === 'exact' &&
      c.source === 'line' &&
      c.connectivity &&
      applyLineConnectivity(c, assign, ctx)
    ) {
      changed = true
    }
    if (ctx.contradiction) return changed
  }
  return changed
}

/**
 * Parity forcing (018): a parity clue with exactly one unsettled cell left
 * determines that cell — the water so far plus this one must come out even (or
 * odd) as the clue says.
 *
 * That is the whole technique, and deliberately so. The obvious stronger rule —
 * subtracting two overlapping constraints and reading the parity of the
 * difference — was measured across 284 clues on 15 Deep boards and accounted for
 * exactly one of the 98 clues that can carry a parity form. It is not worth its
 * cost, and it is dangerous: it wants to read the parity of *exact* constraints
 * too, which would strengthen the solver on boards with no parity clue at all,
 * change what reduction keeps, and silently regenerate every board in existence.
 *
 * So this iterates ONLY parity constraints. On a board with none it does
 * nothing at all — inert by construction rather than by a gate a later edit
 * could quietly undo. `parity.test.ts` pins that property.
 *
 * A player who *does* spot the subtraction simply solves faster; the solver
 * defines what guess-free is guaranteed to mean, not what a player may notice.
 */
export function applyParity(c: Constraint, assign: Assign, ctx: SolveCtx): boolean {
  if (c.kind !== 'parity') return false
  let water = 0
  let unknown: string | null = null
  let unknownCount = 0
  for (const k of c.cells) {
    const v = assign.get(k)
    if (v === 'water') water++
    else if (v === 'unknown') {
      unknownCount++
      if (unknownCount > 1) return false // two or more unknowns: parity forces nothing
      unknown = k
    }
  }

  if (unknown === null) {
    // Fully settled — but that does NOT mean "nothing to do". The arrangement
    // can still VIOLATE the clue, and saying so is what lets the uniqueness
    // counter prune a branch that has already gone wrong. Without this the
    // counter would happily count assignments this clue forbids and could call
    // a board unique when it is not. Same reasoning as applyLineConnectivity.
    if (water % 2 !== c.parity) ctx.contradiction = true
    return false
  }

  assign.set(unknown, water % 2 === c.parity ? 'rock' : 'water')
  ctx.used.add('parity')
  return true
}

export function parityPass(
  constraints: Constraint[],
  assign: Assign,
  ctx: SolveCtx,
): boolean {
  let changed = false
  for (const c of constraints) {
    if (applyParity(c, assign, ctx)) changed = true
    if (ctx.contradiction) return changed
  }
  return changed
}

/**
 * Subset/overlap: when one constraint's still-unknown cells are a strict subset
 * of another's, the difference has a forced water count. Only overlapping
 * constraints can be subset-related, so we pair via a cell→constraint index
 * (avoids the O(C²) all-pairs scan). Returns on the first productive deduction
 * so later derivations always work from a fresh assignment (sound).
 */
export function subsetPass(
  constraints: Constraint[],
  assign: Assign,
  ctx: SolveCtx,
  allowLine = true,
): boolean {
  type Reduced = { idx: number; cells: string[]; set: Set<string>; water: number }
  const reduced: Reduced[] = []
  const cellIndex = new Map<string, number[]>()
  for (const c of constraints) {
    if (c.kind !== 'exact') continue // subset arithmetic needs exact counts on both sides
    if (c.source === 'line' && !allowLine) continue
    const { water, unknown } = tally(c.cells, assign)
    if (unknown.length === 0) continue
    const idx = reduced.length
    reduced.push({ idx, cells: unknown, set: new Set(unknown), water: c.water - water })
    for (const k of unknown) {
      const arr = cellIndex.get(k)
      if (arr) arr.push(idx)
      else cellIndex.set(k, [idx])
    }
  }

  for (const a of reduced) {
    const candidates = new Set<number>()
    for (const k of a.cells) {
      for (const j of cellIndex.get(k)!) if (j !== a.idx) candidates.add(j)
    }
    for (const j of candidates) {
      const b = reduced[j]
      if (a.cells.length >= b.cells.length) continue
      let subset = true
      for (const k of a.cells) {
        if (!b.set.has(k)) {
          subset = false
          break
        }
      }
      if (!subset) continue
      const diffCells = b.cells.filter((k) => !a.set.has(k))
      const diffWater = b.water - a.water
      if (diffWater < 0 || diffWater > diffCells.length) {
        ctx.contradiction = true
        return false
      }
      let changed = false
      if (diffWater === 0) {
        for (const k of diffCells)
          if (assign.get(k) === 'unknown') {
            assign.set(k, 'rock')
            changed = true
          }
      } else if (diffWater === diffCells.length) {
        for (const k of diffCells)
          if (assign.get(k) === 'unknown') {
            assign.set(k, 'water')
            changed = true
          }
      }
      if (changed) {
        ctx.used.add('subset-overlap')
        return true
      }
    }
  }
  return false
}
