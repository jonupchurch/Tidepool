// Typed accessors (T009): defaults on absence, round-trip, key/namespace helpers.
import { createMemoryBackend } from './memory-backend'
import { keyFor, loadRecord, namespaceOfKey, removeRecord, saveRecord } from './save-store'
import { DEFAULTS } from './schemas'
import { samples } from './test-helpers'

describe('typed accessors', () => {
  it('loadRecord returns the default for an absent namespace', async () => {
    const store = createMemoryBackend()
    expect(await loadRecord(store, 'stats')).toEqual(DEFAULTS.stats())
  })

  it('saveRecord → loadRecord round-trips a record', async () => {
    const store = createMemoryBackend()
    await saveRecord(store, 'settings', samples.settings())
    expect(await loadRecord(store, 'settings')).toEqual(samples.settings())
  })

  it('removeRecord restores the default on next load', async () => {
    const store = createMemoryBackend()
    await saveRecord(store, 'shellPrefs', samples.shellPrefs())
    await removeRecord(store, 'shellPrefs')
    expect(await loadRecord(store, 'shellPrefs')).toEqual(DEFAULTS.shellPrefs())
  })

  it('a corrupt stored record falls back to the default on read', async () => {
    const store = createMemoryBackend()
    await store.set(keyFor('stats'), { v: 1, boardsSolved: 'not-a-number' })
    expect(await loadRecord(store, 'stats')).toEqual(DEFAULTS.stats())
  })
})

describe('key helpers', () => {
  it('keyFor / namespaceOfKey round-trip', () => {
    expect(keyFor('journal')).toBe('tp:v1:journal')
    expect(namespaceOfKey(keyFor('journal'))).toBe('journal')
    expect(namespaceOfKey('tp:v1:bogus')).toBeNull()
  })
})
