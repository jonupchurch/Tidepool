// SC-002 / Constitution XI — every shipped curated seed regenerates a
// byte-identical, uniquely-solvable board at its stated difficulty. (The CI
// oracle in scripts/validate-curated.ts enforces the same guarantee pre-ship.)
import { describe, expect, it } from 'vitest'
import { generateBoard, serializeBoard, solve } from '@/core'
import { loadCuratedPack } from './curated'
import { toBoardParams } from './request'

describe('curated manifest determinism', () => {
  const pack = loadCuratedPack()

  for (const entry of pack.entries) {
    it(`${entry.id} (${entry.seed}, ${entry.size}/${entry.difficulty}) is unique + regenerates identically`, () => {
      const params = toBoardParams({ seed: entry.seed, size: entry.size, difficulty: entry.difficulty })
      const board = generateBoard(params)
      const result = solve(board)
      expect(result.solved, 'solvable').toBe(true)
      expect(result.unique, 'uniquely solvable (guess-free)').toBe(true)
      expect(result.rating, 'rated at its stated difficulty').toBe(entry.difficulty)
      // Byte-identical on regeneration (determinism).
      expect(serializeBoard(generateBoard(params))).toBe(serializeBoard(board))
    })
  }
})
