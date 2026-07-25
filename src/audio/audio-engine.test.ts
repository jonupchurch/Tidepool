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

// jsdom has no Web Audio, so this stands one up: enough of the API for the
// engine to run, with decode deliberately deferred so a play can arrive first.
function installFakeWebAudio() {
  const started: string[] = []
  let releaseDecode: (() => void) | null = null
  const decodeGate = new Promise<void>((r) => {
    releaseDecode = r
  })

  class FakeGain {
    gain = { value: 1 }
    connect() {}
  }
  class FakeSource {
    buffer: unknown = null
    connect() {}
    start() {
      started.push(String((this.buffer as { id?: string })?.id ?? '?'))
    }
  }
  class FakeCtx {
    state = 'running'
    destination = {}
    createGain() {
      return new FakeGain()
    }
    createBufferSource() {
      return new FakeSource()
    }
    async decodeAudioData(buf: ArrayBuffer) {
      await decodeGate // hold every decode until the test lets go
      return { id: `buf${buf.byteLength}` }
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
    releaseDecode: () => releaseDecode?.(),
    restore() {
      g.AudioContext = prevCtx
      g.fetch = prevFetch
    },
  }
}

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
