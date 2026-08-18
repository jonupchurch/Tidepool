// Generation edge cases (T020): param validation, size extremes, no degenerate
// (all-water / all-rock) boards.
import type { BoardParams, ClueToggles } from './board'
import { generateBoard, rngSeedString } from './generate'
import { solve } from './solver'

const base: Omit<BoardParams, 'size' | 'difficulty'> = {
  seed: 'EDGE-0001',
  clues: { connectivity: true, lineTotals: true },
}

// ── The RNG seed string's segment order (Principle XI) ───────────────────────
//
// `rngSeedString` composes optional segments in a fixed order, and its comment
// has always said so. Until 018 nothing asserted it: a reordering would keep
// every other test green while silently regenerating every board that composes
// two optional mechanics. `fingerprints.test.ts` now catches that too, by hash;
// this catches it by name, so the failure says what actually broke.
describe('rngSeedString segment order', () => {
  const BASE_CLUES: ClueToggles = { connectivity: true, lineTotals: true }
  const p = (clues: ClueToggles, shape?: BoardParams['shape']): BoardParams => ({
    seed: 'COVE-0001',
    size: 'Medium',
    difficulty: 'Calm',
    clues,
    ...(shape ? { shape } : {}),
  })

  it('omits every optional segment by default', () => {
    expect(rngSeedString(p(BASE_CLUES), 3)).toBe('COVE-0001|Medium|Calm|c1l1|#3')
  })

  it('encodes the two always-present clue toggles', () => {
    expect(rngSeedString(p({ connectivity: false, lineTotals: false }), 0)).toBe(
      'COVE-0001|Medium|Calm|c0l0|#0',
    )
  })

  it('appends row annotations after the clue toggles', () => {
    expect(rngSeedString(p({ ...BASE_CLUES, lineConnectivity: true }), 3)).toBe(
      'COVE-0001|Medium|Calm|c1l1|lc1|#3',
    )
  })

  it('appends even/odd after row annotations', () => {
    expect(rngSeedString(p({ ...BASE_CLUES, evenOdd: true }), 3)).toBe(
      'COVE-0001|Medium|Calm|c1l1|eo1|#3',
    )
  })

  it('orders row annotations before even/odd when both are on', () => {
    expect(
      rngSeedString(p({ ...BASE_CLUES, lineConnectivity: true, evenOdd: true }), 3),
    ).toBe('COVE-0001|Medium|Calm|c1l1|lc1|eo1|#3')
  })

  it('appends a non-default shape last', () => {
    expect(rngSeedString(p(BASE_CLUES, 'atoll'), 3)).toBe(
      'COVE-0001|Medium|Calm|c1l1|s:atoll|#3',
    )
  })

  it('leaves the default shape out entirely', () => {
    expect(rngSeedString(p(BASE_CLUES, 'hex'), 3)).toBe(rngSeedString(p(BASE_CLUES), 3))
  })

  it('orders clue toggles BEFORE shape when both are present', () => {
    // The assertion the comment in generate.ts has always promised. If this
    // fails, every board composing two optional mechanics has just moved.
    expect(rngSeedString(p({ ...BASE_CLUES, lineConnectivity: true }, 'atoll'), 3)).toBe(
      'COVE-0001|Medium|Calm|c1l1|lc1|s:atoll|#3',
    )
  })

  it('composes all three optional segments in the pinned order', () => {
    expect(
      rngSeedString(p({ ...BASE_CLUES, lineConnectivity: true, evenOdd: true }, 'atoll'), 3),
    ).toBe('COVE-0001|Medium|Calm|c1l1|lc1|eo1|s:atoll|#3')
  })
})

describe('generateBoard validation', () => {
  it('throws on unknown size', () => {
    expect(() =>
      // @ts-expect-error — invalid tier on purpose
      generateBoard({ ...base, size: 'Huge', difficulty: 'Calm' }),
    ).toThrow(/size/)
  })

  it('throws on unknown difficulty', () => {
    expect(() =>
      // @ts-expect-error — invalid tier on purpose
      generateBoard({ ...base, size: 'Small', difficulty: 'Impossible' }),
    ).toThrow(/difficulty/)
  })

  it('throws on empty seed', () => {
    expect(() => generateBoard({ ...base, seed: '', size: 'Small', difficulty: 'Calm' })).toThrow(
      /seed/,
    )
  })
})

describe('generateBoard size extremes', () => {
  it('generates the smallest tier (~30+ cells)', () => {
    const board = generateBoard({ ...base, size: 'Small', difficulty: 'Calm' })
    expect(board.cells.size).toBeGreaterThanOrEqual(30)
    expect(solve(board).solved).toBe(true)
  })

  it('generates the largest tier (~150+ cells) and verifies', () => {
    const board = generateBoard({ ...base, seed: 'BIG-0001', size: 'Large', difficulty: 'Tricky' })
    expect(board.cells.size).toBeGreaterThanOrEqual(150)
    const res = solve(board)
    expect(res.solved).toBe(true)
    expect(res.unique).toBe(true)
  })
})

describe('generateBoard is never degenerate', () => {
  it('has a healthy mix of water and rock', () => {
    const board = generateBoard({ ...base, seed: 'MIX-0001', size: 'Medium', difficulty: 'Tricky' })
    let water = 0
    let rock = 0
    for (const c of board.cells.values()) c.state === 'water' ? water++ : rock++
    expect(water).toBeGreaterThan(0)
    expect(rock).toBeGreaterThan(0)
    const frac = water / board.cells.size
    expect(frac).toBeGreaterThan(0.15)
    expect(frac).toBeLessThan(0.85)
  })

  it('serves fewer clues than a fully-clued board (reduction happened)', () => {
    const board = generateBoard({ ...base, seed: 'MIN-0001', size: 'Medium', difficulty: 'Calm' })
    const givens = [...board.cells.values()].filter((c) => c.given).length
    const rocks = [...board.cells.values()].filter((c) => c.state === 'rock').length
    expect(givens).toBeLessThan(rocks) // not every rock is revealed
  })
})
