// board-request.test.ts — the shell's request assembly (016).
//
// The load-bearing test in here is the FIRST one. Every other guarantee in this
// feature is a nicety; that one is the promise the game makes about seeds, and
// it is the reason both new inputs are opt-in rather than automatic.
import { describe, expect, it } from 'vitest'
import { generateBoard, parseSeed, serializeBoard } from '@/core'
import { ANY_SHORE, parseSeedEntry } from '@/game/board-source'
import { boardRequest, freshSeed } from './board-request'

const SEEDS = ['CORAL-4417', 'KELP-0007', 'TIDE-1234', 'COVE-0001']
const SIZES = ['Small', 'Medium', 'Large'] as const
const TIERS = ['Calm', 'Tricky', 'Deep'] as const

describe('freshSeed makes seeds a player can type back in (023)', () => {
  // The assertion whose ABSENCE was the bug. `freshSeed` emits base 36
  // (`TIDE-H4SD`) and `parseSeed` accepted digits only, so roughly 99.4% of
  // Endless boards printed a label the seed box then refused — "isn't a seed —
  // they look like CORAL-4417" — about a board the game had just served.
  //
  // Nothing caught it because every seed in this suite and every curated seed
  // is all digits. A generator and its parser have to be tested against EACH
  // OTHER; testing each against hand-written examples proves nothing about the
  // pair, and the examples were all drawn from the parser's happy path.
  it('round-trips every seed it can produce', () => {
    for (let i = 0; i < 2000; i++) {
      const seed = freshSeed()
      expect(parseSeed(seed), `freshSeed produced an unparseable ${seed}`).toBe(seed)
    }
  })

  it('produces a board label that pastes straight back into the seed box', () => {
    // The whole promise SeedEntry advertises: "paste the whole label to match
    // its shore too". Exercised end to end rather than on the seed alone.
    for (let i = 0; i < 200; i++) {
      const seed = freshSeed()
      const label = `${seed} · Large · Deep · atoll · hints · evenodd`
      const parsed = parseSeedEntry(label, { size: 'Small', difficulty: 'Calm' })
      expect(parsed.ok, `label “${label}” was rejected`).toBe(true)
      if (!parsed.ok) continue
      expect(parsed.request.seed).toBe(seed)
      expect(parsed.request.size).toBe('Large')
      expect(parsed.request.difficulty).toBe('Deep')
      expect(parsed.request.shape).toBe('atoll')
      expect(parsed.request.clues?.evenOdd).toBe(true)
    }
  })
})

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
