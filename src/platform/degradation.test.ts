// Graceful degradation (T026-T029 / FR-008, SC-005): under quota, corruption,
// or disabled storage the app keeps running and never destroys still-valid data.
import { IDBFactory } from 'fake-indexeddb'
import { createSaveStore } from './index'
import { keyFor, loadRecord } from './save-store'
import { DEFAULTS } from './schemas'
import { samples } from './test-helpers'
import { createWebBackend } from './web-backend'

beforeEach(() => {
  localStorage.clear()
  ;(globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory()
})

describe('quota exceeded (T026)', () => {
  it('surfaces a gentle notice, does not throw, and preserves prior data', async () => {
    const notices: string[] = []
    const store = createWebBackend({ onNotice: (m) => notices.push(m) })
    await store.set(keyFor('stats'), samples.stats())

    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError')
    }
    await expect(store.set(keyFor('settings'), samples.settings())).resolves.toBeUndefined()
    Storage.prototype.setItem = original

    expect(notices.length).toBeGreaterThan(0)
    const restarted = createWebBackend()
    expect(await loadRecord(restarted, 'stats')).toEqual(samples.stats()) // prior data intact
  })
})

describe('corrupt single key isolation (T027)', () => {
  it('resets only the corrupt namespace to default; others read intact', async () => {
    const seed = createWebBackend()
    await seed.set(keyFor('settings'), samples.settings())
    // Corrupt just the stats key at the storage layer.
    localStorage.setItem(keyFor('stats'), '{ this is not json')

    const store = createWebBackend()
    expect(await loadRecord(store, 'stats')).toEqual(DEFAULTS.stats()) // corrupt → default
    expect(await loadRecord(store, 'settings')).toEqual(samples.settings()) // neighbour intact
  })
})

describe('disabled storage fallback (T028)', () => {
  it('falls back to an in-memory store with a notice when storage is unavailable', async () => {
    const notices: string[] = []
    const original = Storage.prototype.setItem
    // Make the availability probe fail (private-mode style).
    Storage.prototype.setItem = () => {
      throw new DOMException('denied', 'SecurityError')
    }
    const store = createSaveStore({ onNotice: (m) => notices.push(m) })
    Storage.prototype.setItem = original

    expect(notices.some((m) => /unavailable/i.test(m))).toBe(true)
    // The fallback store still works for the session.
    await store.set(keyFor('stats'), samples.stats())
    expect(await loadRecord(store, 'stats')).toEqual(samples.stats())
  })
})

describe('concurrent rapid writes (T029)', () => {
  it('last-write-wins per key with no cross-key interleaving', async () => {
    const store = createWebBackend()
    const writes: Promise<void>[] = []
    for (let i = 0; i < 20; i++) {
      writes.push(store.set(keyFor('stats'), { ...DEFAULTS.stats(), boardsSolved: i }))
      writes.push(store.set(keyFor('onboarding'), { ...DEFAULTS.onboarding(), seen: i % 2 === 0 }))
    }
    await Promise.all(writes)

    const restarted = createWebBackend()
    expect((await restarted.get<{ boardsSolved: number }>(keyFor('stats')))?.boardsSolved).toBe(19)
    expect((await restarted.get<{ seen: boolean }>(keyFor('onboarding')))?.seen).toBe(false)
  })
})
