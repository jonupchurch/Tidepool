// Determinism (T021 / US2, SC-001): identical params → byte-identical board,
// across independent generation runs (no shared/global state).
import type { BoardParams, DifficultyTier, SizeTier } from './board'
import { generateBoard } from './generate'
import { serializeBoard } from './serialize'

function params(seed: string, size: SizeTier, difficulty: DifficultyTier): BoardParams {
  return { seed, size, difficulty, clues: { connectivity: true, lineTotals: true } }
}

describe('generation determinism', () => {
  const cases: BoardParams[] = [
    params('CORAL-4417', 'Small', 'Calm'),
    params('KELP-0007', 'Medium', 'Tricky'),
    params('TIDE-1234', 'Small', 'Deep'),
  ]

  for (const p of cases) {
    it(`${p.size}/${p.difficulty} reproduces byte-for-byte`, () => {
      const a = serializeBoard(generateBoard(p))
      const b = serializeBoard(generateBoard(p))
      expect(a).toBe(b)
    })
  }

  it('different seeds produce different boards', () => {
    const a = serializeBoard(generateBoard(params('SEED-AAAA', 'Small', 'Tricky')))
    const b = serializeBoard(generateBoard(params('SEED-BBBB', 'Small', 'Tricky')))
    expect(a).not.toBe(b)
  })

  it('the clue toggles are part of the reproducible key', () => {
    const withConn = generateBoard({
      seed: 'SAME-0001',
      size: 'Small',
      difficulty: 'Tricky',
      clues: { connectivity: true, lineTotals: true },
    })
    const withoutConn = generateBoard({
      seed: 'SAME-0001',
      size: 'Small',
      difficulty: 'Tricky',
      clues: { connectivity: false, lineTotals: true },
    })
    expect(serializeBoard(withConn)).not.toBe(serializeBoard(withoutConn))
  })
})
