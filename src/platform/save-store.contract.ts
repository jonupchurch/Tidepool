// save-store.contract.ts — the reusable backend contract. Every SaveStore
// backend (memory, web, later Tauri) must pass this identical suite; running it
// against each backend proves the swappable-seam property (FR-007) by
// construction. Not a test file itself — invoked from *.test.ts.
import { keyFor, type SaveStore } from './save-store'
import { DEFAULTS, NAMESPACES } from './schemas'

/** Register the shared SaveStore contract against a backend factory. */
export function runSaveStoreContract(
  name: string,
  makeStore: () => SaveStore | Promise<SaveStore>,
): void {
  describe(`SaveStore contract: ${name}`, () => {
    it('round-trips a record for every namespace', async () => {
      const store = await makeStore()
      for (const ns of NAMESPACES) {
        const value = DEFAULTS[ns]()
        await store.set(keyFor(ns), value)
        expect(await store.get(keyFor(ns))).toEqual(value)
      }
    })

    it('returns null for an absent key', async () => {
      const store = await makeStore()
      expect(await store.get(keyFor('settings'))).toBeNull()
    })

    it('remove deletes a key', async () => {
      const store = await makeStore()
      await store.set(keyFor('stats'), DEFAULTS.stats())
      await store.remove(keyFor('stats'))
      expect(await store.get(keyFor('stats'))).toBeNull()
    })

    it('overwrite is last-write-wins', async () => {
      const store = await makeStore()
      await store.set(keyFor('shellPrefs'), { ...DEFAULTS.shellPrefs(), theme: 'A' })
      await store.set(keyFor('shellPrefs'), { ...DEFAULTS.shellPrefs(), theme: 'B' })
      expect((await store.get<{ theme: string }>(keyFor('shellPrefs')))?.theme).toBe('B')
    })

    it('keeps namespaces isolated from each other', async () => {
      const store = await makeStore()
      await store.set(keyFor('stats'), { ...DEFAULTS.stats(), boardsSolved: 5 })
      await store.set(keyFor('onboarding'), { ...DEFAULTS.onboarding(), completed: true })
      expect((await store.get<{ boardsSolved: number }>(keyFor('stats')))?.boardsSolved).toBe(5)
      expect((await store.get<{ completed: boolean }>(keyFor('onboarding')))?.completed).toBe(true)
    })
  })
}
