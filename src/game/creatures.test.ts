// Creature mapping (T015): deterministic pool-size → creature.
import { CREATURES, creatureDef, creatureForPool } from './creatures'

describe('creatureForPool', () => {
  it('maps sizes to creatures deterministically', () => {
    expect(creatureForPool(1)).toBe('limpet')
    expect(creatureForPool(3)).toBe('anemone')
    expect(creatureForPool(4)).toBe('crab')
    expect(creatureForPool(100)).toBe('octopus')
    expect(creatureForPool(4)).toBe(creatureForPool(4))
  })

  it('is monotonic in pool size (never yields a rarer creature for a smaller pool)', () => {
    const rank = (id: string) => CREATURES.findIndex((c) => c.id === id)
    for (let n = 1; n < 20; n++) {
      expect(rank(creatureForPool(n))).toBeLessThanOrEqual(rank(creatureForPool(n + 1)))
    }
  })

  it('every catalogued creature resolves to a definition', () => {
    for (const c of CREATURES) expect(creatureDef(c.id)?.name).toBeTruthy()
    expect(creatureDef('nope')).toBeUndefined()
  })
})
