// Generation edge cases (T020): param validation, size extremes, no degenerate
// (all-water / all-rock) boards.
import type { BoardParams } from './board'
import { generateBoard } from './generate'
import { solve } from './solver'

const base: Omit<BoardParams, 'size' | 'difficulty'> = {
  seed: 'EDGE-0001',
  clues: { connectivity: true, lineTotals: true },
}

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
