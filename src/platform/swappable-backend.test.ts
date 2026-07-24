// Swappable backend (T017 / FR-007): one consumer routine, written only against
// the SaveStore interface, produces identical results on the memory and web
// backends — the seam is truly interchangeable.
import { IDBFactory } from 'fake-indexeddb'
import { createMemoryBackend } from './memory-backend'
import { type SaveStore, keyFor } from './save-store'
import { samples } from './test-helpers'
import { createWebBackend } from './web-backend'

async function consumerRoutine(store: SaveStore) {
  await store.set(keyFor('stats'), samples.stats())
  await store.set(keyFor('settings'), samples.settings())
  const stats = await store.get(keyFor('stats'))
  const settings = await store.get(keyFor('settings'))
  await store.remove(keyFor('settings'))
  const settingsAfterRemove = await store.get(keyFor('settings'))
  const blob = await store.exportAll()
  return { stats, settings, settingsAfterRemove, blob }
}

beforeEach(() => {
  localStorage.clear()
  ;(globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory()
})

it('identical consumer results on memory and web backends (FR-007)', async () => {
  const viaMemory = await consumerRoutine(createMemoryBackend())
  const viaWeb = await consumerRoutine(createWebBackend())
  expect(viaWeb).toEqual(viaMemory)
})
