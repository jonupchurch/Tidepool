// reduce.ts — greedy, seeded clue reduction. Starting from a fully-clued board,
// remove clues in a seeded order, keeping a removal only if the board stays
// guess-free solvable. Result is a minimal board: removing any remaining clue
// breaks unique guess-free solvability (spec FR-008, SC-003).
import type { Board, Cell, LineClue, Technique } from './board'
import { makeBoard } from './board'
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

  return work
}
