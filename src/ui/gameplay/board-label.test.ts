// board-label.test.ts — the label is the shareable token, so the claim worth
// testing is the ROUND TRIP: whatever the board shows must parse back into the
// same board. A label that describes a board only approximately is worse than
// no label, because it looks authoritative.
import { describe, expect, it } from 'vitest'
import type { BoardParams } from '@/core'
import { parseSeedEntry } from '@/game/board-source'
import { boardRequest } from '@/ui/shell/board-request'
import { boardLabel } from './board-label'

const prefs = { size: 'Small', difficulty: 'Calm', shore: 'hex', edgeHints: false } as const

/** Parse a label back, using prefs that agree with nothing in it. */
function roundTrip(params: BoardParams): BoardParams {
  const result = parseSeedEntry(boardLabel(params), prefs)
  if (!result.ok) throw new Error(`label did not parse: ${boardLabel(params)}`)
  const { seed, size, difficulty, clues, shape } = result.request
  return { seed, size, difficulty, clues: clues ?? { connectivity: true, lineTotals: true }, ...(shape ? { shape } : {}) }
}

describe('boardLabel', () => {
  it('names only seed, size and difficulty for an ordinary board', () => {
    expect(boardLabel(boardRequest('CORAL-4417', 'Medium', 'Calm'))).toBe(
      'CORAL-4417 · Medium · Calm',
    )
  })

  it('names the shore when the board has one', () => {
    expect(boardLabel(boardRequest('KELP-0007', 'Large', 'Deep', { shore: 'atoll' }))).toBe(
      'KELP-0007 · Large · Deep · Atoll',
    )
  })

  it('names the hints when the rows carry them', () => {
    expect(boardLabel(boardRequest('KELP-0007', 'Large', 'Deep', { edgeHints: true }))).toBe(
      'KELP-0007 · Large · Deep · hints',
    )
  })

  it('does not name the hexagon — the common label stays short', () => {
    expect(boardLabel(boardRequest('KELP-0007', 'Large', 'Deep', { shore: 'hex' }))).not.toMatch(
      /open water/i,
    )
  })
})

describe('boardLabel round-trips through seed entry', () => {
  const cases: BoardParams[] = [
    boardRequest('CORAL-4417', 'Small', 'Calm'),
    boardRequest('KELP-0007', 'Medium', 'Tricky'),
    boardRequest('TIDE-1234', 'Large', 'Deep'),
    boardRequest('TIDE-1234', 'Large', 'Deep', { edgeHints: true }),
    boardRequest('KELP-0007', 'Medium', 'Deep', { shore: 'crescent' }),
    boardRequest('KELP-0007', 'Large', 'Deep', { shore: 'wedge', edgeHints: true }),
    boardRequest('COVE-0001', 'Large', 'Deep', { shore: 'Any', edgeHints: true }),
  ]

  for (const params of cases) {
    it(`“${boardLabel(params)}” parses back to the same board`, () => {
      expect(roundTrip(params)).toEqual(params)
    })
  }
})
