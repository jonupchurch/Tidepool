// board-request.test.ts — the shell's request assembly (016).
//
// The load-bearing test in here is the FIRST one. Every other guarantee in this
// feature is a nicety; that one is the promise the game makes about seeds, and
// it is the reason both new inputs are opt-in rather than automatic.
import { describe, expect, it } from 'vitest'
import { generateBoard, serializeBoard } from '@/core'
import { ANY_SHORE } from '@/game/board-source'
import { boardRequest } from './board-request'

const SEEDS = ['CORAL-4417', 'KELP-0007', 'TIDE-1234', 'COVE-0001']
const SIZES = ['Small', 'Medium', 'Large'] as const
const TIERS = ['Calm', 'Tricky', 'Deep'] as const

describe('boardRequest — the defaults are the board we already shipped', () => {
  it('produces the pre-016 params exactly when no shore options are given', () => {
    for (const seed of SEEDS) {
      for (const size of SIZES) {
        for (const difficulty of TIERS) {
          expect(boardRequest(seed, size, difficulty)).toEqual({
            seed,
            size,
            difficulty,
            clues: { connectivity: true, lineTotals: true },
          })
        }
      }
    }
  })

  it('is unchanged by explicitly passing the defaults', () => {
    for (const seed of SEEDS) {
      for (const size of SIZES) {
        for (const difficulty of TIERS) {
          expect(boardRequest(seed, size, difficulty, { shore: 'hex', edgeHints: false })).toEqual(
            boardRequest(seed, size, difficulty),
          )
        }
      }
    }
  })

  /**
   * The end-to-end version of the claim: not just equal params, but the same
   * generated board. `fingerprints.test.ts` freezes this at the engine's door;
   * this checks the shell doesn't smuggle something in on the way there.
   */
  it('generates a byte-identical board to the bare params', () => {
    for (const seed of SEEDS) {
      for (const size of SIZES) {
        for (const difficulty of TIERS) {
          const viaShell = serializeBoard(generateBoard(boardRequest(seed, size, difficulty)))
          const bare = serializeBoard(
            generateBoard({
              seed,
              size,
              difficulty,
              clues: { connectivity: true, lineTotals: true },
            }),
          )
          expect(viaShell).toBe(bare)
        }
      }
    }
  })

  // Turning hints on at a tier that strips them must not change the board
  // either — the flag would otherwise reach the RNG seed string for nothing.
  it('leaves Calm and Tricky boards alone when edge hints are on', () => {
    for (const difficulty of ['Calm', 'Tricky'] as const) {
      expect(boardRequest('KELP-0007', 'Large', difficulty, { edgeHints: true })).toEqual(
        boardRequest('KELP-0007', 'Large', difficulty),
      )
    }
  })
})

describe('boardRequest — the opt-in paths', () => {
  it('carries a named shore the size supports', () => {
    expect(boardRequest('KELP-0007', 'Large', 'Deep', { shore: 'wedge' }).shape).toBe('wedge')
  })

  it('omits the shape rather than naming the hexagon', () => {
    // `rngSeedString` keys off `shape !== 'hex'`, so an explicit hex is inert —
    // but it would make two identical requests compare unequal.
    expect(boardRequest('KELP-0007', 'Large', 'Deep', { shore: 'hex' })).not.toHaveProperty('shape')
    expect(boardRequest('KELP-0007', 'Small', 'Deep', { shore: 'wedge' })).not.toHaveProperty(
      'shape',
    )
  })

  it('turns on lineConnectivity at Deep', () => {
    expect(boardRequest('KELP-0007', 'Large', 'Deep', { edgeHints: true }).clues).toEqual({
      connectivity: true,
      lineTotals: true,
      lineConnectivity: true,
    })
  })

  it('turns on evenOdd at Deep (018)', () => {
    expect(boardRequest('KELP-0007', 'Large', 'Deep', { evenOdd: true }).clues).toEqual({
      connectivity: true,
      lineTotals: true,
      evenOdd: true,
    })
  })

  it('carries both optional clue mechanics together', () => {
    expect(
      boardRequest('KELP-0007', 'Large', 'Deep', { edgeHints: true, evenOdd: true }).clues,
    ).toEqual({ connectivity: true, lineTotals: true, lineConnectivity: true, evenOdd: true })
  })

  it('refuses evenOdd below Deep, even when asked (018 FR-004)', () => {
    // The gate has to bite HERE, not just in the UI. The flag reaches the RNG
    // seed string, so a stale `true` carried down from Deep would change which
    // board a Calm seed produces in exchange for clues reduction then strips.
    for (const difficulty of ['Calm', 'Tricky'] as const) {
      const withFlag = boardRequest('KELP-0007', 'Medium', difficulty, { evenOdd: true })
      const without = boardRequest('KELP-0007', 'Medium', difficulty)
      expect(withFlag.clues.evenOdd).toBeUndefined()
      expect(withFlag).toEqual(without)
      // ...and the board itself is the one that seed has always produced.
      expect(serializeBoard(generateBoard(withFlag))).toBe(
        serializeBoard(generateBoard(without)),
      )
    }
  })

  it('serves a board on every shore it will hand out', () => {
    for (const shore of ['atoll', 'crescent', 'wedge', 'shoal'] as const) {
      const board = generateBoard(boardRequest('KELP-0007', 'Large', 'Deep', { shore }))
      expect(board.params.shape).toBe(shore)
      expect(board.present.size).toBeGreaterThan(12)
    }
  })

  it('under Any, consecutive seeds do not all land on the same shore', () => {
    const shapes = new Set(
      Array.from({ length: 30 }, (_, i) => `TIDE-${String(i).padStart(4, '0')}`).map(
        (seed) => boardRequest(seed, 'Large', 'Deep', { shore: ANY_SHORE }).shape ?? 'hex',
      ),
    )
    expect(shapes.size).toBeGreaterThan(1)
  })
})
