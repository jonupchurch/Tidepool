// Generation contract test (T016) — the hard guarantee (SC-002): every
// generated board is guess-free solvable AND uniquely solvable, across a
// sampled size × difficulty matrix. Rating fidelity is checked separately in
// rating.test.ts (SC-004, a ≥95% property).
import type { BoardParams, DifficultyTier, SizeTier } from './board'
import { hasParityFace } from './board'
import { generateBoard } from './generate'
import { solve } from './solver'

const SIZES: SizeTier[] = ['Small', 'Medium']
const DIFFICULTIES: DifficultyTier[] = ['Calm', 'Tricky', 'Deep']

function params(seed: string, size: SizeTier, difficulty: DifficultyTier): BoardParams {
  return { seed, size, difficulty, clues: { connectivity: true, lineTotals: true } }
}

describe('generateBoard contract', () => {
  for (const size of SIZES) {
    for (const difficulty of DIFFICULTIES) {
      for (const s of [1, 2, 3]) {
        it(`${size}/${difficulty} #${s} is solved && unique`, () => {
          const board = generateBoard(params(`CONTRACT-${s}`, size, difficulty))
          const res = solve(board)
          expect(res.solved).toBe(true)
          expect(res.unique).toBe(true)
          expect(res.contradiction).toBeUndefined()
          // every cell has a resolved ground-truth state
          for (const cell of board.cells.values()) {
            expect(cell.state === 'water' || cell.state === 'rock').toBe(true)
          }
        })
      }
    }
  }

  it('disables a clue type when its toggle is off (connectivity)', () => {
    const board = generateBoard({
      seed: 'NOCONN-1',
      size: 'Small',
      difficulty: 'Tricky',
      clues: { connectivity: false, lineTotals: true },
    })
    for (const cell of board.cells.values()) {
      // No parity clues here either — `evenOdd` is off, so every clue is a count.
      expect(cell.clue && !hasParityFace(cell.clue) ? cell.clue.connectivity : undefined).toBeUndefined()
    }
    expect(solve(board).solved).toBe(true)
  })

  it('disables line clues when lineTotals is off', () => {
    const board = generateBoard({
      seed: 'NOLINE-1',
      size: 'Small',
      difficulty: 'Calm',
      clues: { connectivity: true, lineTotals: false },
    })
    expect(board.lines).toHaveLength(0)
    expect(solve(board).solved).toBe(true)
  })
})
