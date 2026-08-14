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
  /** What this node was connected to — the channel gain it feeds. */
  connectedTo: unknown
}

function installFakeWebAudio({ decodedDuration = 1 }: { decodedDuration?: number } = {}) {
  const started: string[] = []
  /** Every source node created, so tests can assert loop wiring and stops. */
  const sources: FakeSourceNode[] = []
  /** Every gain node created, in creation order: master, sfx, music (015).
   *  Recorded so the *routing* can be asserted, not just the gain values —
   *  "master" is a claim about the graph, and nothing else here checks it. */
  const gains: FakeGain[] = []
  /** The contexts created, so `destination` identity is available to tests. */
  const contexts: FakeCtx[] = []
  let releaseDecode: (() => void) | null = null
  const decodeGate = new Promise<void>((r) => {
    releaseDecode = r
  })

  class FakeGain {
    /** The node this gain feeds. */
    connectedTo: unknown = null
    gain = {
      value: 1,
      cancelScheduledValues() {},
      setValueAtTime() {},
      linearRampToValueAtTime(v: number) {
        this.value = v
      },
    }
    connect(dest: unknown) {
      this.connectedTo = dest
    }
  }
  class FakeSource implements FakeSourceNode {
    buffer: unknown = null
    loop = false
    loopStart = 0
    loopEnd = 0
    stopped = false
    connectedTo: unknown = null
    onended: (() => void) | null = null
    connect(dest: unknown) {
      this.connectedTo = dest
    }
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
    constructor() {
      contexts.push(this)
    }
    createGain() {
      const g = new FakeGain()
      gains.push(g)
      return g
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
    gains,
    contexts,
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

// 015 — "master volume" is a claim about the SHAPE of the graph, not about a
// number. `effectiveGain` is well covered above, but it would keep passing if
// `musicGain` were connected straight to the destination — and the master
// control would then quietly govern sound effects only. These tests state the
// routing outright so that refactor fails loudly instead.
describe('the master gain governs both channels (015)', () => {
  it('routes effects and music through one master node', async () => {
    const fake = installFakeWebAudio()
    try {
      resetAudioEngineForTests()
      const audio = getAudioEngine()
      audio.unlock()
      fake.releaseDecode()
      await settle()
      audio.play('water')
      await settle()

      // Creation order in `ensureContext`: master, sfx, music.
      const [master, sfx, music] = fake.gains
      expect(fake.gains.length, 'three channels: master, sfx, music').toBe(3)
      expect(master.connectedTo, 'master feeds the speakers').toBe(fake.contexts[0]?.destination)
      expect(sfx.connectedTo, 'effects run through the master').toBe(master)
      expect(music.connectedTo, 'music runs through the master too').toBe(master)

      // And the sources genuinely sit on their own channel, so neither bypasses
      // the master by connecting somewhere else.
      const oneShot = fake.sources.find((s) => !s.loop)
      const bed = fake.sources.find((s) => s.loop)
      expect(oneShot?.connectedTo, 'a sound effect feeds the sfx channel').toBe(sfx)
      expect(bed?.connectedTo, 'the ambient bed feeds the music channel').toBe(music)
    } finally {
      fake.restore()
      resetAudioEngineForTests()
    }
  })

  it('setVolume moves the master alone, so the channel balance is preserved', async () => {
    const fake = installFakeWebAudio()
    try {
      resetAudioEngineForTests()
      const audio = getAudioEngine()
      audio.unlock()
      fake.releaseDecode()
      await settle()

      const [master, sfx, music] = fake.gains
      audio.setSfxVolume(0.9)
      audio.setMusicVolume(0.4)
      await settle()
      expect(sfx.gain.value).toBeCloseTo(0.9, 6)
      expect(music.gain.value).toBeCloseTo(0.4, 6)

      audio.setVolume(0.25)
      await settle()

      expect(master.gain.value, 'the master takes the new level').toBeCloseTo(0.25, 6)
      expect(sfx.gain.value, 'the effects channel is untouched').toBeCloseTo(0.9, 6)
      expect(music.gain.value, 'the music channel is untouched').toBeCloseTo(0.4, 6)

      // What the player actually hears is the product of the two — so the ratio
      // between the channels is the same at every master level (FR-009).
      const ratio = (sfx.gain.value * master.gain.value) / (music.gain.value * master.gain.value)
      expect(ratio).toBeCloseTo(0.9 / 0.4, 6)
    } finally {
      fake.restore()
      resetAudioEngineForTests()
    }
  })

  it('mute and volume compose on the master without disturbing either channel', async () => {
    const fake = installFakeWebAudio()
    try {
      resetAudioEngineForTests()
      const audio = getAudioEngine()
      audio.unlock()
      fake.releaseDecode()
      await settle()

      const [master, sfx, music] = fake.gains
      audio.setVolume(0.6)
      audio.setMuted(true)
      expect(master.gain.value, 'muted wins over the level').toBe(0)

      // Mute is a separate switch (015 FR-007): a level set while muted is
      // remembered, and unmuting restores exactly it.
      audio.setVolume(0.35)
      expect(master.gain.value, 'still silent while muted').toBe(0)
      audio.setMuted(false)
      expect(master.gain.value, 'the level chosen while muted is what returns').toBeCloseTo(0.35, 6)

      // Neither channel gain moved throughout.
      expect(sfx.gain.value).toBeCloseTo(1, 6)
      expect(music.gain.value).toBeCloseTo(0.5, 6)
    } finally {
      fake.restore()
      resetAudioEngineForTests()
    }
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
