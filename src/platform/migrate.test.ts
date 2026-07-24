// Schema migration (T023 / US4, SC-004): older records migrate forward on read;
// newer-version records are refused and preserved, never corrupted.
import { migrateOrDefault, migrateRecord } from './migrate'
import { createMemoryBackend } from './memory-backend'
import { keyFor, loadRecord } from './save-store'
import { DEFAULTS } from './schemas'
import { legacyStatsV0, newerStatsV2 } from './test-helpers'

const MIGRATED_STATS = { v: 1, boardsSolved: 7, poolsFilled: 3, creaturesFound: 0 }

describe('migrateRecord', () => {
  it('migrates a legacy (v0) record forward, transforming fields', () => {
    // legacy `solved` → v1 `boardsSolved`
    expect(migrateRecord('stats', legacyStatsV0)).toEqual({ status: 'ok', value: MIGRATED_STATS })
  })

  it('refuses a record from a newer app version', () => {
    expect(migrateRecord('stats', newerStatsV2)).toEqual({ status: 'refused' })
  })

  it('marks a shapeless / unmigratable record invalid', () => {
    expect(migrateRecord('stats', 42).status).toBe('invalid')
    expect(migrateRecord('stats', { v: 1, boardsSolved: 'x' }).status).toBe('invalid')
  })

  it('migrateOrDefault falls back to default, flagging refused', () => {
    expect(migrateOrDefault('stats', newerStatsV2)).toEqual({
      value: DEFAULTS.stats(),
      refused: true,
    })
    expect(migrateOrDefault('stats', 42)).toEqual({ value: DEFAULTS.stats(), refused: false })
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
    await store.set(keyFor('stats'), newerStatsV2)
    expect(await loadRecord(store, 'stats')).toEqual(DEFAULTS.stats())
    expect(await store.get(keyFor('stats'))).toEqual(newerStatsV2) // preserved intact
  })
})
