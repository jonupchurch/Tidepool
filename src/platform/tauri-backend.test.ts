// The desktop backend must satisfy the identical SaveStore contract the web and
// memory backends do — that's the swappable-seam property (009 FR-003). Beyond
// the contract, the interesting behaviour is what happens when the disk misbehaves:
// a game should keep running when a save file is corrupt or unwritable.
import { runSaveStoreContract } from './save-store.contract'
import { keyFor } from './save-store'
import { DEFAULTS } from './schemas'
import { type SaveFileTransport, TauriBackend, createTauriBackend } from './tauri-backend'

/** An in-memory stand-in for the file on disk. */
function fakeDisk(initial: string | null = null) {
  const state = { text: initial, writes: 0 }
  const transport: SaveFileTransport = {
    load: async () => state.text,
    store: async (text) => {
      state.writes++
      state.text = text
    },
  }
  return { state, transport }
}

runSaveStoreContract('tauri', () => createTauriBackend({ transport: fakeDisk().transport }))

describe('TauriBackend persistence', () => {
  it('writes the whole save as one JSON document', async () => {
    const { state, transport } = fakeDisk()
    const store = new TauriBackend({ transport })
    await store.set(keyFor('stats'), { ...DEFAULTS.stats(), boardsSolved: 3 })

    const doc = JSON.parse(state.text!) as Record<string, { boardsSolved: number }>
    expect(Object.keys(doc)).toEqual([keyFor('stats')])
    expect(doc[keyFor('stats')].boardsSolved).toBe(3)
  })

  it('restores what a previous session wrote', async () => {
    const { state, transport } = fakeDisk()
    const first = new TauriBackend({ transport })
    await first.set(keyFor('settings'), { ...DEFAULTS.settings(), theme: 'Night' })

    // A fresh backend over the same disk — i.e. relaunching the app.
    const second = new TauriBackend({ transport })
    expect(await second.get<{ theme: string }>(keyFor('settings'))).toMatchObject({ theme: 'Night' })
    expect(state.writes).toBe(1)
  })

  it('coalesces a burst of writes into a single file write', async () => {
    // Marking a cell touches several namespaces; that should be one write, not
    // one per namespace, or autosave would hammer the disk mid-solve.
    const { state, transport } = fakeDisk()
    const store = new TauriBackend({ transport })
    void store.set(keyFor('stats'), DEFAULTS.stats())
    void store.set(keyFor('journal'), DEFAULTS.journal())
    await store.set(keyFor('inProgressBoard'), DEFAULTS.inProgressBoard())

    expect(state.writes).toBe(1)
    const doc = JSON.parse(state.text!) as Record<string, unknown>
    expect(Object.keys(doc).sort()).toEqual(
      [keyFor('stats'), keyFor('journal'), keyFor('inProgressBoard')].sort(),
    )
  })

  it('reads the file once, however many keys are read', async () => {
    let loads = 0
    const store = new TauriBackend({
      transport: { load: async () => (loads++, null), store: async () => {} },
    })
    await store.get(keyFor('stats'))
    await store.get(keyFor('journal'))
    await store.get(keyFor('settings'))
    expect(loads).toBe(1)
  })
})

describe('TauriBackend degradation', () => {
  it('starts fresh (and says so) when the save file is corrupt', async () => {
    const notices: string[] = []
    const { transport } = fakeDisk('{ this is not json')
    const store = new TauriBackend({ transport, onNotice: (m) => notices.push(m) })

    expect(await store.get(keyFor('stats'))).toBeNull()
    expect(notices.join(' ')).toMatch(/could not be read/i)
  })

  it('ignores a save file that is valid JSON but not a document', async () => {
    const { transport } = fakeDisk('[1,2,3]')
    const store = new TauriBackend({ transport })
    expect(await store.get(keyFor('stats'))).toBeNull()
  })

  it('keeps playing when the disk is unwritable, and says so', async () => {
    const notices: string[] = []
    const store = new TauriBackend({
      transport: {
        load: async () => null,
        store: async () => {
          throw new Error('EACCES')
        },
      },
      onNotice: (m) => notices.push(m),
    })

    // The write fails, but must not throw into the game loop...
    await expect(store.set(keyFor('stats'), DEFAULTS.stats())).resolves.toBeUndefined()
    expect(notices.join(' ')).toMatch(/could not be written/i)
    // ...and the session keeps the value, so play continues normally.
    expect(await store.get(keyFor('stats'))).toEqual(DEFAULTS.stats())
  })

  it('starts fresh when the save cannot be read at all', async () => {
    const notices: string[] = []
    const store = new TauriBackend({
      transport: {
        load: async () => {
          throw new Error('EIO')
        },
        store: async () => {},
      },
      onNotice: (m) => notices.push(m),
    })
    expect(await store.get(keyFor('settings'))).toBeNull()
    expect(notices.join(' ')).toMatch(/could not be read/i)
  })
})
