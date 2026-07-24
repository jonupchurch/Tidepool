// Performance (T034 / SC-005): a large board generates + fully verifies within
// the background-generation budget (target ~2s on a typical desktop). Generous
// ceiling here to stay non-flaky across CI hardware while still guarding the
// order of magnitude.
import type { BoardParams, DifficultyTier } from './board'
import { generateBoard } from './generate'
import { solve } from './solver'

const BUDGET_MS = 2000

function params(seed: string, difficulty: DifficultyTier): BoardParams {
  return { seed, size: 'Large', difficulty, clues: { connectivity: true, lineTotals: true } }
}

describe('performance', () => {
  for (const difficulty of ['Calm', 'Tricky', 'Deep'] as DifficultyTier[]) {
    it(`Large/${difficulty} generates + verifies under ${BUDGET_MS}ms`, () => {
      const t0 = performance.now()
      const board = generateBoard(params(`PERF-${difficulty}`, difficulty))
      const res = solve(board)
      const elapsed = performance.now() - t0

      expect(board.cells.size).toBeGreaterThanOrEqual(150)
      expect(res.solved && res.unique).toBe(true)
      expect(elapsed).toBeLessThan(BUDGET_MS)
    })
  }
})
