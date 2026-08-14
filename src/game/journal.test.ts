// Journal model (T010/T018/T022/T023): the pure read model + filters + the
// discovery-record branch, and `recordDiscovery` end-to-end through a store.
import { CREATURES } from './creatures'
import { memoryStore } from './journal-fixtures'
import { loadRecord, saveRecord } from '@/platform'
import {
  type DiscoveryMap,
  applyDiscovery,
  buildJournalView,
  countCleanCurated,
  filterCards,
  isNewDiscovery,
  recordBoardSolved,
  recordDiscovery,
} from './journal'
import { loadDiscoveries, loadStats, seedPerfectFromCurated } from './journal-store'

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
    expect(await loadStats(store)).toEqual({
      boardsSolved: 0,
      poolsFilled: 1,
      creaturesFound: 1,
      boardsPerfect: 0,
    })
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
    expect(await loadStats(store)).toEqual({
      boardsSolved: 1,
      poolsFilled: 0,
      creaturesFound: 0,
      boardsPerfect: 0,
    })
  })
})

// 011 — a board finished with no wrong mark ever placed.
describe('recordBoardSolved: perfect solves (FR-001/FR-002)', () => {
  it('a clean solve raises both totals', async () => {
    const store = memoryStore()
    await recordBoardSolved(store, { perfect: true })
    const stats = await loadStats(store)
    expect(stats.boardsSolved).toBe(1)
    expect(stats.boardsPerfect).toBe(1)
  })

  it('a solve with a mistake raises only boards-solved', async () => {
    const store = memoryStore()
    await recordBoardSolved(store, { perfect: false })
    const stats = await loadStats(store)
    expect(stats.boardsSolved).toBe(1)
    expect(stats.boardsPerfect).toBe(0)
  })

  it('accumulates a mixed run of solves', async () => {
    const store = memoryStore()
    for (const perfect of [true, false, true, true, false]) {
      await recordBoardSolved(store, { perfect })
    }
    const stats = await loadStats(store)
    expect(stats.boardsSolved).toBe(5)
    expect(stats.boardsPerfect).toBe(3)
  })

  it('defaults to not-perfect when no verdict is given', async () => {
    const store = memoryStore()
    await recordBoardSolved(store)
    expect((await loadStats(store)).boardsPerfect).toBe(0)
  })
})

describe('countCleanCurated (FR-007/FR-008)', () => {
  it('counts entries whose best run had zero mistakes', () => {
    expect(
      countCleanCurated({
        a: { earnedCreatureId: 'crab', errors: 0 },
        b: { earnedCreatureId: 'limpet', errors: 3 },
        c: { earnedCreatureId: 'crab', errors: 0 },
      }),
    ).toBe(2)
  })

  it('does NOT count entries solved before mistakes were tracked', () => {
    // `errors` absent = solved by an older build. The game would rather
    // under-report than award a perfect it has no evidence for.
    expect(
      countCleanCurated({
        old: { earnedCreatureId: 'crab' },
        clean: { earnedCreatureId: 'crab', errors: 0 },
      }),
    ).toBe(1)
  })

  it('is zero for a player with no curated progress', () => {
    expect(countCleanCurated({})).toBe(0)
  })
})

describe('seedPerfectFromCurated (FR-007) — runs once, ever', () => {
  it('backfills from clean curated solves so an upgrader does not see a zero', async () => {
    const store = memoryStore()
    await saveRecord(store, 'curatedProgress', {
      v: 1,
      solved: {
        a: { earnedCreatureId: 'crab', errors: 0 },
        b: { earnedCreatureId: 'crab', errors: 0 },
        c: { earnedCreatureId: 'limpet', errors: 2 },
        d: { earnedCreatureId: 'limpet' },
      },
    })
    await seedPerfectFromCurated(store)
    expect((await loadStats(store)).boardsPerfect).toBe(2)
  })

  it('is idempotent — restarts never double-count', async () => {
    const store = memoryStore()
    await saveRecord(store, 'curatedProgress', {
      v: 1,
      solved: { a: { earnedCreatureId: 'crab', errors: 0 } },
    })
    await seedPerfectFromCurated(store)
    await seedPerfectFromCurated(store)
    await seedPerfectFromCurated(store)
    expect((await loadStats(store)).boardsPerfect).toBe(1)
  })

  it('does not clobber perfects earned after the backfill', async () => {
    const store = memoryStore()
    await saveRecord(store, 'curatedProgress', {
      v: 1,
      solved: { a: { earnedCreatureId: 'crab', errors: 0 } },
    })
    await seedPerfectFromCurated(store)
    await recordBoardSolved(store, { perfect: true })
    await seedPerfectFromCurated(store) // a later boot
    expect((await loadStats(store)).boardsPerfect).toBe(2)
  })

  it('leaves a fresh player at zero and still marks them seeded', async () => {
    const store = memoryStore()
    await seedPerfectFromCurated(store)
    expect((await loadStats(store)).boardsPerfect).toBe(0)
    expect((await loadRecord(store, 'stats')).perfectSeeded).toBe(true)
  })
})
