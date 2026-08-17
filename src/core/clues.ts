// clues.ts — compute clue values from a full water/rock layout: adjacency
// counts, local (Hexcells-style) connectivity from the fixed neighbour ring,
// and line/edge totals. Pure functions of the layout + present set.
import type { CellState, Connectivity, CountClue, Parity } from './board'
import type { Axial } from './hex'
import { DIRECTIONS, key } from './hex'

export type Layout = Map<string, CellState>

/** Water among the present neighbours of `coord`. */
export function waterNeighborCount(
  coord: Axial,
  layout: Layout,
  present: Set<string>,
): number {
  let n = 0
  for (const d of DIRECTIONS) {
    const nk = key({ q: coord.q + d.q, r: coord.r + d.r })
    if (present.has(nk) && layout.get(nk) === 'water') n++
  }
  return n
}

/** How many present neighbours `coord` has. */
export function presentNeighborCount(coord: Axial, present: Set<string>): number {
  let n = 0
  for (const d of DIRECTIONS) {
    if (present.has(key({ q: coord.q + d.q, r: coord.r + d.r }))) n++
  }
  return n
}

/** The 6 ring slots as booleans: present-and-water. Absent/rock are false. */
export function ringWater(coord: Axial, layout: Layout, present: Set<string>): boolean[] {
  return DIRECTIONS.map((d) => {
    const nk = key({ q: coord.q + d.q, r: coord.r + d.r })
    return present.has(nk) && layout.get(nk) === 'water'
  })
}

/** Number of maximal circular runs of `true` in a 6-slot ring. */
export function circularRuns(slots: boolean[]): number {
  const total = slots.filter(Boolean).length
  if (total === 0) return 0
  if (slots.every(Boolean)) return 1
  const start = slots.findIndex((s) => !s)
  let runs = 0
  let inRun = false
  for (let i = 0; i < slots.length; i++) {
    const s = slots[(start + i) % slots.length]
    if (s && !inRun) {
      runs++
      inRun = true
    } else if (!s) {
      inRun = false
    }
  }
  return runs
}

export function connectivityOf(slots: boolean[]): Connectivity {
  return circularRuns(slots) <= 1 ? 'connected' : 'split'
}

/**
 * Connectivity is informative only when it can distinguish arrangements:
 * 2 ≤ waterCount ≤ presentNeighbours − 2. Outside that, the water neighbours
 * are trivially a single arc (or empty), so annotating adds nothing.
 */
export function connectivityInformative(
  waterCount: number,
  presentNeighbors: number,
): boolean {
  return waterCount >= 2 && waterCount <= presentNeighbors - 2
}

/**
 * The adjacency clue for a (rock) cell. When `withConnectivity` and the count
 * is in the informative range, the `{}`/`--` annotation is attached.
 *
 * Returns a `CountClue` specifically, not the wider `AdjacencyClue` union:
 * generation always computes the exact count, and a clue only becomes a parity
 * clue later, in reduction, where the board is re-verified without the number.
 */
export function adjacencyClue(
  coord: Axial,
  layout: Layout,
  present: Set<string>,
  withConnectivity: boolean,
): CountClue {
  const count = waterNeighborCount(coord, layout, present)
  if (withConnectivity) {
    const pn = presentNeighborCount(coord, present)
    if (connectivityInformative(count, pn)) {
      return { count, connectivity: connectivityOf(ringWater(coord, layout, present)) }
    }
  }
  return { count }
}

// ── Parity: `E` / `O` in place of a count (018) ──────────────────────────────

export function parityOf(count: number): Parity {
  return count % 2 === 0 ? 'even' : 'odd'
}

/**
 * Whether a clue may be shown as parity instead of a count (018 FR-006).
 *
 * Two separate reasons to refuse, and they are not the same kind of reason.
 *
 * **It would withhold nothing.** With 0 present neighbours the count is always
 * 0, so the mark is unconditional. With exactly 1, the parity pins the count
 * exactly — even means 0 water, odd means 1 — so it is the same clue written
 * more strangely. From 2 upwards parity genuinely admits more than one count.
 *
 * **It would mislead.** Zero is even, so a `+` over a count of 0 is
 * mathematically correct and a trap in practice: nobody reads "an even number
 * of water tiles" and thinks *none*. A player ruling zero out would conclude at
 * least two neighbours are water, which is false — a wrong deduction reached by
 * sound-looking reasoning, which is precisely what this game promises cannot
 * happen. Measured before the rule went in: 2 of 126 parity clues across 18
 * boards hid a zero, so refusing them costs 1.6% of the mechanic and buys back
 * the rule "an even mark means two, four or six".
 *
 * Note the first reason asks a different question from `connectivityInformative`,
 * which decides whether an annotation *distinguishes arrangements*. Parity is
 * never uninformative about the layout; it is only ever uninformative because it
 * failed to hide anything.
 */
export function canShowParity(presentNeighbors: number, count: number): boolean {
  return presentNeighbors >= 2 && count > 0
}

/** Total water among a set of present cell keys. */
export function lineTotal(cells: string[], layout: Layout): number {
  let n = 0
  for (const k of cells) if (layout.get(k) === 'water') n++
  return n
}

// ── Row connectivity: `{n}` / `-n-` on a line total (010) ────────────────────

/**
 * Where a row's cells stop being physically adjacent.
 *
 * `linesOf()` returns a row's cells sorted along its axis, but on an irregular
 * board ([012]) the row can have holes in it, and two cells either side of a
 * hole are not neighbours. Returns, for each cell after the first, whether it
 * actually adjoins its predecessor.
 *
 * On a filled hexagon every row is contiguous and this is all `true` — so it
 * costs nothing today. It exists now so 010's semantics are already correct
 * when shapes arrive, rather than being retrofitted once boards can have gaps.
 */
export function lineAdjacency(cells: readonly string[], step: Axial): boolean[] {
  const out: boolean[] = []
  for (let i = 1; i < cells.length; i++) {
    const a = parseKeyLocal(cells[i - 1])
    const b = parseKeyLocal(cells[i])
    out.push(b.q - a.q === step.q && b.r - a.r === step.r)
  }
  return out
}

/** Local parse to keep this module free of a cyclic import back through hex. */
function parseKeyLocal(k: string): Axial {
  const i = k.indexOf(',')
  return { q: Number(k.slice(0, i)), r: Number(k.slice(i + 1)) }
}

/**
 * Maximal runs of water along a row. A stone ends a run; so does a gap, because
 * the cells either side of one don't touch (FR-003) — the same reason an absent
 * neighbour ends a run on an adjacency ring, where `ringWater` maps absent
 * slots to `false`.
 *
 * `water[i]` is whether cell i is water; `adjacent[i]` is whether cell i+1
 * physically adjoins cell i (as returned by `lineAdjacency`).
 */
export function lineRuns(water: readonly boolean[], adjacent: readonly boolean[]): number {
  let runs = 0
  let inRun = false
  for (let i = 0; i < water.length; i++) {
    if (!water[i]) {
      inRun = false
      continue
    }
    // A water cell continues the previous run only if it also touches it.
    if (inRun && adjacent[i - 1]) continue
    runs++
    inRun = true
  }
  return runs
}

export function lineConnectivityOf(
  water: readonly boolean[],
  adjacent: readonly boolean[],
): Connectivity {
  return lineRuns(water, adjacent) <= 1 ? 'connected' : 'split'
}

/**
 * Whether annotating this row says anything (FR-004).
 *
 * The adjacency clue uses a count window (`2 ≤ water ≤ neighbours − 2`) to
 * decide the same thing. That heuristic is right for a fixed 6-slot ring and
 * wrong for a row that can have holes: a row like `A B ▢ C D` admits both a
 * together and an apart arrangement at counts the window rejects, and a row of
 * two isolated segments is *forced* apart at counts it accepts.
 *
 * So this asks the exact question instead — are both values actually reachable
 * for this row at this total? — by enumerating arrangements and stopping the
 * moment both have been seen. The adjacency rule is deliberately left alone;
 * changing it would move every existing board.
 */
export function lineConnectivityInforms(
  length: number,
  total: number,
  adjacent: readonly boolean[],
): boolean {
  if (total < 2 || total > length - 1) return false // 0/1 water, or no room for a gap
  let sawConnected = false
  let sawSplit = false
  const water = new Array<boolean>(length).fill(false)

  const walk = (i: number, placed: number): boolean => {
    if (sawConnected && sawSplit) return true
    if (placed > total) return false
    if (length - i < total - placed) return false // can't still reach the total
    if (i === length) {
      if (placed !== total) return false
      if (lineRuns(water, adjacent) <= 1) sawConnected = true
      else sawSplit = true
      return sawConnected && sawSplit
    }
    water[i] = true
    if (walk(i + 1, placed + 1)) return true
    water[i] = false
    return walk(i + 1, placed)
  }

  walk(0, 0)
  return sawConnected && sawSplit
}
