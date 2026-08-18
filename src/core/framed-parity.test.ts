// Framed parity (019) — the two enumeration passes, checked against brute force.
//
// 018's `applyParity` was a four-line rule and could be reasoned about. This is
// not: `applyConnectivity` and `applyLineConnectivity` now decide what is forced
// by enumerating arrangements that satisfy a *face* and a *framing* together,
// and the row version does it through a hand-rolled DP whose state bound, prune
// limit and acceptance test were one number until this feature separated them.
//
// So both are compared against the definition itself — enumerate every
// arrangement, keep the ones the clue permits, and force a cell exactly when all
// survivors agree. Slow and obviously correct, run over the whole small state
// space. 010 and 018 both did this and both caught real bugs.
import type { Board, ClueToggles, Connectivity, DifficultyTier, Parity, SizeTier } from './board'
import { hasParityFace } from './board'
import type { Layout } from './clues'
import {
  canFrameParity,
  canShowParity,
  circularRuns,
  lineAdjacency,
  lineConnectivityOf,
  lineRuns,
  parityBudget,
  waterNeighborCount,
} from './clues'
import { generateBoard } from './generate'
import { AXIS_STEP, DIRECTIONS, key, linesOf } from './hex'
import { type ShapeId, shapeSupportsSize } from './shapes'
import { solve } from './solver'
import type { Assign, CellVal, Constraint, SolveCtx } from './techniques'
import { applyConnectivity, applyLineConnectivity } from './techniques'

const KNOWN: readonly CellVal[] = ['unknown', 'water', 'rock']
const FRAMINGS: readonly Connectivity[] = ['connected', 'split']
const PARITIES: readonly Parity[] = ['even', 'odd']

const ctx = (): SolveCtx => ({ contradiction: false, used: new Set() })

/** Every combination of `values` of length `n`, as an array of arrays. */
function tuples<T>(values: readonly T[], n: number): T[][] {
  let out: T[][] = [[]]
  for (let i = 0; i < n; i++) out = out.flatMap((t) => values.map((v) => [...t, v]))
  return out
}

/**
 * The reference answer: which cells are forced, or null for a contradiction.
 *
 * `admissible` is the clue itself, expressed as a predicate over a candidate
 * arrangement. Deliberately not shared with the implementation — a shared helper
 * would let one bug satisfy both sides.
 */
function bruteForce(
  known: readonly CellVal[],
  admissible: (water: boolean[]) => boolean,
): Map<number, boolean> | null {
  const n = known.length
  const survivors: boolean[][] = []
  for (const bits of tuples([true, false], n)) {
    let ok = true
    for (let i = 0; i < n; i++) {
      if (known[i] === 'water' && !bits[i]) ok = false
      if (known[i] === 'rock' && bits[i]) ok = false
    }
    if (ok && admissible(bits)) survivors.push(bits)
  }
  if (survivors.length === 0) return null

  const forced = new Map<number, boolean>()
  for (let i = 0; i < n; i++) {
    if (known[i] !== 'unknown') continue
    const first = survivors[0][i]
    if (survivors.every((s) => s[i] === first)) forced.set(i, first)
  }
  return forced
}

/** What the pass under test actually did to the assignment. */
function forcedByPass(
  known: readonly CellVal[],
  cells: string[],
  run: (assign: Assign, c: SolveCtx) => void,
): { forced: Map<number, boolean>; contradiction: boolean } {
  const assign: Assign = new Map()
  known.forEach((v, i) => assign.set(cells[i], v))
  const c = ctx()
  run(assign, c)
  const forced = new Map<number, boolean>()
  known.forEach((v, i) => {
    if (v !== 'unknown') return
    const now = assign.get(cells[i])
    if (now !== 'unknown') forced.set(i, now === 'water')
  })
  return { forced, contradiction: c.contradiction }
}

function sameForcing(a: Map<number, boolean>, b: Map<number, boolean>): boolean {
  if (a.size !== b.size) return false
  for (const [k, v] of a) if (b.get(k) !== v) return false
  return true
}

const show = (known: readonly CellVal[]): string =>
  known.map((v) => (v === 'water' ? 'W' : v === 'rock' ? 'R' : '.')).join('')

// ── The ring: `{●●}` / `-●●-` on a stone ─────────────────────────────────────

describe('applyConnectivity over a parity face (019 FR-003)', () => {
  const RING = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5']

  const constraintFor = (parity: Parity, connectivity: Connectivity): Constraint => ({
    kind: 'parity',
    parity: parity === 'even' ? 0 : 1,
    cells: RING,
    source: 'adjacency',
    ring: RING,
    connectivity,
  })

  it('forces exactly what enumeration forces, over all 729 ring states', () => {
    let checked = 0
    for (const known of tuples(KNOWN, 6)) {
      // The fully-known ring is the pass's one documented gap; see the test
      // below, which pins it deliberately rather than letting it hide here.
      if (!known.some((v) => v === 'unknown')) continue
      for (const parity of PARITIES) {
        for (const framing of FRAMINGS) {
          const c = constraintFor(parity, framing)
          const want = bruteForce(known, (bits) => {
            const water = bits.filter(Boolean).length
            const split = circularRuns(bits) >= 2
            return water % 2 === (parity === 'even' ? 0 : 1) && split === (framing === 'split')
          })
          const got = forcedByPass(known, RING, (assign, sc) => {
            applyConnectivity(c, assign, sc)
          })
          const label = `${show(known)} ${parity}/${framing}`

          if (want === null) {
            expect(got.contradiction, `${label}: unsatisfiable, pass must say so`).toBe(true)
          } else {
            expect(got.contradiction, `${label}: satisfiable, pass claimed contradiction`).toBe(
              false,
            )
            expect(sameForcing(got.forced, want), `${label}: forcing disagrees`).toBe(true)
          }
          checked++
        }
      }
    }
    expect(checked).toBe((729 - 64) * 4) // every ring state except the 2^6 fully-known ones
  })

  it('DECLINES a fully-known ring rather than validating it (pre-019 behaviour)', () => {
    // Not a bug being papered over — a documented asymmetry, pinned so that
    // "fixing" it has to be a decision rather than a tidy-up.
    //
    // `applyLineConnectivity` and `applyParity` both check the zero-unknown case
    // and explain why: it lets the uniqueness counter prune a branch that has
    // already gone wrong. `applyConnectivity` has never done so. The direction
    // is safe — the counter can only OVER-count, so a board is never wrongly
    // called unique, only wrongly discarded — but changing it changes which
    // candidate a seed settles on, for every board the game can generate.
    //
    // Measured while generalising the pass for 019: removing the early return
    // moved none of the 49 frozen fingerprints and none of the 72 curated
    // boards. So it looks free. 121 samples is not the same as "free", and it
    // is not this feature's change to make.
    const c = constraintFor('even', 'connected')
    const known: CellVal[] = ['water', 'rock', 'water', 'rock', 'rock', 'rock']
    // Two water, split apart: satisfies the parity, violates `{}`.
    expect(circularRuns([true, false, true, false, false, false])).toBe(2)
    const got = forcedByPass(known, RING, (assign, sc) => {
      applyConnectivity(c, assign, sc)
    })
    expect(got.contradiction, 'if this now reports a contradiction, see the note above').toBe(false)
  })

  it('uses BOTH halves — the framing forces strictly more than the parity alone', () => {
    // The control for FR-003. If `admits` were consulted but the run count
    // ignored (or vice versa), the pass would still look sound; it would just be
    // weaker or stronger than the clue. Counting forced cells across the whole
    // sweep separates those cases from correctness.
    let framedTotal = 0
    let bareTotal = 0
    for (const known of tuples(KNOWN, 6)) {
      for (const parity of PARITIES) {
        const p = parity === 'even' ? 0 : 1
        const bare = bruteForce(known, (bits) => bits.filter(Boolean).length % 2 === p)
        bareTotal += bare?.size ?? 0
        for (const framing of FRAMINGS) {
          const framed = bruteForce(known, (bits) => {
            const split = circularRuns(bits) >= 2
            return bits.filter(Boolean).length % 2 === p && split === (framing === 'split')
          })
          framedTotal += framed?.size ?? 0
        }
      }
    }
    expect(framedTotal).toBeGreaterThan(bareTotal)
  })

  it('still forces a count face exactly as it always did', () => {
    // The generalisation must not have changed the path every shipped board
    // uses. The fingerprint table says so at the board level; this says so at
    // the pass level, where a failure is readable.
    const c: Constraint = {
      kind: 'exact',
      water: 3,
      cells: RING,
      source: 'adjacency',
      ring: RING,
      connectivity: 'connected',
    }
    for (const known of tuples(KNOWN, 6)) {
      if (!known.some((v) => v === 'unknown')) continue // see the gap test above
      const want = bruteForce(
        known,
        (bits) => bits.filter(Boolean).length === 3 && circularRuns(bits) <= 1,
      )
      const got = forcedByPass(known, RING, (assign, sc) => {
        applyConnectivity(c, assign, sc)
      })
      if (want === null) expect(got.contradiction, show(known)).toBe(true)
      else expect(sameForcing(got.forced, want), show(known)).toBe(true)
    }
  })
})

// ── The row: `{●●}` / `-●●-` on an edge total ────────────────────────────────

describe('applyLineConnectivity over a parity face (019 FR-003)', () => {
  /**
   * Rows up to 7 long, which covers the DP's whole behaviour: the state bound
   * grows with the row rather than with a target, runs saturate at 2, and holes
   * end runs. Longer rows exercise no new branch, only bigger numbers.
   */
  const LENGTHS = [3, 4, 5, 6, 7]

  const cellsOf = (n: number): string[] => Array.from({ length: n }, (_, i) => `r${i}`)

  const constraintFor = (
    n: number,
    parity: Parity,
    connectivity: Connectivity,
    adjacent: boolean[],
  ): Constraint => ({
    kind: 'parity',
    parity: parity === 'even' ? 0 : 1,
    cells: cellsOf(n),
    source: 'line',
    connectivity,
    adjacent,
  })

  it('forces exactly what enumeration forces, for every row state', () => {
    let checked = 0
    for (const n of LENGTHS) {
      const cells = cellsOf(n)
      // Contiguous, and a row with one hole — the case where a gap ends a run
      // just as a stone does (010 FR-003), which the DP handles in `step`.
      const adjacencies: boolean[][] = [
        new Array(n - 1).fill(true),
        new Array(n - 1).fill(true).map((v, i) => (i === Math.floor((n - 1) / 2) ? false : v)),
      ]
      for (const adjacent of adjacencies) {
        for (const known of tuples(KNOWN, n)) {
          for (const parity of PARITIES) {
            for (const framing of FRAMINGS) {
              const p = parity === 'even' ? 0 : 1
              const c = constraintFor(n, parity, framing, adjacent)
              const want = bruteForce(known, (bits) => {
                const runs = lineRuns(bits, adjacent)
                const split = runs >= 2
                return bits.filter(Boolean).length % 2 === p && split === (framing === 'split')
              })
              const got = forcedByPass(known, cells, (assign, sc) => {
                applyLineConnectivity(c, assign, sc)
              })
              const label = `n=${n} ${show(known)} ${parity}/${framing} adj=${adjacent.join('')}`

              if (want === null) {
                expect(got.contradiction, `${label}: unsatisfiable, DP must say so`).toBe(true)
              } else {
                expect(got.contradiction, `${label}: satisfiable, DP claimed contradiction`).toBe(
                  false,
                )
                expect(sameForcing(got.forced, want), `${label}: forcing disagrees`).toBe(true)
              }
              checked++
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(10_000)
  })

  it('tracks water counts above the parity’s smallest admissible total', () => {
    // The specific failure the `maxWater` separation exists to prevent. With the
    // prune limit still tied to a target, the DP would never reach the states
    // where 3 or 5 cells are water and would call this row unsatisfiable — a
    // board-breaking bug that looks exactly like a correct refusal to act.
    const n = 5
    const cells = cellsOf(n)
    const c = constraintFor(n, 'odd', 'connected', new Array(n - 1).fill(true))
    const known: CellVal[] = ['water', 'water', 'water', 'rock', 'rock']
    const got = forcedByPass(known, cells, (assign, sc) => {
      applyLineConnectivity(c, assign, sc)
    })
    expect(got.contradiction, 'three water in one run is odd and connected — valid').toBe(false)
  })

  it('still forces a count face exactly as it always did', () => {
    const n = 6
    const cells = cellsOf(n)
    const adjacent = new Array(n - 1).fill(true)
    for (const total of [2, 3, 4]) {
      for (const framing of FRAMINGS) {
        const c: Constraint = {
          kind: 'exact',
          water: total,
          cells,
          source: 'line',
          connectivity: framing,
          adjacent,
        }
        for (const known of tuples(KNOWN, n)) {
          const want = bruteForce(known, (bits) => {
            const split = lineRuns(bits, adjacent) >= 2
            return bits.filter(Boolean).length === total && split === (framing === 'split')
          })
          const got = forcedByPass(known, cells, (assign, sc) => {
            applyLineConnectivity(c, assign, sc)
          })
          const label = `total=${total}/${framing} ${show(known)}`
          if (want === null) expect(got.contradiction, label).toBe(true)
          else expect(sameForcing(got.forced, want), label).toBe(true)
        }
      }
    }
  })
})

// ── Generation: what actually reaches a served board (019 US1) ───────────────

const SEEDS = ['CORAL-4417', 'KELP-0007', 'TIDE-1234', 'COVE-0001', 'FOAM-0002']
const SIZES: SizeTier[] = ['Small', 'Medium', 'Large']
const BASE_CLUES: ClueToggles = { connectivity: true, lineTotals: true }

function boardFor(
  seed: string,
  size: SizeTier,
  difficulty: DifficultyTier,
  clues: ClueToggles,
): Board {
  return generateBoard({ seed, size, difficulty, clues })
}

/** True water total of a row, from the ground-truth layout. */
function trueWater(board: Board, axis: number, index: number): { water: number; length: number } {
  const ln = linesOf(board.present).find((l) => l.axis === axis && l.index === index)
  if (!ln) throw new Error(`no such row ${axis},${index}`)
  let water = 0
  for (const k of ln.cells) if (board.cells.get(k)?.state === 'water') water++
  return { water, length: ln.cells.length }
}

describe('parity on an edge total (019 FR-001)', () => {
  const boards = SEEDS.flatMap((seed) =>
    SIZES.map((size) => ({
      label: `${seed} ${size}`,
      board: boardFor(seed, size, 'Deep', { ...BASE_CLUES, evenOdd: true }),
    })),
  )

  it('reaches real boards, on a meaningful share of rows', () => {
    let parity = 0
    let total = 0
    for (const { board } of boards) {
      for (const line of board.lines) {
        total++
        if (hasParityFace(line)) parity++
      }
    }
    // Measured at 30.1% when the ladder landed. The floor is deliberately far
    // below that: this asserts the mechanic is not inert, not that a particular
    // generator run reproduces a number.
    expect(total).toBeGreaterThan(100)
    expect(parity / total).toBeGreaterThan(0.1)
  })

  it('never hides a zero, and never pins the total it claims to withhold', () => {
    // 018 FR-006 read for a row (019 FR-009). A row of no water reading `●●` is
    // the same trap over a longer span: correct, and it makes a player rule out
    // the truth.
    for (const { label, board } of boards) {
      for (const line of board.lines) {
        if (!hasParityFace(line)) continue
        const { water, length } = trueWater(board, line.axis, line.index)
        expect(water, `${label} row ${line.axis},${line.index} shows a mark over zero`).toBeGreaterThan(0)
        expect(length, `${label} row ${line.axis},${line.index} is too short to withhold`).toBeGreaterThanOrEqual(2)
        // And the mark tells the truth about the row it sits on.
        expect(water % 2 === 0 ? 'even' : 'odd').toBe(line.parity)
      }
    }
  })

  it('serves only boards the oracle certifies unique and guess-free (FR-005)', () => {
    for (const { label, board } of boards) {
      const res = solve(board)
      expect(res.solved, `${label} is not guess-free`).toBe(true)
      expect(res.unique, `${label} is not uniquely solvable`).toBe(true)
    }
  })

  it('stays off below Deep even with the toggle forced on (FR-006)', () => {
    // The gate lives in reduction, not only in the UI. 018 measured that the
    // technique set alone does NOT prevent this for cells — weakening keeps the
    // reveal, so a clue kept for its reveal survives weakening at any tier.
    for (const difficulty of ['Calm', 'Tricky'] as const) {
      for (const seed of SEEDS) {
        const board = boardFor(seed, 'Medium', difficulty, { ...BASE_CLUES, evenOdd: true })
        const lines = board.lines.filter(hasParityFace)
        const cells = [...board.cells.values()].filter((c) => c.clue && hasParityFace(c.clue))
        expect(lines, `${seed} ${difficulty} grew a parity row`).toHaveLength(0)
        expect(cells, `${seed} ${difficulty} grew a parity stone`).toHaveLength(0)
      }
    }
  })

  it('leaves every row a plain number when the toggle is off (FR-008)', () => {
    for (const seed of SEEDS) {
      const board = boardFor(seed, 'Medium', 'Deep', BASE_CLUES)
      expect(board.lines.filter(hasParityFace), `${seed} without evenOdd`).toHaveLength(0)
    }
  })

  it('keeps numbers the commonest face on the board (SC-005)', () => {
    // Density is this feature's real risk, not scarcity. Counted across tiles
    // and edges together, as the criterion says.
    //
    // NOTE this assertion is nearly worthless on its own and 022 is the proof:
    // it POOLS the sample, so it passed at 298 numbers vs 179 marks while
    // individual boards ran to 86% marks on their stones. Kept because the
    // criterion is worded this way; the assertion that does the work is the
    // per-board cap below.
    let numbers = 0
    let parity = 0
    for (const { board } of boards) {
      for (const cell of board.cells.values()) {
        if (!cell.given || !cell.clue) continue
        hasParityFace(cell.clue) ? parity++ : numbers++
      }
      for (const line of board.lines) hasParityFace(line) ? parity++ : numbers++
    }
    expect(numbers, `${numbers} numbers vs ${parity} parity marks`).toBeGreaterThan(parity)
  })
})

// ── Density: how much of one board may withhold its number (022) ─────────────

describe('parity density is capped per board and per site (022)', () => {
  /** Every silhouette, not just the hexagon — shaped cells have fewer
   *  neighbours and measurably ran hotter than `hex` before the cap. */
  const SHORES: (ShapeId | undefined)[] = [undefined, 'atoll', 'crescent', 'wedge', 'shoal']
  const DENSE_SIZES: SizeTier[] = ['Medium', 'Large']

  /** The hottest configuration the game can serve: Deep, both toggles on. */
  const dense = SEEDS.flatMap((seed) =>
    DENSE_SIZES.flatMap((size) =>
      SHORES.filter((shape) => shape === undefined || shapeSupportsSize(shape, size)).map(
        (shape) => ({
          label: `${seed} ${size} ${shape ?? 'hex'}`,
          board: generateBoard({
            seed,
            size,
            difficulty: 'Deep',
            clues: { ...BASE_CLUES, evenOdd: true, lineConnectivity: true },
            ...(shape ? { shape } : {}),
          }),
        }),
      ),
    ),
  )

  const clueCells = (board: Board) => [...board.cells.values()].filter((c) => c.given && c.clue)

  it('never lets marks past the budget, on ANY board and at EITHER site', () => {
    // The shape of assertion 019 got wrong, and the reason this feature exists.
    // Its SC-005 test pooled every board in the sample and sampled hexagons
    // only, so it was green while one board in the sweep showed marks on 86% of
    // its stones. **A player meets one board, never an average.** So this
    // asserts the worst board in the sample, not the sum of them.
    for (const { label, board } of dense) {
      const cells = clueCells(board)
      const tileMarks = cells.filter((c) => c.clue && hasParityFace(c.clue)).length
      expect(
        tileMarks,
        `${label}: ${tileMarks}/${cells.length} stones withhold their count`,
      ).toBeLessThanOrEqual(parityBudget(cells.length))

      const lineMarks = board.lines.filter(hasParityFace).length
      expect(
        lineMarks,
        `${label}: ${lineMarks}/${board.lines.length} edge numbers withhold their total`,
      ).toBeLessThanOrEqual(parityBudget(board.lines.length))
    }
  })

  it('still puts marks on the board — the cap is a ceiling, not a ban', () => {
    // The other direction. A cap is easy to satisfy by refusing everything, and
    // that would silently delete a shipped mechanic.
    const withMarks = dense.filter(
      ({ board }) =>
        board.lines.some(hasParityFace) ||
        clueCells(board).some((c) => c.clue && hasParityFace(c.clue)),
    )
    expect(withMarks.length, 'the cap emptied the mechanic').toBe(dense.length)
  })

  it('still serves only boards the oracle certifies unique and guess-free', () => {
    // Refusing to weaken can only ever leave a stronger clue, so this should be
    // impossible to break — which is exactly why it is worth pinning cheaply.
    for (const { label, board } of dense) {
      const res = solve(board)
      expect(res.solved, `${label} is not guess-free`).toBe(true)
      expect(res.unique, `${label} is not uniquely solvable`).toBe(true)
    }
  })
})

// ── Framed parity: the four combined forms (019 US2) ─────────────────────────

describe('framed parity on a stone and on a row (019 FR-002)', () => {
  const boards = SEEDS.flatMap((seed) =>
    SIZES.map((size) => ({
      label: `${seed} ${size}`,
      board: boardFor(seed, size, 'Deep', {
        ...BASE_CLUES,
        evenOdd: true,
        lineConnectivity: true,
      }),
    })),
  )

  /** Which run-classes a parity face admits, over the arrangements of a slot set. */
  function classesFor(
    slotCount: number,
    parity: Parity,
    runsOf: (bits: boolean[]) => number,
    place: (bits: boolean[]) => boolean[],
  ): { connected: boolean; split: boolean } {
    const want = parity === 'even' ? 0 : 1
    let connected = false
    let split = false
    for (let mask = 0; mask < 1 << slotCount; mask++) {
      const bits = Array.from({ length: slotCount }, (_, i) => (mask & (1 << i)) !== 0)
      if (bits.filter(Boolean).length % 2 !== want) continue
      if (runsOf(place(bits)) <= 1) connected = true
      else split = true
      if (connected && split) break
    }
    return { connected, split }
  }

  it('reaches all four framed forms across a sample (SC-003)', () => {
    const seen = new Set<string>()
    for (const { board } of boards) {
      for (const cell of board.cells.values()) {
        const c = cell.clue
        if (!c || !hasParityFace(c) || !c.connectivity) continue
        seen.add(`${c.connectivity}/${c.parity}`)
      }
    }
    expect([...seen].sort()).toEqual([
      'connected/even',
      'connected/odd',
      'split/even',
      'split/odd',
    ])
  })

  it('reaches an edge total too, when row annotations are switched on', () => {
    const seen = new Set<string>()
    for (const { board } of boards) {
      for (const line of board.lines) {
        if (!hasParityFace(line) || !line.connectivity) continue
        seen.add(`${line.connectivity}/${line.parity}`)
      }
    }
    expect(seen.size, 'no edge total carried a framed parity mark').toBeGreaterThan(0)
  })

  it('never frames a row when the annotation toggle is off', () => {
    // A player who turned edge hints off has said they do not want braced row
    // clues. `{●●}` is a braced row clue however it got there.
    for (const seed of SEEDS) {
      const board = boardFor(seed, 'Large', 'Deep', { ...BASE_CLUES, evenOdd: true })
      for (const line of board.lines) {
        expect(line.connectivity, `${seed} framed a row without the toggle`).toBeUndefined()
      }
    }
  })

  it('tells the truth: a framed mark matches the layout it sits on', () => {
    for (const { label, board } of boards) {
      for (const line of board.lines) {
        if (!hasParityFace(line) || !line.connectivity) continue
        const ln = linesOf(board.present).find(
          (l) => l.axis === line.axis && l.index === line.index,
        )!
        const water = ln.cells.map((k) => board.cells.get(k)?.state === 'water')
        const adjacent = lineAdjacency(ln.cells, AXIS_STEP[line.axis])
        expect(lineConnectivityOf(water, adjacent), `${label} row ${line.axis},${line.index}`).toBe(
          line.connectivity,
        )
        expect(water.filter(Boolean).length % 2 === 0 ? 'even' : 'odd').toBe(line.parity)
      }
    }
  })

  it('only frames where the framing distinguishes something (FR-004)', () => {
    // The ladder gives this for free and more strictly than a rule could: rung 2
    // is reached only after bare parity FAILED, so a framing that ruled nothing
    // out would leave the board just as unsolvable and fall through to the
    // number. This asserts the consequence — if only one run-class were
    // achievable for a mark's parity, its framing could never have done work.
    for (const { label, board } of boards) {
      for (const cell of board.cells.values()) {
        const c = cell.clue
        if (!c || !hasParityFace(c) || !c.connectivity) continue
        const present = DIRECTIONS.map((d) =>
          board.present.has(key({ q: cell.coord.q + d.q, r: cell.coord.r + d.r })),
        )
        const slots = present.flatMap((p, i) => (p ? [i] : []))
        const cls = classesFor(slots.length, c.parity, circularRuns, (bits) => {
          const ring = new Array<boolean>(6).fill(false)
          bits.forEach((b, i) => {
            if (b) ring[slots[i]] = true
          })
          return ring
        })
        expect(
          cls.connected && cls.split,
          `${label} framed a stone whose parity admits only one arrangement class`,
        ).toBe(true)
      }
    }
  })
})

describe('a framed mark needs a count worth framing (019 FR-013)', () => {
  const boards = SEEDS.flatMap((seed) =>
    SIZES.map((size) => ({
      label: `${seed} ${size}`,
      board: boardFor(seed, size, 'Deep', {
        ...BASE_CLUES,
        evenOdd: true,
        lineConnectivity: true,
      }),
    })),
  )

  it('refuses to frame a parity mark over a count of 1 or 2', () => {
    // The zero rule one step along. A framing over a KNOWN count is read against
    // that count — `{2}` says two tiles side by side and there is nothing to
    // misread. A framing over a WITHHELD count is read on its own, and "all in
    // one unbroken run" is not how anybody describes a single tile: a player
    // meeting `{●}` takes the run to be more than one tile, rules out 1, and
    // concludes 3 or 5. Over a true 1 that is a wrong deduction reached by
    // sound-looking reasoning.
    const layoutOfBoard = (b: Board): Layout => {
      const m: Layout = new Map()
      for (const [k, c] of b.cells) m.set(k, c.state)
      return m
    }

    let framed = 0
    for (const { label, board } of boards) {
      const layout = layoutOfBoard(board)
      for (const [k, cell] of board.cells) {
        const c = cell.clue
        if (!c || !hasParityFace(c) || !c.connectivity) continue
        framed++
        const water = waterNeighborCount(cell.coord, layout, board.present)
        expect(water, `${label} framed a mark over ${water} water at ${k}`).toBeGreaterThanOrEqual(
          3,
        )
      }
      for (const line of board.lines) {
        if (!hasParityFace(line) || !line.connectivity) continue
        framed++
        const { water } = trueWater(board, line.axis, line.index)
        expect(
          water,
          `${label} framed row ${line.axis},${line.index} over ${water} water`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
    expect(framed, 'no framed marks at all — the rule would be vacuous').toBeGreaterThan(0)
  })

  it('still allows a BARE mark over 1 or 2, and a framed COUNT over 2', () => {
    // The rule is about framing a withheld number, not about small numbers. Both
    // of these stay legal, and `{2}` has been legal since 010 — changing that
    // would regenerate every board in existence.
    expect(canFrameParity(1)).toBe(false)
    expect(canFrameParity(2)).toBe(false)
    expect(canFrameParity(3)).toBe(true)
    expect(canFrameParity(4)).toBe(true)
    // Bare marks are governed by canShowParity, which only refuses zero.
    expect(canShowParity(6, 1)).toBe(true)
    expect(canShowParity(6, 2)).toBe(true)
  })
})
