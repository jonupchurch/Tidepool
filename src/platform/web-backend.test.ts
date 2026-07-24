// Web backend (T010/T013/T015): the shared contract, restart survival across a
// fresh instance, and write coalescing. localStorage + fake IndexedDB are reset
// between tests so each starts clean.
import { IDBFactory } from 'fake-indexeddb'
import { keyFor } from './save-store'
import { runSaveStoreContract } from './save-store.contract'
import { DEFAULTS } from './schemas'
import { samples } from './test-helpers'
import { createWebBackend } from './web-backend'

beforeEach(() => {
  localStorage.clear()
  ;(globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory()
})

runSaveStoreContract('web', () => createWebBackend())

describe('web backend durability', () => {
  it('survives a restart for every namespace (fresh instance, same storage)', async () => {
    const a = createWebBackend()
    await a.set(keyFor('settings'), samples.settings())
    await a.set(keyFor('stats'), samples.stats())
    await a.set(keyFor('inProgressBoard'), { ...DEFAULTS.inProgressBoard(), revealed: ['0,0'] })

    const b = createWebBackend() // "restart"
    expect(await b.get(keyFor('settings'))).toEqual(samples.settings())
    expect(await b.get(keyFor('stats'))).toEqual(samples.stats())
    expect((await b.get<{ revealed: string[] }>(keyFor('inProgressBoard')))?.revealed).toEqual([
      '0,0',
    ])
  })

  it('coalesces a synchronous burst of writes (last-write-wins)', async () => {
    const a = createWebBackend()
    a.set(keyFor('shellPrefs'), { ...DEFAULTS.shellPrefs(), theme: 'A' })
    a.set(keyFor('shellPrefs'), { ...DEFAULTS.shellPrefs(), theme: 'B' })
    await a.set(keyFor('shellPrefs'), { ...DEFAULTS.shellPrefs(), theme: 'C' })

    const b = createWebBackend()
    expect((await b.get<{ theme: string }>(keyFor('shellPrefs')))?.theme).toBe('C')
  })
})
