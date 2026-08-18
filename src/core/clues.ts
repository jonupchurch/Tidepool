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
 * `governedCells` is however many cells the clue speaks about: a stone's present
 * neighbours, or — since 019 — a row's length. The two readings are the same
 * question, which is why they share a rule rather than each growing their own.
 *
 * Two separate reasons to refuse, and they are not the same kind of reason.
 *
 * **It would withhold nothing.** With 0 governed cells the count is always 0, so
 * the mark is unconditional. With exactly 1, the parity pins the count exactly —
 * even means 0 water, odd means 1 — so it is the same clue written more
 * strangely. From 2 upwards parity genuinely admits more than one count.
 *
 * **It would mislead.** Zero is even, so a `●●` over a count of 0 is
 * mathematically correct and a trap in practice: nobody reads "an even number
 * of water tiles" and thinks *none*. A player ruling zero out would conclude at
 * least two neighbours are water, which is false — a wrong deduction reached by
 * sound-looking reasoning, which is precisely what this game promises cannot
 * happen. Measured before the rule went in: 2 of 126 parity clues across 18
 * boards hid a zero, so refusing them costs 1.6% of the mechanic and buys back
 * the rule "an even mark means two, four or six". It holds identically on a row,
 * where an empty row reading `●●` would be the same trap over a longer span.
 *
 * Note the first reason asks a different question from `connectivityInformative`,
 * which decides whether an annotation *distinguishes arrangements*. Parity is
 * never uninformative about the layout; it is only ever uninformative because it
 * failed to hide anything.
 */
export function canShowParity(governedCells: number, count: number): boolean {
  return governedCells >= 2 && count > 0
}

/** Below this, "one unbroken run" / "split apart" describes too little to say. */
const MIN_FRAMED_PARITY = 3

/**
 * Whether a parity mark may additionally carry `{}` / `--` (019 FR-013).
 *
 * The zero rule again, one step along. A framing over a *known* count is read
 * against that count: `{2}` says two tiles, side by side, and there is nothing
 * to misread. A framing over a *withheld* count has to be read on its own — and
 * "the water is all in one unbroken run", said about an unknown number of tiles,
 * is not how anybody describes a single tile. A player meeting `{●}` naturally
 * takes the run to be more than one tile and rules out 1, concluding 3 or 5.
 * If the truth was 1 they have just made a wrong deduction by sound-looking
 * reasoning, which is the one thing this game promises cannot happen.
 *
 * The same stretch, on the other framing: `-●●-` over a true 2 is two lonely
 * tiles being called two runs.
 *
 * So a framed mark needs a count that makes both words honest — three or more.
 * In practice that means `{●}` / `-●-` are three or five, and `{●●}` / `-●●-` are
 * four or six, which is also what a player will infer from them.
 *
 * **Deliberately NOT applied to counting clues.** `{2}` stays legal and always
 * has been, because the count is right there and does the disambiguating. The
 * rule exists for clues that withheld it. (Applying it to counts would also
 * regenerate every board in existence, which is the same reason 010's
 * `connectivityInformative` heuristic is left alone.)
 */
export function canFrameParity(count: number): boolean {
  return count >= MIN_FRAMED_PARITY
}

/**
 * The most of one clue site that may withhold its number (022, retuned by 024).
 *
 * Above this the marks stop reading as an accent on a board of numbers and start
 * reading as the board's own language, which is a different and much harder game
 * than the one the tier promises — and the numbers are what a player counts
 * *from*.
 *
 * Measured before 022 chose a number, per board and across every silhouette: the
 * weakening ladder was leaving **47% of stones and 39% of edge numbers** as marks
 * on average, and the worst board in a 50-board sweep showed marks on **86% of
 * its stones**. The pooled average looked survivable and the individual boards
 * were not, which is the whole lesson — see the density test in
 * `framed-parity.test.ts`.
 *
 * **Why this is a dial and not an emergent number (024).** The ladder wants to
 * weaken far past any cap worth setting: measured at 1/3, **95% of boards spent
 * their stone budget exactly and 86% spent their edge budget**. The cap is the
 * binding constraint on essentially every board, so what a player sees is set
 * here and nowhere else, and it moves very nearly 1:1 with this constant.
 *
 * 022 set it to 1/3, which measured out at 30.0% of all clues wearing a mark.
 * Jon played it and said that was still too many; 024 halved the result to
 * **15.4%**, and the constant that lands there is 0.19 rather than 0.15 —
 * `floor` costs roughly four points on the way through. **The number to hold
 * steady is the measured density, not this constant**; if the ladder or the
 * clue counts ever change, retune here and re-measure rather than assuming 0.19
 * still means 15%.
 *
 * **Per site, not per board.** One combined budget would let a hot row of edge
 * numbers spend the stones' share, and the two are read differently: a stone
 * governs six neighbours, an edge number governs a whole line. A board that is
 * all numbers on its tiles and all marks around its rim is lopsided in a way a
 * single total cannot express.
 *
 * `floor`, so a site is never rounded UP into its cap — the ceiling is a
 * promise, and 2 of 5 is not a fifth. **At 0.19 that rounds a site of five or
 * fewer clues down to no marks at all**, which is deliberate and was Jon's call
 * (024): a small silhouette showing every count is the honest reading of a
 * ceiling, and the alternative — a floor of one mark — would put a 5-clue site
 * at 20%, above its own cap. Roughly 1 board in 100 therefore carries no parity
 * mark anywhere even with the toggle on; the density test pins that rate so it
 * cannot drift into "the cap emptied the mechanic".
 */
const MAX_PARITY_SHARE = 0.19

export function parityBudget(clueCount: number): number {
  return Math.floor(clueCount * MAX_PARITY_SHARE)
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
