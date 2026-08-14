// audio-engine.ts — a tiny Web Audio player for game SFX. Decodes each present
// sound into a buffer once, then plays fire-and-forget (overlapping-safe, unlike
// a single <audio> element). Respects mute/volume via a master gain. Degrades to
// a no-op silent engine where Web Audio is unavailable (tests / SSR). Nothing in
// core/ or game/ ever imports this — audio is a presentation concern.
import { type BakedLoop, bakeCrossfadeLoop } from './loop'
import { type MusicTrack, defaultTrack } from './music'
import { type SoundId, SOUND_URLS } from './sounds'

export interface AudioEngine {
  /** Create/resume the audio context — call from a user gesture (autoplay policy).
   *  Also starts the ambient bed, if music is on: the same gesture that permits
   *  audio is the one that may begin it (014 FR-006). */
  unlock(): void
  /** Play a sound once (no-op if muted, unavailable, or the file isn't present). */
  play(id: SoundId): void
  /** Master mute — silences everything, music included, without disturbing the
   *  stored music preference (014 FR-004). */
  setMuted(muted: boolean): void
  setVolume(volume: number): void
  /** Level for the sound-effect channel alone, 0..1. */
  setSfxVolume(volume: number): void
  /** Turn the ambient bed on/off, independently of the sound effects. */
  setMusicEnabled(enabled: boolean): void
  /** Level for the music channel alone, 0..1. */
  setMusicVolume(volume: number): void
}

/** How long after a play request a just-decoded clip may still fire (ms). */
const LATE_MS = 500

/** Music fade, in seconds. Long enough that a mid-phrase stop doesn't pop,
 *  short enough that the switch still feels like a switch. */
const MUSIC_FADE = 0.6

/** The master gain a mute/volume resolves to. */
export function effectiveGain(muted: boolean, volume: number): number {
  if (muted) return 0
  return Math.max(0, Math.min(1, volume))
}

type AudioCtor = typeof AudioContext

function audioContextCtor(): AudioCtor | null {
  const g = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }
  return g.AudioContext ?? g.webkitAudioContext ?? null
}

class WebAudioEngine implements AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  /** Effects sit on their own gain so `volume` stays a true master and the two
   *  channels can be levelled against each other without one scaling the
   *  other (014 FR-011). */
  private sfxGain: GainNode | null = null
  private sfxVolume = 1
  private buffers = new Map<SoundId, AudioBuffer | null>()
  private muted = false
  private volume = 0.8
  private preloaded = false
  /** In flight while the clips decode; awaited by a play that arrives early. */
  private preloading: Promise<void> | null = null

  // ── Music channel ───────────────────────────────────────────────────────────
  // Its own gain under the master, so the music switch and the master mute are
  // independent and compose (FR-004). At most ONE source node ever exists:
  // a node is single-use, and rapid toggling is exactly how you end up with two
  // beds playing over each other.
  private musicGain: GainNode | null = null
  private musicBuffer: AudioBuffer | null = null
  private musicSource: AudioBufferSourceNode | null = null
  private musicLoading: Promise<void> | null = null
  /** The crossfade is baked into the buffer, so it must happen exactly once. */
  private musicLooped = false
  private musicLoop: BakedLoop | null = null
  /** Guards the await inside startMusic against a second concurrent start. */
  private musicStarting = false
  private musicEnabled = true
  private musicVolume = 0.5
  private readonly track: MusicTrack | null = defaultTrack()

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctor = audioContextCtor()
    if (!Ctor) return null
    try {
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = effectiveGain(this.muted, this.volume)
      this.master.connect(this.ctx.destination)
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = this.sfxVolume
      this.sfxGain.connect(this.master)
      this.musicGain = this.ctx.createGain()
      // Starts silent and fades in — so a bed can never begin at full level.
      this.musicGain.gain.value = 0
      this.musicGain.connect(this.master)
      this.preloading = this.preload()
      void this.preloading
    } catch {
      this.ctx = null
      this.master = null
      this.sfxGain = null
      this.musicGain = null
    }
    return this.ctx
  }

  private async preload(): Promise<void> {
    if (this.preloaded || !this.ctx) return
    this.preloaded = true
    const entries = Object.entries(SOUND_URLS) as [SoundId, string][]
    await Promise.all(
      entries.map(async ([id, url]) => {
        try {
          const res = await fetch(url)
          if (!res.ok) {
            this.buffers.set(id, null)
            return
          }
          const data = await res.arrayBuffer()
          this.buffers.set(id, await this.ctx!.decodeAudioData(data))
        } catch {
          this.buffers.set(id, null) // unreadable/undecodable → silent, never throws
        }
      }),
    )
  }

  unlock(): void {
    const ctx = this.ensureContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    if (this.musicEnabled) void this.startMusic()
  }

  play(id: SoundId): void {
    if (this.muted) return
    const ctx = this.ensureContext()
    if (!ctx || !this.master) return
    const buf = this.buffers.get(id)
    if (buf) {
      this.start(buf)
      return
    }
    // The clips only begin decoding when the context is created, which happens
    // on the first gesture — the same gesture that asks for the first sound. So
    // the very first mark of a session would otherwise be silently swallowed.
    // Wait for the decode and play it then, unless too much time has passed for
    // the sound to still belong to what the player just did.
    if (this.preloading && !this.buffers.has(id)) {
      const asked = Date.now()
      void this.preloading.then(() => {
        if (this.muted || Date.now() - asked > LATE_MS) return
        const ready = this.buffers.get(id)
        if (ready) this.start(ready)
      })
    }
  }

  private start(buf: AudioBuffer): void {
    if (!this.ctx || !this.sfxGain) return
    try {
      const src = this.ctx.createBufferSource()
      src.buffer = buf
      src.connect(this.sfxGain)
      src.start()
    } catch {
      // a failed play should never break gameplay
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master) this.master.gain.value = effectiveGain(muted, this.volume)
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.master) this.master.gain.value = effectiveGain(this.muted, this.volume)
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume
  }

  setMusicEnabled(enabled: boolean): void {
    if (enabled === this.musicEnabled) return
    this.musicEnabled = enabled
    // No context yet means no user gesture yet; `unlock()` will honour the flag.
    if (!this.ctx) return
    if (enabled) void this.startMusic()
    else this.stopMusic()
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    if (this.musicSource) this.rampMusic(this.musicVolume, 0.1)
  }

  /** Fetch + decode the bed, once. Any failure leaves the buffer null (silence). */
  private loadMusic(): Promise<void> {
    if (this.musicLoading) return this.musicLoading
    this.musicLoading = (async () => {
      if (!this.ctx || !this.track) return
      try {
        const res = await fetch(this.track.url)
        if (!res.ok) return
        this.musicBuffer = await this.ctx.decodeAudioData(await res.arrayBuffer())
      } catch {
        this.musicBuffer = null // unreadable/undecodable → silent, never throws
      }
    })()
    return this.musicLoading
  }

  private async startMusic(): Promise<void> {
    const ctx = this.ensureContext()
    if (!ctx || !this.musicGain || !this.track) return
    if (this.musicSource || this.musicStarting) return
    this.musicStarting = true
    try {
      await this.loadMusic()
      // Decoding takes a while; the player may have switched music off, or a
      // source may have appeared, in the meantime.
      if (!this.musicEnabled || !this.musicBuffer || this.musicSource) return
      const src = ctx.createBufferSource()
      src.buffer = this.musicBuffer
      src.loop = true

      // Trim the container's padding only if the decoder didn't already. A
      // buffer at (or below) the master's true length has been trimmed for us,
      // and re-trimming would cut real audio.
      const lp = this.track.loop
      const padded = !!lp && this.musicBuffer.duration > lp.duration + 0.001
      const head = padded && lp ? lp.start : 0
      let from = 0
      if (padded && lp) {
        src.loopStart = lp.start
        src.loopEnd = lp.start + lp.duration
        from = lp.start
      }

      // A composed track (intro + outro) can't be looped end-to-end without an
      // audible swell down and back, so loop an inner region and crossfade the
      // seam instead. Playback still starts at 0, so the intro is heard once
      // per session and the loop never touches either ramp. Baked once, on the
      // buffer, so the bed stays a single source node — see loop.ts.
      if (this.track.loopRegion && !this.musicLooped) {
        const chans: Float32Array[] = []
        for (let c = 0; c < this.musicBuffer.numberOfChannels; c++) {
          chans.push(this.musicBuffer.getChannelData(c))
        }
        const baked = bakeCrossfadeLoop(
          chans,
          this.musicBuffer.sampleRate,
          this.track.loopRegion,
          head,
        )
        // A region that doesn't fit the material falls through to the whole-file
        // loop above: worse, but never silent and never out of bounds.
        if (baked) {
          src.loopStart = baked.loopStart
          src.loopEnd = baked.loopEnd
          from = 0
        }
        // The bake mutates the buffer, so it must happen exactly once however
        // many times the bed is stopped and restarted.
        this.musicLooped = true
        this.musicLoop = baked
      } else if (this.musicLoop) {
        src.loopStart = this.musicLoop.loopStart
        src.loopEnd = this.musicLoop.loopEnd
        from = 0
      }

      src.connect(this.musicGain)
      src.start(0, from)
      this.musicSource = src
      this.rampMusic(this.musicVolume, MUSIC_FADE)
    } catch {
      // a failed bed should never break the game
    } finally {
      this.musicStarting = false
    }
  }

  private stopMusic(): void {
    const src = this.musicSource
    if (!src || !this.ctx) return
    this.musicSource = null // drop it first: a stopping node is not the bed
    this.rampMusic(0, MUSIC_FADE)
    try {
      src.stop(this.ctx.currentTime + MUSIC_FADE)
      src.onended = () => {
        try {
          src.disconnect()
        } catch {
          // already torn down
        }
      }
    } catch {
      // already stopped
    }
  }

  private rampMusic(to: number, seconds: number): void {
    if (!this.ctx || !this.musicGain) return
    const g = this.musicGain.gain
    const now = this.ctx.currentTime
    try {
      g.cancelScheduledValues(now)
      g.setValueAtTime(g.value, now)
      g.linearRampToValueAtTime(to, now + seconds)
    } catch {
      g.value = to
    }
  }
}

const SILENT: AudioEngine = {
  unlock() {},
  play() {},
  setMuted() {},
  setVolume() {},
  setSfxVolume() {},
  setMusicEnabled() {},
  setMusicVolume() {},
}

export function createAudioEngine(): AudioEngine {
  return audioContextCtor() ? new WebAudioEngine() : SILENT
}

let singleton: AudioEngine | null = null

/** The process-wide audio engine (created on first use). */
export function getAudioEngine(): AudioEngine {
  if (!singleton) singleton = createAudioEngine()
  return singleton
}

/** Test-only: drop the cached singleton so the next getAudioEngine rebuilds it. */
export function resetAudioEngineForTests(): void {
  singleton = null
}
