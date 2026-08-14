// Schema migration (T023 / US4, SC-004): older records migrate forward on read;
// newer-version records are refused and preserved, never corrupted.
import { migrateOrDefault, migrateRecord } from './migrate'
import { createMemoryBackend } from './memory-backend'
import { keyFor, loadRecord } from './save-store'
import { DEFAULTS } from './schemas'
import { legacyStatsV0, newerStatsV3, statsV1 } from './test-helpers'

/** Legacy stats after the full v0 → v1 → v2 chain. */
const MIGRATED_STATS = {
  v: 2,
  boardsSolved: 7,
  poolsFilled: 3,
  creaturesFound: 0,
  boardsPerfect: 0,
  perfectSeeded: false,
}

describe('migrateRecord', () => {
  it('migrates a legacy (v0) record forward, transforming fields', () => {
    // legacy `solved` → v1 `boardsSolved`, then v1 → v2 adds perfect tracking
    expect(migrateRecord('stats', legacyStatsV0)).toEqual({ status: 'ok', value: MIGRATED_STATS })
  })

  it('refuses a record from a newer app version', () => {
    expect(migrateRecord('stats', newerStatsV3)).toEqual({ status: 'refused' })
  })

  it('marks a shapeless / unmigratable record invalid', () => {
    expect(migrateRecord('stats', 42).status).toBe('invalid')
    expect(migrateRecord('stats', { v: 1, boardsSolved: 'x' }).status).toBe('invalid')
  })

  it('migrateOrDefault falls back to default, flagging refused', () => {
    expect(migrateOrDefault('stats', newerStatsV3)).toEqual({
      value: DEFAULTS.stats(),
      refused: true,
    })
    expect(migrateOrDefault('stats', 42)).toEqual({ value: DEFAULTS.stats(), refused: false })
  })
})

// The first real vN → vN+1 step in the codebase — every namespace had only ever
// had legacy(0) → 1 — so it is worth pinning rather than trusting the chain.
describe('stats v1 → v2 (011: perfect solves)', () => {
  it('keeps every existing total and adds perfect tracking, unseeded', () => {
    const r = migrateRecord('stats', statsV1)
    expect(r).toEqual({
      status: 'ok',
      value: {
        v: 2,
        boardsSolved: 9,
        poolsFilled: 22,
        creaturesFound: 3,
        boardsPerfect: 0,
        // false, so the backfill from curated progress still gets its one run —
        // a player upgrading with clean solves on record must not see a zero.
        perfectSeeded: false,
      },
    })
  })

  it('does not invent perfect solves out of boards already solved', () => {
    const r = migrateRecord('stats', { ...statsV1, boardsSolved: 500 })
    expect((r as { value: { boardsPerfect: number } }).value.boardsPerfect).toBe(0)
  })
})

describe('migration on the read path', () => {
  it('loadRecord migrates an older stored record to current', async () => {
    const store = createMemoryBackend()
    await store.set(keyFor('stats'), legacyStatsV0)
    expect(await loadRecord(store, 'stats')).toEqual(MIGRATED_STATS)
  })

  it('loadRecord returns default for a newer record WITHOUT overwriting it', async () => {
    const store = createMemoryBackend()
    await store.set(keyFor('stats'), newerStatsV3)
    expect(await loadRecord(store, 'stats')).toEqual(DEFAULTS.stats())
    expect(await store.get(keyFor('stats'))).toEqual(newerStatsV3) // preserved intact
  })
})
