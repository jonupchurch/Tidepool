// Settings store (006): changes apply live to every subscriber and round-trip
// through the 008 SaveStore seam.
import { makeFakeStore } from './board-source/test-helpers'
import { DEFAULT_SETTINGS, resolveSettings } from './settings'
import {
  getSettings,
  hydrateSettings,
  replaceSettings,
  resetSettingsStore,
  setSetting,
  subscribeSettings,
} from './settings-store'

beforeEach(() => resetSettingsStore())

describe('settings store', () => {
  it('starts at the first-run defaults', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('applies a change live and notifies subscribers', () => {
    let notified = 0
    subscribeSettings(() => notified++)

    setSetting('visuals', 'theme', 'Night')
    expect(getSettings().visuals.theme).toBe('Night')
    expect(notified).toBe(1)

    setSetting('comfort', 'lineHelper', true)
    expect(getSettings().comfort.lineHelper).toBe(true)
    expect(notified).toBe(2)
  })

  it('is a no-op when the value is unchanged (no needless re-render)', () => {
    let notified = 0
    subscribeSettings(() => notified++)
    setSetting('sound', 'muted', DEFAULT_SETTINGS.sound.muted)
    expect(notified).toBe(0)
  })

  it('hands out a new object per change, so React sees it', () => {
    const before = getSettings()
    setSetting('sound', 'volume', 0.2)
    expect(getSettings()).not.toBe(before)
    expect(before.sound.volume).toBe(DEFAULT_SETTINGS.sound.volume) // untouched
  })

  it('stops notifying after unsubscribe', () => {
    let notified = 0
    const off = subscribeSettings(() => notified++)
    setSetting('sound', 'muted', true)
    off()
    setSetting('sound', 'muted', false)
    expect(notified).toBe(1)
  })

  it('hydrates a record from an earlier build, merging onto defaults', async () => {
    // The original 008 shape — no comfort group, none of the newer fields.
    const store = makeFakeStore({
      settings: {
        v: 1,
        sound: { muted: true, volume: 0.3 },
        visuals: { theme: 'Night', reducedMotion: false, textScale: 1, colorblind: false },
        controls: { swapMarkButtons: true },
        play: { defaultSize: 'Large', defaultDifficulty: 'Deep' },
      },
    })
    let notified = 0
    subscribeSettings(() => notified++)

    const s = await hydrateSettings(store)
    expect(s.sound.muted).toBe(true)
    expect(s.visuals.theme).toBe('Night')
    expect(s.controls.swapMarkButtons).toBe(true)
    expect(s.play.defaultSize).toBe('Large')
    expect(s.comfort).toEqual(DEFAULT_SETTINGS.comfort) // gap filled
    expect(notified).toBe(1) // subscribers learn about the loaded values
  })

  it('falls back to defaults when the platform rejects the record outright', async () => {
    // Two layers of defence: the 008 validator drops a record missing whole
    // groups (returning DEFAULTS), and resolveSettings fills field-level gaps.
    const store = makeFakeStore({ settings: { v: 1, sound: { muted: true } } })
    expect(await hydrateSettings(store)).toEqual(DEFAULT_SETTINGS)
  })

  it('persists a change back through the seam', async () => {
    const store = makeFakeStore()
    await hydrateSettings(store)

    setSetting('visuals', 'colorblind', true)
    await new Promise((r) => setTimeout(r, 0)) // the write is fire-and-forget

    const saved = await store.get<unknown>('tp:v1:settings')
    expect(resolveSettings(saved).visuals.colorblind).toBe(true)
  })

  it('replaceSettings swaps everything at once (import / reset)', async () => {
    const store = makeFakeStore()
    await hydrateSettings(store)
    setSetting('sound', 'muted', true)

    replaceSettings(DEFAULT_SETTINGS)
    expect(getSettings()).toEqual(DEFAULT_SETTINGS)
    await new Promise((r) => setTimeout(r, 0))
    expect(resolveSettings(await store.get('tp:v1:settings')).sound.muted).toBe(false)
  })

  it('does not write before it has a store to write to', () => {
    // No hydrate: setting still applies live, it just has nowhere to persist.
    expect(() => setSetting('sound', 'muted', true)).not.toThrow()
    expect(getSettings().sound.muted).toBe(true)
  })
})
