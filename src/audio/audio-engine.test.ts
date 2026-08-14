// Audio engine (scaffold): the pure gain resolution, the catalog, and the
// silent-fallback contract in a non-Web-Audio host. Real playback (Web Audio node
// wiring) is exercised in-browser via the gameplay e2e (must stay error-free).
import { SOUND_IDS, SOUND_URLS } from './sounds'
import { MUSIC_TRACKS, defaultTrack } from './music'
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

// jsdom has no Web Audio, so this stands one up: enough of the API for the
// engine to run, with decode deliberately deferred so a play can arrive first.
interface FakeSourceNode {
  buffer: unknown
  loop: boolean
  loopStart: number
  loopEnd: number
  stopped: boolean
}

function installFakeWebAudio({ decodedDuration = 1 }: { decodedDuration?: number } = {}) {
  const started: string[] = []
  /** Every source node created, so tests can assert loop wiring and stops. */
  const sources: FakeSourceNode[] = []
  let releaseDecode: (() => void) | null = null
  const decodeGate = new Promise<void>((r) => {
    releaseDecode = r
  })

  class FakeGain {
    gain = {
      value: 1,
      cancelScheduledValues() {},
      setValueAtTime() {},
      linearRampToValueAtTime(v: number) {
        this.value = v
      },
    }
    connect() {}
  }
  class FakeSource implements FakeSourceNode {
    buffer: unknown = null
    loop = false
    loopStart = 0
    loopEnd = 0
    stopped = false
    onended: (() => void) | null = null
    connect() {}
    start() {
      // Only one-shots. `loop` is set before start() for the ambient bed, and
      // the bed now also begins on unlock() — without this split it would show
      // up as a phantom sound effect in the SFX tests below.
      if (!this.loop) started.push(String((this.buffer as { id?: string })?.id ?? '?'))
    }
    stop() {
      this.stopped = true
    }
    disconnect() {}
  }
  class FakeCtx {
    state = 'running'
    currentTime = 0
    destination = {}
    createGain() {
      return new FakeGain()
    }
    createBufferSource() {
      const s = new FakeSource()
      sources.push(s)
      return s
    }
    async decodeAudioData(buf: ArrayBuffer) {
      await decodeGate // hold every decode until the test lets go
      return { id: `buf${buf.byteLength}`, duration: decodedDuration }
    }
    resume() {}
  }

  const g = globalThis as unknown as Record<string, unknown>
  const prevCtx = g.AudioContext
  const prevFetch = g.fetch
  g.AudioContext = FakeCtx
  g.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })

  return {
    started,
    sources,
    releaseDecode: () => releaseDecode?.(),
    restore() {
      g.AudioContext = prevCtx
      g.fetch = prevFetch
    },
  }
}

/** Let the decode promise chain drain. */
const settle = () => new Promise((r) => setTimeout(r, 0))

describe('the first sound of a session', () => {
  it('is not swallowed while the clips are still decoding', async () => {
    // The clips only start decoding when the context is created — on the very
    // same gesture that asks for the first sound. Playing straight through
    // would drop it, leaving the first mark of every session silent.
    const fake = installFakeWebAudio()
    try {
      resetAudioEngineForTests()
      const audio = getAudioEngine()
      audio.unlock() // creates the context, kicks off decoding
      audio.play('water') // asked for before any buffer exists

      expect(fake.started, 'nothing can play yet — still decoding').toEqual([])
      fake.releaseDecode()
      await new Promise((r) => setTimeout(r, 0))

      expect(fake.started.length, 'the pending sound fires once decoded').toBe(1)
    } finally {
      fake.restore()
      resetAudioEngineForTests()
    }
  })

  it('stays silent if the decode lands long after the moment passed', async () => {
    const fake = installFakeWebAudio()
    const realNow = Date.now
    try {
      resetAudioEngineForTests()
      const audio = getAudioEngine()
      audio.unlock()
      audio.play('water')

      // The decode finishes a full minute later — far too late to belong to
      // what the player just did.
      Date.now = () => realNow() + 60_000
      fake.releaseDecode()
      await new Promise((r) => setTimeout(r, 0))

      expect(fake.started).toEqual([])
    } finally {
      Date.now = realNow
      fake.restore()
      resetAudioEngineForTests()
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
      audio.setSfxVolume(0.5)
      audio.setMusicVolume(0.3)
      audio.setMusicEnabled(false)
      audio.setMusicEnabled(true)
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

// 014 — the ambient bed. The state machine is what is testable without real
// audio: one source ever, started only after a gesture, stopped on demand.
describe('music catalog', () => {
  it('only exposes tracks discovered from the music folder', () => {
    for (const t of MUSIC_TRACKS) {
      expect(t.url).toBeTruthy()
      expect(t.id).not.toMatch(/\.(mp3|ogg|wav)$/i)
    }
  })

  it('is deterministic about which bed plays', () => {
    expect(defaultTrack()).toEqual(MUSIC_TRACKS[0] ?? null)
  })

  it('carries sane measured loop points for any track that needs them', () => {
    for (const t of MUSIC_TRACKS) {
      if (!t.loop) continue
      expect(t.loop.duration).toBeGreaterThan(0)
      expect(t.loop.start).toBeGreaterThanOrEqual(0)
    }
  })
})

const hasTrack = defaultTrack() !== null

describe.skipIf(!hasTrack)('the ambient bed', () => {
  it('does not start before a user gesture, and starts on one', async () => {
    const fake = installFakeWebAudio()
    try {
      resetAudioEngineForTests()
      const audio = getAudioEngine()
      // No context has been created, so nothing can have been scheduled.
      expect(fake.sources).toHaveLength(0)

      audio.unlock()
      fake.releaseDecode()
      await settle()
      expect(fake.sources.some((s) => s.loop)).toBe(true)
    } finally {
      fake.restore()
      resetAudioEngineForTests()
    }
  })

  it('stops when switched off, and never stacks beds on rapid toggling', async () => {
    const fake = installFakeWebAudio()
    try {
      resetAudioEngineForTests()
      const audio = getAudioEngine()
      audio.unlock()
      fake.releaseDecode()
      await settle()

      const looping = () => fake.sources.filter((s) => s.loop && !s.stopped)
      expect(looping()).toHaveLength(1)

      audio.setMusicEnabled(false)
      await settle()
      expect(looping()).toHaveLength(0)

      // Flip it hard. A source node is single-use, so a careless implementation
      // ends up with two beds playing over each other.
      for (let i = 0; i < 6; i++) {
        audio.setMusicEnabled(i % 2 === 0)
        await settle()
      }
      audio.setMusicEnabled(true)
      await settle()
      expect(looping().length).toBeLessThanOrEqual(1)
    } finally {
      fake.restore()
      resetAudioEngineForTests()
    }
  })

  it('trims container padding only when the decoder left it in place', async () => {
    const track = defaultTrack()
    if (!track?.loop) return
    const { start, duration } = track.loop

    // Decoded LONGER than the master's true length => padding is still there.
    const padded = installFakeWebAudio({ decodedDuration: duration + 0.05 })
    try {
      resetAudioEngineForTests()
      getAudioEngine().unlock()
      padded.releaseDecode()
      await settle()
      const bed = padded.sources.find((s) => s.loop)
      expect(bed?.loopStart).toBeCloseTo(start, 6)
      expect(bed?.loopEnd).toBeCloseTo(start + duration, 6)
    } finally {
      padded.restore()
      resetAudioEngineForTests()
    }

    // Decoded AT the true length => already stripped; re-trimming would cut audio.
    const clean = installFakeWebAudio({ decodedDuration: duration })
    try {
      resetAudioEngineForTests()
      getAudioEngine().unlock()
      clean.releaseDecode()
      await settle()
      const bed = clean.sources.find((s) => s.loop)
      expect(bed?.loopStart).toBe(0)
      expect(bed?.loopEnd).toBe(0)
    } finally {
      clean.restore()
      resetAudioEngineForTests()
    }
  })

  it('master mute silences without tearing the bed down', async () => {
    const fake = installFakeWebAudio()
    try {
      resetAudioEngineForTests()
      const audio = getAudioEngine()
      audio.unlock()
      fake.releaseDecode()
      await settle()
      const live = () => fake.sources.filter((s) => s.loop && !s.stopped).length
      const before = live()

      // Mute works on the master gain, so the bed keeps running underneath and
      // unmuting restores it rather than needing a restart (FR-004).
      audio.setMuted(true)
      await settle()
      expect(live()).toBe(before)

      audio.setMuted(false)
      await settle()
      expect(live()).toBe(before)
    } finally {
      fake.restore()
      resetAudioEngineForTests()
    }
  })
})
