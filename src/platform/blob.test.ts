// Export / import (T019 / US3, SC-003): a full round-trip restores every
// namespace; malformed / newer-version blobs are rejected with a reason and
// current data is left intact.
import { createMemoryBackend } from './memory-backend'
import { loadRecord, saveRecord } from './save-store'
import { makeBlob, samples } from './test-helpers'

describe('export / import', () => {
  async function seeded() {
    const store = createMemoryBackend()
    await saveRecord(store, 'settings', samples.settings())
    await saveRecord(store, 'journal', samples.journal())
    await saveRecord(store, 'stats', samples.stats())
    return store
  }

  it('round-trips the whole save into a fresh store', async () => {
    const source = await seeded()
    const blob = await source.exportAll()

    const fresh = createMemoryBackend()
    const result = await fresh.importAll(blob)
    expect(result).toEqual({ ok: true })
    expect(await loadRecord(fresh, 'settings')).toEqual(samples.settings())
    expect(await loadRecord(fresh, 'journal')).toEqual(samples.journal())
    expect(await loadRecord(fresh, 'stats')).toEqual(samples.stats())
  })

  it('export only includes namespaces that have data', async () => {
    const blob = await (await seeded()).exportAll()
    expect(Object.keys(blob.records).sort()).toEqual(['journal', 'settings', 'stats'])
  })

  it('rejects a non-object blob without touching current data', async () => {
    const store = await seeded()
    const result = await store.importAll('not a blob')
    expect(result.ok).toBe(false)
    expect(await loadRecord(store, 'settings')).toEqual(samples.settings())
  })

  it('rejects a newer-schema blob and preserves current data', async () => {
    const store = await seeded()
    const result = await store.importAll({ appVersion: '9', schemaVersion: 999, records: {} })
    expect(result).toEqual({ ok: false, reason: 'save is from a newer version' })
    expect(await loadRecord(store, 'stats')).toEqual(samples.stats())
  })

  it('rejects a blob with an invalid record and writes nothing (atomic)', async () => {
    const store = createMemoryBackend()
    await saveRecord(store, 'stats', samples.stats())
    const bad = makeBlob({
      settings: samples.settings(),
      // @ts-expect-error — deliberately malformed stats record
      stats: { v: 1, boardsSolved: 'nope' },
    })
    const result = await store.importAll(bad)
    expect(result.ok).toBe(false)
    // the valid settings in the blob must NOT have been written (all-or-nothing)
    expect(await store.get('tp:v1:settings')).toBeNull()
    // and the pre-existing stats are untouched
    expect(await loadRecord(store, 'stats')).toEqual(samples.stats())
  })
})
