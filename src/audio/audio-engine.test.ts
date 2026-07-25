// Audio engine (scaffold): the pure gain resolution, the catalog, and the
// silent-fallback contract in a non-Web-Audio host. Real playback (Web Audio node
// wiring) is exercised in-browser via the gameplay e2e (must stay error-free).
import { SOUND_IDS, SOUND_URLS } from './sounds'
import { effectiveGain, getAudioEngine, resetAudioEngineForTests } from './audio-engine'

describe('effectiveGain', () => {
  it('is 0 when muted, regardless of volume', () => {
    expect(effectiveGain(true, 1)).toBe(0)
    expect(effectiveGain(true, 0.5)).toBe(0)
  })
  it('passes volume through when unmuted, clamped to [0,1]', () => {
    expect(effectiveGain(false, 0.7)).toBe(0.7)
    expect(effectiveGain(false, 1.5)).toBe(1)
    expect(effectiveGain(false, -1)).toBe(0)
  })
})

describe('sound catalog', () => {
  it('lists a distinct id for every event', () => {
    expect(new Set(SOUND_IDS).size).toBe(SOUND_IDS.length)
    expect(SOUND_IDS).toContain('mistake')
    expect(SOUND_IDS).toContain('boardComplete')
  })
  it('only maps URLs for real, known sound ids (empty until files are added)', () => {
    for (const id of Object.keys(SOUND_URLS)) {
      expect(SOUND_IDS).toContain(id)
    }
  })
})

describe('silent fallback (no Web Audio host)', () => {
  it('returns an engine whose methods are safe no-ops', () => {
    resetAudioEngineForTests()
    const audio = getAudioEngine()
    // jsdom has no AudioContext → the silent engine; none of these throw.
    expect(() => {
      audio.setMuted(true)
      audio.setVolume(0.5)
      audio.unlock()
      audio.play('water')
      audio.play('boardComplete')
    }).not.toThrow()
  })

  it('is a stable singleton until reset', () => {
    const a = getAudioEngine()
    expect(getAudioEngine()).toBe(a)
    resetAudioEngineForTests()
    // a fresh instance after reset (identity may differ; contract is it rebuilds)
    expect(getAudioEngine()).toBeDefined()
  })
})
