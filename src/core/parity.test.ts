// Parity clues (018) — the `E` / `O` adjacency form and the technique that
// reads it.
//
// Two of these tests are load-bearing rather than supporting:
//
//   * the differential test, which proves the pass forces exactly what the
//     clue actually entails and nothing more, and
//   * the inertness test, which proves the pass does NOTHING on a board with no
//     parity clue. That is what stops 018 from strengthening the solver for
//     every board in existence, changing what reduction keeps, and silently
//     regenerating every shipped curated board and every player's saved game.
import type { Assign, Constraint } from './techniques'
import { applyParity, parityPass, setup } from './techniques'
import type { SolveCtx } from './techniques'
import { generateBoard } from './generate'
import { isParityClue } from './board'
import type { DifficultyTier, SizeTier } from './board'
import { presentNeighborCount } from './clues'
import { serializeBoard } from './serialize'
import { solve } from './solver'

const ctx = (): SolveCtx => ({ contradiction: false, used: new Set() })

const RING = ['a', 'b', 'c', 'd', 'e', 'f']

function assignOf(known: (boolean | null)[]): Assign {
  const a: Assign = new Map()
  known.forEach((v, i) => a.set(RING[i], v === null ? 'unknown' : v ? 'water' : 'rock'))
  return a
}

function parityCon(cells: string[], parity: 0 | 1): Constraint {
  return { kind: 'parity', cells, parity, source: 'adjacency' }
}

describe('applyParity', () => {
  it('forces the last unknown to satisfy an even clue', () => {
    // three water known, one unknown, clue says even -> the last must be water
    const assign = assignOf([true, true, true, null, false, false])
    const c = ctx()
    expect(applyParity(parityCon(RING, 0), assign, c)).toBe(true)
    expect(assign.get('d')).toBe('water')
    expect(c.used.has('parity')).toBe(true)
  })

  it('forces the last unknown to satisfy an odd clue', () => {
    const assign = assignOf([true, true, true, null, false, false])
    expect(applyParity(parityCon(RING, 1), assign, ctx())).toBe(true)
    expect(assign.get('d')).toBe('rock')
  })

  it('deduces nothing while two or more cells are unsettled', () => {
    const assign = assignOf([true, null, null, false, false, false])
    const c = ctx()
    expect(applyParity(parityCon(RING, 0), assign, c)).toBe(false)
    expect(c.contradiction).toBe(false)
    expect(assign.get('b')).toBe('unknown')
  })

  it('raises a contradiction when a fully-settled ring violates the clue', () => {
    // One water, everything known, but the clue says even. This matters: the
    // uniqueness counter relies on it to prune a branch that has already gone
    // wrong. Without it the counter would count assignments the clue forbids.
    const assign = assignOf([true, false, false, false, false, false])
    const c = ctx()
    expect(applyParity(parityCon(RING, 0), assign, c)).toBe(false)
    expect(c.contradiction).toBe(true)
  })

  it('accepts a fully-settled ring that satisfies the clue', () => {
    const assign = assignOf([true, true, false, false, false, false])
    const c = ctx()
    expect(applyParity(parityCon(RING, 0), assign, c)).toBe(false)
    expect(c.contradiction).toBe(false)
  })
})

describe('applyParity matches brute force (differential)', () => {
  // The real proof: for every partial state and both parities, the pass must
  // force exactly the cells that EVERY satisfying arrangement agrees on — no
  // fewer (weak) and no more (unsound).
  const states: (boolean | null)[] = [true, false, null]

  it('forces exactly what every valid arrangement agrees on', () => {
    let checked = 0
    // All 3^6 partial rings.
    for (let mask = 0; mask < 3 ** 6; mask++) {
      const known: (boolean | null)[] = []
      let m = mask
      for (let i = 0; i < 6; i++) {
        known.push(states[m % 3])
        m = Math.floor(m / 3)
      }
      for (const parity of [0, 1] as const) {
        // Brute force: every completion consistent with `known` and the parity.
        const unknownIdx = known.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0)
        const valid: boolean[][] = []
        for (let bits = 0; bits < 1 << unknownIdx.length; bits++) {
          const slots = known.map((v) => v === true)
          unknownIdx.forEach((idx, b) => {
            if (bits & (1 << b)) slots[idx] = true
          })
          if (slots.filter(Boolean).length % 2 === parity) valid.push(slots)
        }

        const assign = assignOf(known)
        const c = ctx()
        applyParity(parityCon(RING, parity), assign, c)

        if (valid.length === 0) {
          expect(c.contradiction, `mask ${mask} parity ${parity} should contradict`).toBe(true)
          continue
        }
        expect(c.contradiction, `mask ${mask} parity ${parity} should not contradict`).toBe(false)

        for (const idx of unknownIdx) {
          const allWater = valid.every((v) => v[idx])
          const allRock = valid.every((v) => !v[idx])
          const got = assign.get(RING[idx])
          if (allWater) expect(got, `slot ${idx} forced water`).toBe('water')
          else if (allRock) expect(got, `slot ${idx} forced rock`).toBe('rock')
          else expect(got, `slot ${idx} not forced`).toBe('unknown')
        }
        checked++
      }
    }
    expect(checked).toBeGreaterThan(1000) // the sweep actually ran
  })
})

describe('generating with evenOdd on', () => {
  const clues = { connectivity: true, lineTotals: true, evenOdd: true }
  const seeds = ['CORAL-4417', 'KELP-0007', 'TIDE-1234']

  for (const seed of seeds) {
    it(`${seed} Medium/Deep carries parity clues and stays sound`, () => {
      const board = generateBoard({ seed, size: 'Medium', difficulty: 'Deep', clues })
      const given = [...board.cells.values()].filter((c) => c.given && c.clue)
      const parity = given.filter((c) => c.clue && isParityClue(c.clue))

      expect(parity.length).toBeGreaterThan(0)
      // Measured at ~35% across 5 seeds x 3 sizes; the band is deliberately wide
      // so this pins "the mechanic is visible and not overwhelming" rather than
      // freezing a number that reduction is free to move.
      expect(parity.length / given.length).toBeGreaterThan(0.1)
      expect(parity.length / given.length).toBeLessThan(0.7)

      const res = solve(board)
      expect(res.solved).toBe(true)
      expect(res.unique).toBe(true)
      expect(res.rating).toBe('Deep')
    })
  }

  it('never places a parity clue where parity would not withhold anything (FR-006)', () => {
    for (const seed of seeds) {
      const board = generateBoard({ seed, size: 'Large', difficulty: 'Deep', clues })
      for (const [k, cell] of board.cells) {
        if (!cell.clue || !isParityClue(cell.clue)) continue
        // With fewer than two present neighbours, parity pins the count exactly,
        // so `E`/`O` would be the number in disguise rather than weaker than it.
        expect(presentNeighborCount(cell.coord, board.present), `${seed} ${k}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('keeps parity clues off every tier below Deep, even with the toggle forced on', () => {
    // The gate that matters is in reduction's technique set, not the UI — a
    // stale preference must not be able to put `E` on a Calm board.
    for (const difficulty of ['Calm', 'Tricky'] as DifficultyTier[]) {
      for (const seed of seeds) {
        const board = generateBoard({ seed, size: 'Medium', difficulty, clues })
        const parity = [...board.cells.values()].filter((c) => c.clue && isParityClue(c.clue))
        expect(parity, `${seed} ${difficulty}`).toHaveLength(0)
      }
    }
  })

  it('leaves the board untouched when evenOdd is off', () => {
    // The whole determinism argument in one assertion: same seed, toggle off,
    // same board. (fingerprints.test.ts covers this across the whole table.)
    //
    // Compared on cells + lines rather than the raw serialization, because
    // `serializeBoard` echoes `params` verbatim: an explicit `evenOdd: false`
    // and an absent key are different params that produce the identical board,
    // and it is the board this is about. The same is already true of
    // `lineConnectivity: false`.
    const boardShape = (b: ReturnType<typeof generateBoard>): string => {
      const canonical = JSON.parse(serializeBoard(b)) as Record<string, unknown>
      delete canonical.params
      return JSON.stringify(canonical)
    }
    const base = { seed: 'KELP-0007', size: 'Medium' as const, difficulty: 'Deep' as const }
    const off = generateBoard({ ...base, clues: { connectivity: true, lineTotals: true } })
    const explicitlyOff = generateBoard({
      ...base,
      clues: { connectivity: true, lineTotals: true, evenOdd: false },
    })
    expect(boardShape(explicitlyOff)).toBe(boardShape(off))
    expect(boardShape(generateBoard({ ...base, clues }))).not.toBe(boardShape(off))
  })
})

describe('parityPass is inert without parity clues (FR-003)', () => {
  // THE test this feature rests on. A parity pass that also read the parity of
  // EXACT constraints would look strictly more powerful and be free — and it
  // would strengthen the solver on every board, change which clues reduction
  // decides are necessary, and rewrite every seed in existence.
  const seeds = ['CORAL-4417', 'KELP-0007', 'TIDE-1234', 'COVE-0001']
  const sizes: SizeTier[] = ['Small', 'Medium']
  const tiers: DifficultyTier[] = ['Calm', 'Tricky', 'Deep']

  for (const difficulty of tiers) {
    for (const size of sizes) {
      it(`does nothing on an ordinary ${size}/${difficulty} board`, () => {
        for (const seed of seeds) {
          const board = generateBoard({
            seed,
            size,
            difficulty,
            clues: { connectivity: true, lineTotals: true },
          })
          // No parity clue should exist at all without the toggle...
          const parityClues = [...board.cells.values()].filter(
            (c) => c.clue && isParityClue(c.clue),
          )
          expect(parityClues, `${seed} ${size}/${difficulty}`).toHaveLength(0)

          // ...and the pass must report no progress and touch no cell.
          const { assign, constraints } = setup(board)
          const before = new Map(assign)
          const c = ctx()
          expect(parityPass(constraints, assign, c)).toBe(false)
          expect(c.contradiction).toBe(false)
          expect(c.used.size).toBe(0)
          expect([...assign]).toEqual([...before])
        }
      })
    }
  }
})
