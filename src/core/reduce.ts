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
    lines: board.lines.slice(),
  })
}

type Item = { kind: 'cell'; key: string } | { kind: 'line'; line: LineClue }

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
    } else {
      const idx = work.lines.indexOf(item.line)
      if (idx === -1) continue
      work.lines.splice(idx, 1)
      if (!techniqueSolves(work, allowed).solved) work.lines.splice(idx, 0, item.line)
    }
  }

  return work
}
