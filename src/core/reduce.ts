// reduce.ts — greedy, seeded clue reduction. Starting from a fully-clued board,
// remove clues in a seeded order, keeping a removal only if the board stays
// guess-free solvable. Result is a minimal board: removing any remaining clue
// breaks unique guess-free solvability (spec FR-008, SC-003).
import type { Board, Cell, LineClue, Technique } from './board'
import { hasParityFace, makeBoard } from './board'
import { canShowParity, parityOf, presentNeighborCount } from './clues'
import { linesOf } from './hex'
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
 * Weaken surviving clues from a count to `E`/`O` (018).
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

  const keys: string[] = []
  for (const [k, cell] of work.cells) {
    if (cell.given && cell.clue && !hasParityFace(cell.clue)) keys.push(k)
  }
  shuffle(rng, keys)

  for (const k of keys) {
    const cell = work.cells.get(k)!
    const saved = cell.clue
    if (!saved || hasParityFace(saved)) continue
    // Only weaken where parity both withholds something and does not mislead
    // (FR-006) — see `canShowParity`. In particular a count of zero never
    // becomes a mark: zero is even, but nobody reads `+` as "none".
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

    cell.clue = { parity: parityOf(saved.count) }
    if (!techniqueSolves(work, allowed).solved) cell.clue = saved
  }

  weakenLinesToParity(work, rng, allowed)
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
function weakenLinesToParity(work: Board, rng: Rng, allowed: ReadonlySet<Technique>): void {
  // Row cells, for the length test below. Rebuilt here rather than threaded
  // through: reduction is already the expensive part of generation by orders of
  // magnitude, and this is one pass over the topology.
  const rowCells = new Map<string, number>()
  for (const ln of linesOf(work.present)) rowCells.set(`${ln.axis},${ln.index}`, ln.cells.length)

  // A separate shuffle from the cells above, and a second RNG draw. Safe for the
  // same reason the first one is: a board without `evenOdd` never reaches this
  // function at all, so no board that predates the mechanic sees either draw.
  const candidates = work.lines.filter((l) => !hasParityFace(l))
  shuffle(rng, candidates)

  for (const line of candidates) {
    const idx = work.lines.indexOf(line)
    if (idx === -1 || hasParityFace(line)) continue
    const length = rowCells.get(`${line.axis},${line.index}`)
    if (length === undefined) continue
    // The same two refusals as a stone (018 FR-006), read for a row: with fewer
    // than two cells the parity pins the total exactly, and a row holding no
    // water must never read `+`. Zero is even, but nobody reads an even mark as
    // "none" — they read it as two-or-four, and rule out the truth.
    if (!canShowParity(length, line.count)) continue

    // Rung 1 of the ladder: the weakest form there is — the parity alone, with
    // any framing dropped as well. Weakest-first is FR-007, and it is what keeps
    // numbers on the board.
    work.lines[idx] = { axis: line.axis, index: line.index, from: line.from, parity: parityOf(line.count) }
    if (!techniqueSolves(work, allowed).solved) work.lines[idx] = line
  }
}
