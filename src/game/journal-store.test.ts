// Journal persistence adapter (T009/T019): discovery records + lifetime stats
// round-trip through the injected SaveStore in the persisted schema shape.
import { keyFor, loadRecord } from '@/platform'
import { memoryStore } from './journal-fixtures'
import { loadDiscoveries, loadStats, saveDiscoveries, saveStats } from './journal-store'

describe('journal-store adapter', () => {
  it('defaults to an empty discoveries map + zeroed stats on a fresh store', async () => {
    const store = memoryStore()
    expect(await loadDiscoveries(store)).toEqual({})
    expect(await loadStats(store)).toEqual({ boardsSolved: 0, poolsFilled: 0, creaturesFound: 0 })
  })

  it('round-trips a discovery record through the store', async () => {
    const store = memoryStore()
    await saveDiscoveries(store, { crab: { firstFoundSeed: 'TIDE-0007', count: 2 } })
    expect(await loadDiscoveries(store)).toEqual({ crab: { firstFoundSeed: 'TIDE-0007', count: 2 } })
  })

  it('writes discoveries in the versioned journal-record schema shape', async () => {
    const store = memoryStore()
    await saveDiscoveries(store, { limpet: { firstFoundSeed: 'COVE-0001', count: 1 } })
    // read the raw persisted record: { v, discoveries } under the namespaced key
    const raw = await store.get<{ v: number; discoveries: unknown }>(keyFor('journal'))
    expect(raw?.v).toBe(1)
    expect(raw?.discoveries).toEqual({ limpet: { firstFoundSeed: 'COVE-0001', count: 1 } })
    // and it round-trips through the typed accessor unchanged
    expect((await loadRecord(store, 'journal')).discoveries.limpet.count).toBe(1)
  })

  it('round-trips lifetime stats (SC-003)', async () => {
    const store = memoryStore()
    await saveStats(store, { boardsSolved: 3, poolsFilled: 11, creaturesFound: 5 })
    expect(await loadStats(store)).toEqual({ boardsSolved: 3, poolsFilled: 11, creaturesFound: 5 })
    const raw = await store.get<{ v: number }>(keyFor('stats'))
    expect(raw?.v).toBe(1)
  })
})
