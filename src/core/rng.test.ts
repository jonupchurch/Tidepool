// RNG tests (T005): determinism, integer stability, unbiased ints, shuffle.
import { cyrb128, nextFloat, nextInt, seedToRng, shuffle } from './rng'

function take(seed: string, n: number): number[] {
  const rng = seedToRng(seed)
  return Array.from({ length: n }, () => rng.nextU32())
}

describe('seeded RNG', () => {
  it('same seed → identical sequence', () => {
    expect(take('CORAL-4417', 20)).toEqual(take('CORAL-4417', 20))
  })

  it('different seeds → different sequences', () => {
    expect(take('CORAL-4417', 8)).not.toEqual(take('CORAL-4418', 8))
  })

  it('emits integer-stable uint32 values', () => {
    for (const v of take('KELP-0001', 100)) {
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('cyrb128 is stable and returns four uint32 words', () => {
    const a = cyrb128('CORAL-4417')
    const b = cyrb128('CORAL-4417')
    expect(a).toEqual(b)
    expect(a).toHaveLength(4)
    for (const w of a) {
      expect(Number.isInteger(w)).toBe(true)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('nextInt stays in range and is deterministic', () => {
    const a = seedToRng('TIDE-0007')
    const b = seedToRng('TIDE-0007')
    for (let i = 0; i < 200; i++) {
      const bound = (i % 9) + 1
      const x = nextInt(a, bound)
      expect(x).toBe(nextInt(b, bound))
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(bound)
    }
  })

  it('nextInt(rng, 1) is always 0', () => {
    const rng = seedToRng('X-1')
    for (let i = 0; i < 10; i++) expect(nextInt(rng, 1)).toBe(0)
  })

  it('nextInt rejects non-positive bounds', () => {
    expect(() => nextInt(seedToRng('X-2'), 0)).toThrow()
  })

  it('nextFloat is in [0, 1)', () => {
    const rng = seedToRng('FOAM-0002')
    for (let i = 0; i < 100; i++) {
      const f = nextFloat(rng)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(1)
    }
  })

  it('shuffle is a deterministic permutation', () => {
    const base = Array.from({ length: 25 }, (_, i) => i)
    const one = shuffle(seedToRng('SHELL-0003'), base.slice())
    const two = shuffle(seedToRng('SHELL-0003'), base.slice())
    expect(one).toEqual(two)
    expect(one.slice().sort((x, y) => x - y)).toEqual(base)
  })
})
