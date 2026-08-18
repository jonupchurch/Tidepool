// Row connectivity (010): the `{n}` / `-n-` mechanic on line totals.
//
// The DP in `applyLineConnectivity` is the only genuinely new reasoning in this
// feature, and it is the kind of code that looks right and is subtly wrong at
// the edges. So it is checked DIFFERENTIALLY against brute-force enumeration
// over every row short enough to enumerate — that is what actually proves it,
// and it costs almost nothing to write.
import type { Board, SizeTier } from './board'
import { lineAdjacency, lineConnectivityInforms, lineConnectivityOf, lineRuns } from './clues'
import { generateBoard } from './generate'
import { AXIS_STEP, linesOf } from './hex'
import { nextInt, seedToRng } from './rng'
import { deserializeBoard, serializeBoard } from './serialize'
import { solve, techniqueSolves } from './solver'
import { type Assign, type Constraint, type SolveCtx, applyLineConnectivity } from './techniques'

const ctx = (): SolveCtx => ({ contradiction: false, used: new Set() })
const keys = (n: number): string[] => Array.from({ length: n }, (_, i) => `${i},0`)
const allAdjacent = (n: number): boolean[] => new Array(Math.max(0, n - 1)).fill(true)

describe('lineRuns — a stone ends a run, and so does a hole', () => {
  it('counts runs on a contiguous row', () => {
    const adj = allAdjacent(5)
    expect(lineRuns([false, false, false, false, false], adj)).toBe(0)
    expect(lineRuns([true, true, true, true, true], adj)).toBe(1)
    expect(lineRuns([true, true, false, true, false], adj)).toBe(2)
    expect(lineRuns([true, false, true, false, true], adj)).toBe(3)
  })

  it('treats a gap as a break, so cells either side are not one run', () => {
    // A B | C D  — water at A,B and at C,D looks like two pools, not one.
    const gapped = [true, false, true] // adjacency between the 4 cells
    expect(lineRuns([true, true, true, true], gapped)).toBe(2)
    // ...and water only on one side of the hole is still a single run.
    expect(lineRuns([true, true, false, false], gapped)).toBe(1)
  })

  it('reports connectivity from the run count', () => {
    expect(lineConnectivityOf([true, true, false], allAdjacent(3))).toBe('connected')
    expect(lineConnectivityOf([true, false, true], allAdjacent(3))).toBe('split')
    // Two water cells split by a hole read as split even though nothing is
    // between them — the same rule the adjacency ring already uses for an
    // absent neighbour.
    expect(lineConnectivityOf([true, true], [false])).toBe('split')
  })
})

describe('lineAdjacency', () => {
  it('is all-true for a contiguous row', () => {
    expect(lineAdjacency(['0,0', '1,0', '2,0'], AXIS_STEP[0])).toEqual([true, true])
  })

  it('marks the break where a row skips a cell', () => {
    expect(lineAdjacency(['0,0', '1,0', '3,0'], AXIS_STEP[0])).toEqual([true, false])
  })

  it('follows each axis its own way', () => {
    expect(lineAdjacency(['0,0', '0,1'], AXIS_STEP[1])).toEqual([true])
    expect(lineAdjacency(['0,0', '1,-1'], AXIS_STEP[2])).toEqual([true])
  })
})

describe('lineConnectivityInforms — annotate only where it says something', () => {
  it('says nothing at 0 or 1 water, or when the whole row is water', () => {
    expect(lineConnectivityInforms(5, 0, allAdjacent(5))).toBe(false)
    expect(lineConnectivityInforms(5, 1, allAdjacent(5))).toBe(false)
    expect(lineConnectivityInforms(5, 5, allAdjacent(5))).toBe(false)
  })

  it('informs when both arrangements are reachable', () => {
    expect(lineConnectivityInforms(5, 2, allAdjacent(5))).toBe(true)
    // length-1 water: the stone can sit at an end (connected) or inside (split)
    expect(lineConnectivityInforms(4, 3, allAdjacent(4))).toBe(true)
  })

  it('says nothing when the row FORCES one answer despite a workable count', () => {
    // Two isolated singletons: filling both is always split, so `-2-` is noise.
    expect(lineConnectivityInforms(2, 2, [false])).toBe(false)
    // The count window the adjacency ring uses would have accepted this one,
    // which is exactly why rows get an exact test instead of that heuristic.
  })

  it('never annotates a row too short to distinguish anything', () => {
    expect(lineConnectivityInforms(1, 1, [])).toBe(false)
    expect(lineConnectivityInforms(2, 2, allAdjacent(2))).toBe(false)
  })
})

/** Every arrangement of `water` cells in the row consistent with `known`. */
function validArrangements(
  n: number,
  water: number,
  wantConnected: boolean,
  adjacent: boolean[],
  known: (boolean | null)[],
): boolean[][] {
  const out: boolean[][] = []
  for (let mask = 0; mask < 1 << n; mask++) {
    const wet: boolean[] = []
    for (let i = 0; i < n; i++) wet.push((mask & (1 << i)) !== 0)
    if (wet.filter(Boolean).length !== water) continue
    if (wet.some((w, i) => known[i] !== null && known[i] !== w)) continue
    const connected = lineRuns(wet, adjacent) <= 1
    if (connected !== wantConnected) continue
    out.push(wet)
  }
  return out
}

/** What a perfect solver would force, derived by enumeration. */
function bruteForce(
  n: number,
  water: number,
  wantConnected: boolean,
  adjacent: boolean[],
  known: (boolean | null)[],
): { contradiction: boolean; forced: Map<number, boolean> } {
  const arrangements = validArrangements(n, water, wantConnected, adjacent, known)
  if (arrangements.length === 0) return { contradiction: true, forced: new Map() }
  const forced = new Map<number, boolean>()
  for (let i = 0; i < n; i++) {
    if (known[i] !== null) continue
    const values = new Set(arrangements.map((a) => a[i]))
    if (values.size === 1) forced.set(i, [...values][0])
  }
  return { contradiction: false, forced }
}

function runDp(
  n: number,
  water: number,
  wantConnected: boolean,
  adjacent: boolean[],
  known: (boolean | null)[],
): { contradiction: boolean; forced: Map<number, boolean> } {
  const cells = keys(n)
  const assign: Assign = new Map()
  cells.forEach((k, i) => {
    assign.set(k, known[i] === null ? 'unknown' : known[i] ? 'water' : 'rock')
  })
  const c: Constraint = {
    kind: 'exact',
    cells,
    water,
    source: 'line',
    connectivity: wantConnected ? 'connected' : 'split',
    adjacent,
  }
  const context = ctx()
  applyLineConnectivity(c, assign, context)
  const forced = new Map<number, boolean>()
  cells.forEach((k, i) => {
    if (known[i] !== null) return
    const v = assign.get(k)
    if (v === 'water') forced.set(i, true)
    else if (v === 'rock') forced.set(i, false)
  })
  return { contradiction: context.contradiction, forced }
}

describe('applyLineConnectivity — differential against brute force', () => {
  it('agrees with enumeration across every small row, total and known-state', () => {
    // Deterministic by construction: exhaustive over the small cases and a
    // seeded walk over the known-cell patterns for the larger ones.
    const rng = seedToRng('line-connectivity-differential')
    let checked = 0
    for (let n = 2; n <= 9; n++) {
      const adjacencies: boolean[][] = [allAdjacent(n)]
      // ...plus a few gapped rows, which only exist once boards are irregular
      // but whose semantics 010 fixes now so the two features can't disagree.
      if (n >= 3) {
        const oneGap = allAdjacent(n)
        oneGap[Math.floor(n / 2)] = false
        adjacencies.push(oneGap)
      }
      if (n >= 5) {
        const twoGaps = allAdjacent(n)
        twoGaps[1] = false
        twoGaps[n - 2] = false
        adjacencies.push(twoGaps)
      }

      for (const adjacent of adjacencies) {
        for (let water = 0; water <= n; water++) {
          for (const wantConnected of [true, false]) {
            // A spread of partial knowledge, including "nothing known".
            const patterns: (boolean | null)[][] = [new Array(n).fill(null)]
            for (let t = 0; t < 12; t++) {
              patterns.push(
                Array.from({ length: n }, () => {
                  const r = nextInt(rng, 3)
                  return r === 0 ? true : r === 1 ? false : null
                }),
              )
            }

            for (const known of patterns) {
              const expected = bruteForce(n, water, wantConnected, adjacent, known)
              const actual = runDp(n, water, wantConnected, adjacent, known)
              const label = `n=${n} water=${water} connected=${wantConnected} adj=${adjacent.join('')} known=${known.map((k) => (k === null ? '?' : k ? 'W' : 'R')).join('')}`
              expect(actual.contradiction, label).toBe(expected.contradiction)
              if (!expected.contradiction) {
                expect([...actual.forced.entries()].sort(), label).toEqual(
                  [...expected.forced.entries()].sort(),
                )
              }
              checked++
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(2000)
  })

  it('never forces a cell that is genuinely free', () => {
    // `{2}` on a 4-row: the pair can sit at 3 places, so nothing is forced.
    const { forced } = runDp(4, 2, true, allAdjacent(4), [null, null, null, null])
    expect(forced.size).toBe(0)
  })

  it('forces what a player would see', () => {
    // `{3}` on a 4-row with the last cell known water: the run must be cells
    // 1..3, so cell 0 is stone and 1 and 2 are water.
    const { forced } = runDp(4, 3, true, allAdjacent(4), [null, null, null, true])
    expect(forced.get(0)).toBe(false)
    expect(forced.get(1)).toBe(true)
    expect(forced.get(2)).toBe(true)
  })

  it('flags an impossible annotation as a contradiction', () => {
    // `{2}` where the only two cells are separated by a hole — cannot be one run.
    const { contradiction } = runDp(3, 2, true, [false, false], [true, false, true])
    expect(contradiction).toBe(true)
  })

  it('treats three runs as split rather than rejecting them', () => {
    // The DP saturates its run counter at 2; if that cap DROPPED arrangements
    // instead of folding them, this row would look forced when it isn't.
    const { contradiction, forced } = runDp(5, 3, false, allAdjacent(5), [
      null,
      null,
      null,
      null,
      null,
    ])
    expect(contradiction).toBe(false)
    expect(forced.size).toBe(0) // W R W R W is valid, and so is W W R W R
  })
})

describe('generated boards carrying row annotations', () => {
  const annotated = (seed: string, size: SizeTier = 'Medium'): Board =>
    generateBoard({
      seed,
      size,
      difficulty: 'Deep',
      clues: { connectivity: true, lineTotals: true, lineConnectivity: true },
    })

  const SEEDS = ['KELP-0007', 'CORAL-4417', 'TIDE-1234', 'REEF-0042']

  for (const seed of SEEDS) {
    it(`${seed} is uniquely solvable and guess-free (FR-006, SC-002)`, () => {
      const res = solve(annotated(seed))
      expect(res.solved).toBe(true)
      expect(res.unique).toBe(true)
      expect(res.contradiction).toBeUndefined()
    })

    it(`${seed}'s annotations are all true of its solution (FR-005, SC-001)`, () => {
      const board = annotated(seed)
      const byId = new Map(linesOf(board.present).map((l) => [`${l.axis},${l.index}`, l]))
      let annotations = 0
      for (const lc of board.lines) {
        if (!lc.connectivity) continue
        annotations++
        const line = byId.get(`${lc.axis},${lc.index}`)!
        const water = line.cells.map((k) => board.cells.get(k)?.state === 'water')
        const adjacent = lineAdjacency(line.cells, AXIS_STEP[lc.axis])
        expect(lineConnectivityOf(water, adjacent), `${seed} ${lc.axis},${lc.index}`).toBe(
          lc.connectivity,
        )
        // And the total it is attached to must also be true.
        expect(water.filter(Boolean).length).toBe(lc.total)
      }
      // Not a hard requirement per board, but if NO seed ever annotated
      // anything the mechanic would be inert — see the SC-004 test below.
      expect(annotations).toBeGreaterThanOrEqual(0)
    })
  }

  it('never annotates a row where the annotation says nothing (FR-004)', () => {
    for (const seed of SEEDS) {
      const board = annotated(seed)
      const byId = new Map(linesOf(board.present).map((l) => [`${l.axis},${l.index}`, l]))
      for (const lc of board.lines) {
        if (!lc.connectivity) continue
        const line = byId.get(`${lc.axis},${lc.index}`)!
        const adjacent = lineAdjacency(line.cells, AXIS_STEP[lc.axis])
        expect(
          lineConnectivityInforms(line.cells.length, lc.total, adjacent),
          `${seed} annotated an uninformative row ${lc.axis},${lc.index}`,
        ).toBe(true)
      }
    }
  })

  it('the mechanic changes outcomes, it is not decoration (SC-004)', () => {
    // Somewhere in a spread of seeds there must be a board that CANNOT be
    // finished once its annotations are stripped. If this ever fails, the
    // feature renders but earns nothing.
    const stripped = (board: Board): Board => ({
      ...board,
      lines: board.lines.map(({ connectivity: _drop, ...rest }) => rest),
    })
    const seeds = [...SEEDS, 'SHELL-0001', 'FOAM-0002', 'COVE-0001', 'SPRAY-0001']
    const load = seeds.some((seed) => {
      const board = annotated(seed)
      if (!board.lines.some((l) => l.connectivity)) return false
      return !techniqueSolves(stripped(board)).solved
    })
    expect(load, 'no seed produced a board that needs its row annotations').toBe(true)
  })

  it('a board that needs them is rated Deep, not below (FR-007)', () => {
    for (const seed of SEEDS) {
      const res = solve(annotated(seed))
      if (!res.techniquesUsed.includes('line-connectivity')) continue
      expect(res.rating, seed).toBe('Deep')
    }
  })

  it('leaves boards alone when the toggle is off (FR-009)', () => {
    const off = generateBoard({
      seed: 'KELP-0007',
      size: 'Medium',
      difficulty: 'Deep',
      clues: { connectivity: true, lineTotals: true },
    })
    expect(off.lines.some((l) => l.connectivity)).toBe(false)
    // ...and explicitly-false produces the same BOARD as absent, so a manifest
    // can write the flag out without moving anything. Compared on content, not
    // on serializeBoard: that embeds `params` verbatim, so the two differ by the
    // literal `lineConnectivity: false` while describing an identical board.
    const explicitlyOff = generateBoard({
      seed: 'KELP-0007',
      size: 'Medium',
      difficulty: 'Deep',
      clues: { connectivity: true, lineTotals: true, lineConnectivity: false },
    })
    expect(explicitlyOff.cells).toEqual(off.cells)
    expect(explicitlyOff.lines).toEqual(off.lines)
    expect([...explicitlyOff.present].sort()).toEqual([...off.present].sort())
  })

  it('the annotation survives a serialization round-trip', () => {
    const board = annotated('KELP-0007')
    const back = deserializeBoard(serializeBoard(board))
    expect(back.lines).toEqual(board.lines)
  })
})
