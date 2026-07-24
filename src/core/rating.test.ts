// Rating fidelity (T026 / US3, SC-004): ≥95% of a sampled batch per tier are
// rated at the requested tier, and harder tiers require more advanced deduction.
import type { BoardParams, DifficultyTier, SizeTier } from './board'
import { generateBoard } from './generate'
import { solve } from './solver'

const SIZES: SizeTier[] = ['Small', 'Medium']
const DIFFICULTIES: DifficultyTier[] = ['Calm', 'Tricky', 'Deep']
const PER_SIZE = 10

function params(seed: string, size: SizeTier, difficulty: DifficultyTier): BoardParams {
  return { seed, size, difficulty, clues: { connectivity: true, lineTotals: true } }
}

describe('rating fidelity', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`≥95% of ${difficulty} boards are rated ${difficulty}`, () => {
      let total = 0
      let match = 0
      for (const size of SIZES) {
        for (let i = 0; i < PER_SIZE; i++) {
          const board = generateBoard(params(`RATE-${size}-${i}`, size, difficulty))
          const res = solve(board)
          expect(res.solved && res.unique).toBe(true) // never serve an invalid board
          total++
          if (res.rating === difficulty) match++
        }
      }
      expect(match / total).toBeGreaterThanOrEqual(0.95)
    })
  }

  it('harder tiers require more advanced techniques', () => {
    const rank = { 'forced-count': 0, 'line-total': 1, 'subset-overlap': 1, connectivity: 2 }
    const hardest = (difficulty: DifficultyTier) => {
      const res = solve(generateBoard(params(`CMP-${difficulty}`, 'Medium', difficulty)))
      return Math.max(...res.techniquesUsed.map((t) => rank[t]))
    }
    expect(hardest('Calm')).toBeLessThanOrEqual(hardest('Tricky'))
    expect(hardest('Tricky')).toBeLessThanOrEqual(hardest('Deep'))
    expect(hardest('Deep')).toBe(2) // Deep genuinely needs connectivity
  })
})
