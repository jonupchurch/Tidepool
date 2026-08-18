// reduce.ts — greedy, seeded clue reduction. Starting from a fully-clued board,
// remove clues in a seeded order, keeping a removal only if the board stays
// guess-free solvable. Result is a minimal board: removing any remaining clue
// breaks unique guess-free solvability (spec FR-008, SC-003).
import type { Board, Cell, LineClue, Technique } from './board'
import { hasParityFace, makeBoard } from './board'
import {
  type Layout,
  canFrameParity,
  canShowParity,
  connectivityOf,
  lineAdjacency,
  lineConnectivityOf,
  parityBudget,
  parityOf,
  presentNeighborCount,
  ringWater,
} from './clues'
import { AXIS_STEP, linesOf } from './hex'
import type { Rng } from './rng'
import { shuffle } from './rng'
import { ALL_TECHNIQUES, techniqueSolves } from './solver'

function cloneBoard(board: Board): Board {
  const cells = new Map<string, Cell>()
  for (const [k, c] of board.cells) cells.set(k, { ...c, ...(c.clue ? { clue: { ...c.clue } } : {}) })
  return makeBoard({
    params: board.params,
    present: board.present,
    cells,
    // Deep, not `.slice()`: reduction now clears a line's annotation in place,
    // and a shallow copy would reach back and mutate the caller's board.
    lines: board.lines.map((l) => ({ ...l })),
  })
}

type Item =
  | { kind: 'cell'; key: string }
  | { kind: 'line'; line: LineClue }
  /** Drop just the `{}`/`--` from a row, keeping its total (010). */
  | { kind: 'annotation'; line: LineClue }

/**
 * Reduce `board`'s clue set to a minimal one, preserving guess-free solvability
 * using only the `allowed` techniques (caps difficulty at the target tier).
 * Deterministic given the rng. Assumes the input board is fully clued and
 * already guess-free solvable within `allowed`.
 */
export function reduceClues(
  board: Board,
  rng: Rng,
  allowed: ReadonlySet<Technique> = ALL_TECHNIQUES,
): Board {
  const work = cloneBoard(board)

  const items: Item[] = []
  for (const [k, cell] of work.cells) {
    if (cell.given) items.push({ kind: 'cell', key: k })
  }
  for (const line of work.lines) items.push({ kind: 'line', line })
  // An annotated total is really two clues in one; offering the annotation for
  // removal on its own keeps "minimal" honest, rather than a board keeping a
  // `{4}` where a plain `4` would have done.
  //
  // DANGER: this list feeds a SEEDED shuffle, so adding items to it changes the
  // removal order and therefore every reduced board. It is safe only because an
  // annotated line can exist solely on a board whose clue toggles asked for one
  // — boards that predate 010 build the same list they always did. Guarded by
  // fingerprints.test.ts.
  for (const line of work.lines) {
    if (line.connectivity) items.push({ kind: 'annotation', line })
  }
  shuffle(rng, items)

  runRemovals(items, work, allowed)
  if (board.params.clues.evenOdd) weakenToParity(work, rng, allowed)

  return work
}

function runRemovals(items: Item[], work: Board, allowed: ReadonlySet<Technique>): void {
  for (const item of items) {
    if (item.kind === 'cell') {
      const cell = work.cells.get(item.key)!
      const savedClue = cell.clue
      cell.given = false
      cell.clue = undefined
      if (!techniqueSolves(work, allowed).solved) {
        cell.given = true
        cell.clue = savedClue
      }
    } else if (item.kind === 'annotation') {
      const saved = item.line.connectivity
      if (!saved) continue // the whole line already went
      item.line.connectivity = undefined
      if (!techniqueSolves(work, allowed).solved) item.line.connectivity = saved
    } else {
      const idx = work.lines.indexOf(item.line)
      if (idx === -1) continue
      work.lines.splice(idx, 1)
      if (!techniqueSolves(work, allowed).solved) work.lines.splice(idx, 0, item.line)
    }
  }
}

/**
 * Weaken surviving clues from a count to a parity mark (018), framed or bare
 * (019).
 *
 * **A three-rung ladder, weakest first** (019 FR-007): bare parity, then framed
 * parity, then keep the number. The order is load-bearing rather than tidy.
 * Framed parity survives on ~58% of ring clues where bare parity manages ~35%,
 * so trying the stronger form first would make the plain number the rare form
 * and turn a Large board into mush. Preferring to withhold the most is what
 * keeps numbers on the board.
 *
 * **FR-004 comes free, and more strictly than a rule could give it.** The spec
 * asks that a framing only be attached where it distinguishes something. Rung 2
 * is reached only when rung 1 has already FAILED, so a framing that told the
 * solver nothing new would leave the board exactly as unsolvable as the bare
 * mark did, and the ladder would fall through to the number. The framing
 * therefore survives only when it did real work — which is stronger than
 * "both arrangements are achievable", and needs no separate informativeness
 * heuristic on the parity path. (`connectivityInformative` still governs the
 * count path, untouched, because changing it would move every board in
 * existence — the same reason 010 left it alone.)
 *
 * This runs AFTER the removal loop, over the clues that survived it, rather than
 * adding a fourth item kind to the seeded shuffle above. That is the whole
 * safety argument: the existing item list and its shuffle are untouched for
 * every board, because a board without `evenOdd` never calls this function.
 * Adding shuffle items would instead have required arguing about removal order,
 * which is the highest-consequence RNG consumer in the codebase.
 *
 * Every clue here has already been proved necessary as an exact count, so this
 * asks a strictly different question: is the *parity* enough? Measured across
 * 284 clues on 15 Deep boards, about a third are — and deleting those same
 * clues outright instead succeeds zero times, which is what shows the parity is
 * carrying the deduction rather than the clue having been redundant.
 */
function weakenToParity(work: Board, rng: Rng, allowed: ReadonlySet<Technique>): void {
  // Deep-tier only, enforced HERE and not merely upstream. Measured: without
  // this, Calm and Tricky boards grew E/O clues even though `parity` is not in
  // their technique set. The reason is subtle — weakening keeps `given: true`,
  // so the cell still tells the solver "this is a rock" even after its count
  // constraint is gone. A clue the removal loop kept for its *reveal* rather
  // than its *count* therefore survives weakening at any tier.
  if (!allowed.has('parity')) return

  // Ground truth, for computing a framing that is actually true of the board.
  // Reduction has always had this available — every cell carries its solution
  // state — it simply never needed to look before 019.
  const layout: Layout = new Map()
  for (const [k, cell] of work.cells) layout.set(k, cell.state)

  const keys: string[] = []
  for (const [k, cell] of work.cells) {
    if (cell.given && cell.clue && !hasParityFace(cell.clue)) keys.push(k)
  }
  shuffle(rng, keys)

  // How many of these stones may end up withholding their count (022). Nothing
  // here is a mark yet, so `keys.length` IS this site's clue total, and the
  // removal loop has already finished — the denominator cannot move underneath
  // the budget. See `parityBudget` for why a third, and why per site.
  const budget = parityBudget(keys.length)
  let marks = 0

  for (const k of keys) {
    // Spending the budget stops the pass rather than skipping an entry. Every
    // remaining clue keeps its exact count, which is the strictly stronger clue,
    // so a board can only become MORE solvable — the cap cannot make one
    // unsolvable, and it cannot make one ambiguous. It also skips the rest of
    // the `techniqueSolves` calls, which are the expensive part of generation.
    if (marks >= budget) break
    const cell = work.cells.get(k)!
    const saved = cell.clue
    if (!saved || hasParityFace(saved)) continue
    // Only weaken where parity both withholds something and does not mislead
    // (FR-006) — see `canShowParity`. In particular a count of zero never
    // becomes a mark: zero is even, but nobody reads `●●` as "none".
    if (!canShowParity(presentNeighborCount(cell.coord, work.present), saved.count)) continue

    // Is the clue's VALUE doing any work, or is the board carried by the bare
    // fact that this cell is a revealed rock? Strip the clue while leaving the
    // reveal: if it still solves, then `E`/`O` here would be decorative — true,
    // but teaching nothing — so keep the count rather than dress up a clue that
    // says nothing. Without this, roughly a quarter of the parity clues on a
    // board are ornaments, which is both dishonest and needless density.
    cell.clue = undefined
    if (techniqueSolves(work, allowed).solved) {
      cell.clue = saved
      continue
    }

    // Rung 1: the weakest form there is — the parity alone, unframed.
    cell.clue = { parity: parityOf(saved.count) }
    if (techniqueSolves(work, allowed).solved) {
      marks++
      continue
    }

    // Rung 2: the parity, framed. Says strictly more than a bare mark and
    // strictly less than a number, so it belongs exactly here in the order.
    // Only where the board's own toggle asked for `{}`/`--` at all — a player
    // who turned that vocabulary off should not meet it wearing a new face —
    // and only over a count big enough for "one run" to mean anything
    // (`canFrameParity`, FR-013).
    if (work.params.clues.connectivity && canFrameParity(saved.count)) {
      cell.clue = {
        parity: parityOf(saved.count),
        connectivity: connectivityOf(ringWater(cell.coord, layout, work.present)),
      }
      if (techniqueSolves(work, allowed).solved) {
        marks++
        continue
      }
    }

    cell.clue = saved
  }

  weakenLinesToParity(work, rng, allowed, layout)
}

/**
 * The same question, asked of a row's total (019).
 *
 * Measured before designing, the same way 018's was: across 5 seeds x 3 sizes at
 * Deep, 81 of 202 already-minimal edge totals still solve when reduced to their
 * parity — with the delete-control at 0 of 202, so every one of those 81 is
 * carrying real parity information rather than having been redundant.
 *
 * **This refutes the reasoning that made it a non-goal in 018.** That plan
 * argued the parity technique only fires when a single cell is unsettled, which
 * on a 13-cell row means waiting for twelve — so edge parity would be nearly
 * useless. Sound reasoning, wrong conclusion: rows *are* heavily settled by ring
 * clues late in a solve, and the exact total's marginal value over its parity is
 * frequently just the final cell.
 *
 * One thing here is simpler than the cell case, and it is worth saying why. A
 * cell clue has a *reveal* side-effect — `given: true` says "this is a stone"
 * even once the clue's value is gone — so 018 needed a decorative check to tell
 * a clue that was doing work from one the reveal was carrying. A line clue has
 * no such side-effect: it is nothing but its value. So the removal loop's
 * verdict is trustworthy on its own, and the measurement's delete-control was
 * clean for the same reason.
 */
function weakenLinesToParity(
  work: Board,
  rng: Rng,
  allowed: ReadonlySet<Technique>,
  layout: Layout,
): void {
  // Row cells, for the length test and the framing below. Rebuilt here rather
  // than threaded through: reduction is already the expensive part of generation
  // by orders of magnitude, and this is one pass over the topology.
  const rowCells = new Map<string, string[]>()
  for (const ln of linesOf(work.present)) rowCells.set(`${ln.axis},${ln.index}`, ln.cells)

  // A separate shuffle from the cells above, and a second RNG draw. Safe for the
  // same reason the first one is: a board without `evenOdd` never reaches this
  // function at all, so no board that predates the mechanic sees either draw.
  const candidates = work.lines.filter((l) => !hasParityFace(l))
  shuffle(rng, candidates)

  // This site's own budget (022), deliberately not shared with the stones'.
  // A single combined total would let a hot rim spend the tiles' share, and the
  // two sites are read differently enough that "a third of the board" is not
  // the same promise as "a third of what you read around the edge".
  const budget = parityBudget(work.lines.length)
  let marks = 0

  for (const line of candidates) {
    if (marks >= budget) break
    const idx = work.lines.indexOf(line)
    if (idx === -1 || hasParityFace(line)) continue
    const cells = rowCells.get(`${line.axis},${line.index}`)
    if (cells === undefined) continue
    // The same two refusals as a stone (018 FR-006), read for a row: with fewer
    // than two cells the parity pins the total exactly, and a row holding no
    // water must never read `●●`. Zero is even, but nobody reads an even mark as
    // "none" — they read it as two-or-four, and rule out the truth.
    if (!canShowParity(cells.length, line.count)) continue

    const site = { axis: line.axis, index: line.index, from: line.from }
    const parity = parityOf(line.count)

    // Rung 1: the weakest form there is — the parity alone, with any framing
    // dropped as well.
    work.lines[idx] = { ...site, parity }
    if (techniqueSolves(work, allowed).solved) {
      marks++
      continue
    }

    // Rung 2: the parity, framed. Gated on the row-annotation toggle for the
    // same reason the tile rung is gated on its own: a player with edge hints
    // off has said they do not want braced row clues, and `{●●}` is a braced row
    // clue however it got there. And on `canFrameParity` for the same reason a
    // stone is — a row of one water tile is not "one unbroken run" either, and
    // over a whole row the wrong inference is bigger, not smaller.
    if (work.params.clues.lineConnectivity && canFrameParity(line.count)) {
      const water = cells.map((k) => layout.get(k) === 'water')
      const adjacent = lineAdjacency(cells, AXIS_STEP[line.axis])
      work.lines[idx] = { ...site, parity, connectivity: lineConnectivityOf(water, adjacent) }
      if (techniqueSolves(work, allowed).solved) {
        marks++
        continue
      }
    }

    work.lines[idx] = line
  }
}
