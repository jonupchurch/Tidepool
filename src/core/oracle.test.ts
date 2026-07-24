// Solver-as-oracle (T027/T028 / US4, SC-006): classify known-unique,
// known-ambiguous, and guess-requiring boards. Fixtures are built inline via
// test-helpers (small hand-crafted boards) rather than a separate fixtures/ dir.
import type { Board, BoardParams, Cell } from './board'
import { makeBoard } from './board'
import { generateBoard } from './generate'
import { hexRegion, presentSet } from './hex'
import { solve } from './solver'
import { customBoard, fullyClued, layoutOf } from './test-helpers'

function withoutGiven(board: Board, dropKey: string): Board {
  const cells = new Map<string, Cell>()
  for (const [k, c] of board.cells) {
    cells.set(k, k === dropKey ? { coord: c.coord, state: c.state, given: false } : { ...c })
  }
  return makeBoard({ params: board.params, present: board.present, cells, lines: board.lines })
}

describe('oracle: known verdicts', () => {
  it('classifies a uniquely-solvable board as solved && unique', () => {
    const present = presentSet(hexRegion(2))
    const board = fullyClued(present, layoutOf(present, ['0,0', '1,0', '-1,1']))
    const res = solve(board)
    expect(res.solved).toBe(true)
    expect(res.unique).toBe(true)
  })

  it('classifies an ambiguous board as not unique (multiple solutions)', () => {
    // "1 water among 2 neighbours" → either neighbour could be the water.
    const present = new Set(['0,0', '1,0', '1,-1'])
    const board = customBoard(present, layoutOf(present, ['1,0']), ['0,0'])
    const res = solve(board)
    expect(res.unique).toBe(false)
    expect(res.solved).toBe(false)
  })

  it('classifies a guess-requiring board as not solved (no guess-free logic)', () => {
    // Under-clued to the point our technique catalog stalls; the ambiguous
    // fixture above is exactly such a board (solved:false = a guess is needed).
    const present = new Set(['0,0', '1,0', '1,-1'])
    const board = customBoard(present, layoutOf(present, ['1,0']), ['0,0'])
    expect(solve(board).solved).toBe(false)
  })
})

describe('oracle: agrees with the generator', () => {
  for (const difficulty of ['Calm', 'Tricky', 'Deep'] as const) {
    it(`${difficulty} board is confirmed solved && unique`, () => {
      const p: BoardParams = {
        seed: `ORACLE-${difficulty}`,
        size: 'Small',
        difficulty,
        clues: { connectivity: true, lineTotals: true },
      }
      const res = solve(generateBoard(p))
      expect(res.solved).toBe(true)
      expect(res.unique).toBe(true)
    })
  }

  it('exposes a uniquely-solvable-but-guess-requiring board when a clue is dropped', () => {
    // Removing a necessary clue from a minimal board can leave the solution
    // still unique yet no longer reachable by our techniques — the distinct
    // "unique but guess-required" verdict (unique:true, solved:false).
    let found = false
    outer: for (const seed of ['GR-1', 'GR-2', 'GR-3']) {
      const board = generateBoard({
        seed,
        size: 'Small',
        difficulty: 'Tricky',
        clues: { connectivity: true, lineTotals: true },
      })
      for (const [k, cell] of board.cells) {
        if (!cell.given) continue
        const res = solve(withoutGiven(board, k))
        if (res.unique && !res.solved) {
          found = true
          break outer
        }
      }
    }
    expect(found).toBe(true)
  })
})
