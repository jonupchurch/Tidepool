// Settings model (006): every field has a first-run default, and any persisted
// shape — partial, older, or hand-edited — resolves to a complete, sane value.
import { DEFAULT_SETTINGS, THEME_CHOICES, resolveSettings, toSettingsRecord } from './settings'

describe('resolveSettings', () => {
  it('returns the defaults for an absent or non-object record (FR-010)', () => {
    expect(resolveSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(resolveSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(resolveSettings('nonsense')).toEqual(DEFAULT_SETTINGS)
    expect(resolveSettings(42)).toEqual(DEFAULT_SETTINGS)
  })

  it('fills every gap in a record written by an earlier build', () => {
    // The original 008 shape: no comfort group, no sfx/highContrast/stopwatch.
    const old = {
      v: 1,
      sound: { muted: true, volume: 0.5 },
      visuals: { theme: 'Night', reducedMotion: true, textScale: 1, colorblind: false },
      controls: { swapMarkButtons: true },
      play: { defaultSize: 'Large', defaultDifficulty: 'Deep' },
    }
    const s = resolveSettings(old)

    // What it said is kept...
    expect(s.sound.muted).toBe(true)
    expect(s.sound.volume).toBe(0.5)
    expect(s.visuals.theme).toBe('Night')
    expect(s.controls.swapMarkButtons).toBe(true)
    expect(s.play.defaultSize).toBe('Large')
    // ...and everything it never knew about takes its default.
    expect(s.comfort).toEqual(DEFAULT_SETTINGS.comfort)
    expect(s.sound.sfx).toBe(DEFAULT_SETTINGS.sound.sfx)
    expect(s.visuals.highContrast).toBe(DEFAULT_SETTINGS.visuals.highContrast)
    expect(s.play.stopwatch).toBe(DEFAULT_SETTINGS.play.stopwatch)
  })

  it('rejects wrong-typed fields rather than trusting them', () => {
    const s = resolveSettings({
      sound: { muted: 'yes', volume: 'loud' },
      visuals: { theme: 'Chartreuse', reducedMotion: 1 },
      controls: 'nope',
      play: { defaultSize: 'Enormous', defaultDifficulty: 'Impossible' },
    })
    expect(s.sound.muted).toBe(DEFAULT_SETTINGS.sound.muted)
    expect(s.sound.volume).toBe(DEFAULT_SETTINGS.sound.volume)
    expect(s.visuals.theme).toBe(DEFAULT_SETTINGS.visuals.theme)
    expect(s.visuals.reducedMotion).toBe(DEFAULT_SETTINGS.visuals.reducedMotion)
    expect(s.controls).toEqual(DEFAULT_SETTINGS.controls)
    expect(s.play.defaultSize).toBe(DEFAULT_SETTINGS.play.defaultSize)
    expect(s.play.defaultDifficulty).toBe(DEFAULT_SETTINGS.play.defaultDifficulty)
  })

  it('clamps numbers into range instead of rejecting them outright', () => {
    const s = resolveSettings({ sound: { volume: 9 }, visuals: { textScale: -3, cellScale: 99 } })
    expect(s.sound.volume).toBe(1)
    expect(s.visuals.textScale).toBe(0.8)
    expect(s.visuals.cellScale).toBe(1.4)
    // NaN/Infinity are not "in range" — they fall back.
    expect(resolveSettings({ sound: { volume: Number.NaN } }).sound.volume).toBe(
      DEFAULT_SETTINGS.sound.volume,
    )
  })

  it('accepts every theme choice', () => {
    for (const theme of THEME_CHOICES) {
      expect(resolveSettings({ visuals: { theme } }).visuals.theme).toBe(theme)
    }
  })

  it('round-trips through the persisted record shape without loss', () => {
    const tweaked = resolveSettings({
      sound: { muted: true, volume: 0.25 },
      visuals: { theme: 'Auto', colorblind: true, cellScale: 1.2 },
      comfort: { lineHelper: true },
      play: { stopwatch: true },
    })
    expect(resolveSettings(toSettingsRecord(tweaked))).toEqual(tweaked)
  })

  it('never shares structure with DEFAULT_SETTINGS', () => {
    const a = resolveSettings(undefined)
    a.sound.volume = 0.1
    expect(DEFAULT_SETTINGS.sound.volume).toBe(0.8)
  })
})
