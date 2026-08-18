// Serialization tests (T015): canonical round-trip + seed code parse/format.
import { deserializeBoard, formatSeed, parseSeed, serializeBoard } from './serialize'
import type { AdjacencyClue, Cell, LineClue } from './board'
import { hasParityFace, makeBoard } from './board'
import { generateBoard } from './generate'
import { hexRegion, parseKey, presentSet } from './hex'
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

  it('parses the base-36 codes freshSeed actually emits (023)', () => {
    // These are the shape of every Endless label. The parser took digits only
    // until 023, so the game printed seeds its own seed box then refused.
    expect(parseSeed('TIDE-H4SD')).toBe('TIDE-H4SD')
    expect(parseSeed('tide-1q9f')).toBe('TIDE-1Q9F')
    expect(parseSeed('TIDE-ZZZZ')).toBe('TIDE-ZZZZ')
  })

  it('rejects malformed codes', () => {
    expect(parseSeed('coral')).toBeNull()
    expect(parseSeed('coral-')).toBeNull()
    expect(parseSeed('123-456')).toBeNull() // the word is letters
    expect(parseSeed('coral-12345')).toBeNull() // code is at most four
    expect(parseSeed('coral-ABCDE')).toBeNull() // ...in base 36 too
    expect(parseSeed('coral-44_7')).toBeNull() // alphanumeric only
    expect(parseSeed('no-hints')).toBeNull() // `HINTS` is five
    expect(parseSeed('noevenodd')).toBeNull() // no separator at all
  })

  it('only ever judges the FIRST token, which is why `even-odd` is harmless', () => {
    // Worth writing down because it looks like a hazard and is not. `EVEN-ODD`
    // does satisfy the widened pattern. It never matters: `parseSeedEntry`
    // offers this function `parts[0]` alone and matches option tokens by their
    // own rules, so `even-odd` can only be read as a seed by someone who typed
    // nothing else — and then it is simply a seed, and makes a board.
    expect(parseSeed('even-odd')).toBe('EVEN-ODD')
  })
})

describe('framed parity (019)', () => {
  it('round-trips all six forms, at both clue sites', () => {
    // Hand-built rather than generated, so every form is present whether or not
    // a particular seed happens to produce it. `makeBoard` only wires structure;
    // this is a serialization test, not a solvability one.
    const present = presentSet(hexRegion(2))
    const cells = new Map<string, Cell>()
    const faces: AdjacencyClue[] = [
      { count: 3 },
      { count: 3, connectivity: 'connected' },
      { count: 3, connectivity: 'split' },
      { parity: 'even' },
      { parity: 'even', connectivity: 'connected' },
      { parity: 'odd', connectivity: 'split' },
    ]
    let i = 0
    for (const k of present) {
      const coord = parseKey(k)
      const clue = faces[i % faces.length]
      cells.set(k, { coord, state: 'rock', given: true, clue })
      i++
    }
    const lines: LineClue[] = [
      { axis: 0, index: 0, from: 'start', count: 2 },
      { axis: 0, index: 1, from: 'start', count: 2, connectivity: 'connected' },
      { axis: 0, index: 2, from: 'end', count: 2, connectivity: 'split' },
      { axis: 1, index: 0, from: 'start', parity: 'even' },
      { axis: 1, index: 1, from: 'start', parity: 'even', connectivity: 'connected' },
      { axis: 1, index: 2, from: 'end', parity: 'odd', connectivity: 'split' },
    ]
    const board = makeBoard({
      params: {
        seed: 'COVE-0001',
        size: 'Small',
        difficulty: 'Deep',
        clues: { connectivity: true, lineTotals: true, evenOdd: true, lineConnectivity: true },
      },
      present,
      cells,
      lines,
    })

    const back = deserializeBoard(serializeBoard(board))
    expect(back.lines).toEqual(lines)
    expect(back.cells).toEqual(cells)
    expect(serializeBoard(back)).toBe(serializeBoard(board))

    // A parity face must not gain a count on the way back, at EITHER site — the
    // number was withheld and a round trip is not an excuse to reveal it.
    for (const l of back.lines) if (hasParityFace(l)) expect(l).not.toHaveProperty('count')
    for (const c of back.cells.values()) {
      if (c.clue && hasParityFace(c.clue)) expect(c.clue).not.toHaveProperty('count')
    }
  })

  it('writes a framed line exactly as wide as an unframed one plus its framing', () => {
    // The line tuple is positional, which is what let `LineClue.total` be
    // renamed to `count` in 019 without moving a single byte. A bare clue must
    // still omit the trailing slot rather than writing an explicit undefined.
    const mk = (lines: LineClue[]) =>
      JSON.parse(
        serializeBoard(
          makeBoard({
            params: {
              seed: 'COVE-0001',
              size: 'Small',
              difficulty: 'Deep',
              clues: { connectivity: true, lineTotals: true },
            },
            present: new Set(),
            cells: new Map(),
            lines,
          }),
        ),
      ) as { lines: unknown[][] }

    expect(mk([{ axis: 0, index: 0, from: 'start', count: 4 }]).lines[0]).toEqual([0, 0, 4, 'start'])
    expect(mk([{ axis: 0, index: 0, from: 'start', parity: 'odd' }]).lines[0]).toEqual([
      0,
      0,
      'o',
      'start',
    ])
    expect(
      mk([{ axis: 0, index: 0, from: 'start', parity: 'even', connectivity: 'split' }]).lines[0],
    ).toEqual([0, 0, 'e', 'start', 's'])
  })
})
