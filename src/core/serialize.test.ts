// Serialization tests (T015): canonical round-trip + seed code parse/format.
import { deserializeBoard, formatSeed, parseSeed, serializeBoard } from './serialize'
import { hasParityFace } from './board'
import { generateBoard } from './generate'
import { hexRegion, presentSet } from './hex'
import { fullyClued, layoutOf } from './test-helpers'

describe('board serialization', () => {
  const present = presentSet(hexRegion(2))
  const layout = layoutOf(present, ['0,0', '1,0', '-1,1'])
  const board = fullyClued(present, layout)

  it('round-trips deep-equal', () => {
    expect(deserializeBoard(serializeBoard(board))).toEqual(board)
  })

  it('is stable (same board → identical string)', () => {
    expect(serializeBoard(board)).toBe(serializeBoard(board))
  })

  it('serialize∘deserialize∘serialize is a fixed point', () => {
    const s = serializeBoard(board)
    expect(serializeBoard(deserializeBoard(s))).toBe(s)
  })
})

describe('parity clues (018)', () => {
  it('round-trips a parity clue without inventing a count', () => {
    const board = generateBoard({
      seed: 'CORAL-4417',
      size: 'Small',
      difficulty: 'Deep',
      clues: { connectivity: true, lineTotals: true, evenOdd: true },
    })
    const back = deserializeBoard(serializeBoard(board))
    expect(serializeBoard(back)).toBe(serializeBoard(board))

    const parity = [...back.cells.values()].filter((c) => c.clue && hasParityFace(c.clue))
    expect(parity.length).toBeGreaterThan(0)
    for (const cell of parity) {
      // The count must be genuinely absent, not merely hidden — a serialized
      // board that still carried it would let the number leak back out.
      expect(cell.clue).not.toHaveProperty('count')
      expect(['even', 'odd']).toContain((cell.clue as { parity: string }).parity)
    }
  })

  it('decodes every clue-face form the format has ever written', () => {
    // Slot 3 widened from `number?` to `(number | 'e' | 'o')?` in 018. Tuples
    // written before that are all numbers, and must decode exactly as before.
    const legacy = JSON.stringify({
      v: 1,
      params: {
        seed: 'COVE-0001',
        size: 'Small',
        difficulty: 'Calm',
        clues: { connectivity: true, lineTotals: true },
      },
      cells: [
        ['0,0', 'r', 1, 3],
        ['1,0', 'r', 1, 2, 'c'],
        ['0,1', 'r', 1, 4, 's'],
        ['1,-1', 'w', 0],
        ['-1,0', 'r', 1, 'e'],
        ['-1,1', 'r', 1, 'o'],
      ],
      lines: [],
    })
    const board = deserializeBoard(legacy)
    expect(board.cells.get('0,0')?.clue).toEqual({ count: 3 })
    expect(board.cells.get('1,0')?.clue).toEqual({ count: 2, connectivity: 'connected' })
    expect(board.cells.get('0,1')?.clue).toEqual({ count: 4, connectivity: 'split' })
    expect(board.cells.get('1,-1')?.clue).toBeUndefined()
    expect(board.cells.get('-1,0')?.clue).toEqual({ parity: 'even' })
    expect(board.cells.get('-1,1')?.clue).toEqual({ parity: 'odd' })
  })
})

describe('seed codes', () => {
  it('formats to upper-case trimmed form', () => {
    expect(formatSeed('  coral-4417 ')).toBe('CORAL-4417')
  })

  it('parses valid WORD-NNNN codes', () => {
    expect(parseSeed('coral-4417')).toBe('CORAL-4417')
    expect(parseSeed(' KELP-7 ')).toBe('KELP-7')
  })

  it('rejects malformed codes', () => {
    expect(parseSeed('coral')).toBeNull()
    expect(parseSeed('coral-')).toBeNull()
    expect(parseSeed('123-456')).toBeNull()
    expect(parseSeed('coral-12345')).toBeNull() // too many digits
  })
})
