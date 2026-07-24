// Clue-reduction minimality (T030/T033 / US5, SC-003): removing ANY single
// present clue breaks guess-free solvability under the board's difficulty gate.
import type { Board, Cell, DifficultyTier, LineClue } from './board'
import { makeBoard } from './board'
import { allowedTechniquesFor } from './difficulty'
import { generateBoard } from './generate'
import { techniqueSolves } from './solver'

function dropCell(board: Board, k: string): Board {
  const cells = new Map<string, Cell>()
  for (const [key, c] of board.cells) {
    cells.set(key, key === k ? { coord: c.coord, state: c.state, given: false } : { ...c })
  }
  return makeBoard({ params: board.params, present: board.present, cells, lines: board.lines })
}

function dropLine(board: Board, line: LineClue): Board {
  return makeBoard({
    params: board.params,
    present: board.present,
    cells: board.cells,
    lines: board.lines.filter((l) => l !== line),
  })
}

describe('reduction minimality', () => {
  for (const difficulty of ['Calm', 'Tricky', 'Deep'] as DifficultyTier[]) {
    it(`every clue on a ${difficulty} board is necessary`, () => {
      const board = generateBoard({
        seed: `MINIMAL-${difficulty}`,
        size: 'Small',
        difficulty,
        clues: { connectivity: true, lineTotals: true },
      })
      const gate = allowedTechniquesFor(difficulty)

      // Sanity: the served board IS solvable within its gate.
      expect(techniqueSolves(board, gate).solved).toBe(true)

      // Removing any single given clue breaks gated solvability.
      for (const [k, cell] of board.cells) {
        if (!cell.given) continue
        expect(techniqueSolves(dropCell(board, k), gate).solved, `dropping cell ${k}`).toBe(false)
      }

      // Removing any single line clue breaks gated solvability.
      for (const line of board.lines) {
        expect(
          techniqueSolves(dropLine(board, line), gate).solved,
          `dropping line ${line.axis},${line.index}`,
        ).toBe(false)
      }
    })
  }
})
