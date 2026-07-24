// Serialization tests (T015): canonical round-trip + seed code parse/format.
import { deserializeBoard, formatSeed, parseSeed, serializeBoard } from './serialize'
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
