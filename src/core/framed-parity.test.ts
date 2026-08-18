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
import type { Connectivity, Parity } from './board'
import { circularRuns, lineRuns } from './clues'
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

// ── The ring: `{+}` / `-+-` on a stone ───────────────────────────────────────

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

// ── The row: `{+}` / `-+-` on an edge total ──────────────────────────────────

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
