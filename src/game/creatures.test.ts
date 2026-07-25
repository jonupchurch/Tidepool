// Creature catalog + reward resolver (T007): the single shared source of
// creature identity + pool-size → creature mapping.
import { CREATURES, RARITIES, creatureDef, creatureForPool, creatureUnlock } from './creatures'

describe('creature catalog', () => {
  it('has around a dozen creatures, each with the required fields', () => {
    expect(CREATURES.length).toBeGreaterThanOrEqual(10)
    for (const c of CREATURES) {
      expect(c.id).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.description).toBeTruthy()
      expect(RARITIES).toContain(c.rarity)
      expect(typeof c.minSize).toBe('number')
      expect(typeof c.hasArt).toBe('boolean')
      // art path present iff hasArt (missing art degrades to a placeholder — FR-008)
      expect(Boolean(c.art)).toBe(c.hasArt)
    }
  })

  it('has unique ids', () => {
    const ids = CREATURES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('minSizes start at 1 and strictly ascend (so unlock ranges partition the space)', () => {
    expect(CREATURES[0].minSize).toBe(1)
    for (let i = 1; i < CREATURES.length; i++) {
      expect(CREATURES[i].minSize).toBeGreaterThan(CREATURES[i - 1].minSize)
    }
  })

  it('unlock ranges partition [1, ∞) with no gaps or overlap', () => {
    const ranges = CREATURES.map((c) => creatureUnlock(c.id)!)
    // sorted by min already; each range starts exactly where the previous ended.
    expect(ranges[0].min).toBe(1)
    expect(ranges[ranges.length - 1].max).toBe(Number.POSITIVE_INFINITY)
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].min).toBe(ranges[i - 1].max + 1)
    }
    // every size in a wide band maps to exactly the creature whose range contains it
    for (let n = 1; n <= 40; n++) {
      const owning = CREATURES.filter((c) => {
        const r = creatureUnlock(c.id)!
        return n >= r.min && n <= r.max
      })
      expect(owning.length).toBe(1)
      expect(creatureForPool(n)).toBe(owning[0].id)
    }
  })

  it('maps pool size to creature deterministically + monotonically', () => {
    expect(creatureForPool(1)).toBe('limpet')
    expect(creatureForPool(6)).toBe('crab')
    expect(creatureForPool(4)).toBe(creatureForPool(4))
    // a huge pool always yields the rarest creature
    expect(creatureForPool(1000)).toBe(CREATURES[CREATURES.length - 1].id)
    const rank = (id: string) => CREATURES.findIndex((c) => c.id === id)
    for (let n = 1; n < 30; n++) {
      expect(rank(creatureForPool(n))).toBeLessThanOrEqual(rank(creatureForPool(n + 1)))
    }
  })

  it('resolves definitions by id and is undefined for unknowns', () => {
    for (const c of CREATURES) expect(creatureDef(c.id)?.name).toBeTruthy()
    expect(creatureDef('nope')).toBeUndefined()
    expect(creatureUnlock('nope')).toBeUndefined()
  })
})
