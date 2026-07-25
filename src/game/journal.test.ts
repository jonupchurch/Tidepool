// Journal model (T010/T018/T022/T023): the pure read model + filters + the
// discovery-record branch, and `recordDiscovery` end-to-end through a store.
import { CREATURES } from './creatures'
import { memoryStore } from './journal-fixtures'
import {
  type DiscoveryMap,
  applyDiscovery,
  buildJournalView,
  filterCards,
  isNewDiscovery,
  recordBoardSolved,
  recordDiscovery,
} from './journal'
import { loadDiscoveries, loadStats } from './journal-store'

describe('buildJournalView (read model)', () => {
  it('renders a card for every catalog creature with accurate found/silhouette state', () => {
    const discoveries: DiscoveryMap = { crab: { firstFoundSeed: 'TIDE-0007', count: 2 } }
    const view = buildJournalView(discoveries)
    expect(view.cards).toHaveLength(CREATURES.length)
    expect(view.total).toBe(CREATURES.length)
    expect(view.foundCount).toBe(1)
    const crab = view.cards.find((c) => c.def.id === 'crab')!
    expect(crab.found).toBe(true)
    expect(crab.count).toBe(2)
    expect(crab.firstFoundSeed).toBe('TIDE-0007')
    const limpet = view.cards.find((c) => c.def.id === 'limpet')!
    expect(limpet.found).toBe(false)
    expect(limpet.count).toBe(0)
    expect(limpet.firstFoundSeed).toBeNull()
  })

  it('handles zero discoveries and full completion (SC-001/SC-004)', () => {
    expect(buildJournalView({}).foundCount).toBe(0)
    const all: DiscoveryMap = Object.fromEntries(
      CREATURES.map((c) => [c.id, { firstFoundSeed: 'COVE-0001', count: 1 }]),
    )
    const full = buildJournalView(all)
    expect(full.foundCount).toBe(full.total)
    expect(full.cards.every((c) => c.found)).toBe(true)
  })
})

describe('filterCards (SC-005)', () => {
  const view = buildJournalView({ crab: { firstFoundSeed: 'TIDE-0007', count: 1 } })
  it('All returns the whole catalog', () => {
    expect(filterCards(view.cards, 'all')).toHaveLength(CREATURES.length)
  })
  it('Found returns only discovered creatures', () => {
    const found = filterCards(view.cards, 'found')
    expect(found).toHaveLength(1)
    expect(found.every((c) => c.found)).toBe(true)
  })
  it('Missing returns only undiscovered creatures', () => {
    const missing = filterCards(view.cards, 'missing')
    expect(missing).toHaveLength(CREATURES.length - 1)
    expect(missing.every((c) => !c.found)).toBe(true)
  })
})

describe('applyDiscovery (FR-003/FR-004)', () => {
  it('first find sets firstFoundSeed + count 1', () => {
    expect(isNewDiscovery({}, 'crab')).toBe(true)
    expect(applyDiscovery({}, 'crab', 'TIDE-0007')).toEqual({
      crab: { firstFoundSeed: 'TIDE-0007', count: 1 },
    })
  })
  it('a re-find increments count and preserves the first-found seed', () => {
    const first = applyDiscovery({}, 'crab', 'TIDE-0007')
    expect(isNewDiscovery(first, 'crab')).toBe(false)
    const second = applyDiscovery(first, 'crab', 'REEF-9999')
    expect(second.crab).toEqual({ firstFoundSeed: 'TIDE-0007', count: 2 })
  })
  it('does not mutate its input', () => {
    const base: DiscoveryMap = { crab: { firstFoundSeed: 'TIDE-0007', count: 1 } }
    applyDiscovery(base, 'crab', 'REEF-9999')
    expect(base.crab.count).toBe(1)
  })
})

describe('recordDiscovery (SC-002/SC-003) — persisted through the store', () => {
  it('records a first find with seed + count 1 and bumps stats', async () => {
    const store = memoryStore()
    await recordDiscovery(store, 'crab', 'TIDE-0007')
    expect(await loadDiscoveries(store)).toEqual({ crab: { firstFoundSeed: 'TIDE-0007', count: 1 } })
    expect(await loadStats(store)).toEqual({ boardsSolved: 0, poolsFilled: 1, creaturesFound: 1 })
  })

  it('re-find increments count, preserves first-found, and counts another filled pool', async () => {
    const store = memoryStore()
    await recordDiscovery(store, 'crab', 'TIDE-0007')
    await recordDiscovery(store, 'crab', 'REEF-9999')
    expect(await loadDiscoveries(store)).toEqual({ crab: { firstFoundSeed: 'TIDE-0007', count: 2 } })
    const stats = await loadStats(store)
    expect(stats.poolsFilled).toBe(2)
    expect(stats.creaturesFound).toBe(1) // still one distinct creature
  })

  it('ignores unknown creature ids (no phantom rows)', async () => {
    const store = memoryStore()
    await recordDiscovery(store, 'kraken', 'TIDE-0007')
    expect(await loadDiscoveries(store)).toEqual({})
  })

  it('recordBoardSolved bumps only boardsSolved', async () => {
    const store = memoryStore()
    await recordBoardSolved(store)
    expect(await loadStats(store)).toEqual({ boardsSolved: 1, poolsFilled: 0, creaturesFound: 0 })
  })
})
