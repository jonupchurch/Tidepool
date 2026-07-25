// audio-engine.ts — a tiny Web Audio player for game SFX. Decodes each present
// sound into a buffer once, then plays fire-and-forget (overlapping-safe, unlike
// a single <audio> element). Respects mute/volume via a master gain. Degrades to
// a no-op silent engine where Web Audio is unavailable (tests / SSR). Nothing in
// core/ or game/ ever imports this — audio is a presentation concern.
import { type SoundId, SOUND_URLS } from './sounds'

export interface AudioEngine {
  /** Create/resume the audio context — call from a user gesture (autoplay policy). */
  unlock(): void
  /** Play a sound once (no-op if muted, unavailable, or the file isn't present). */
  play(id: SoundId): void
  setMuted(muted: boolean): void
  setVolume(volume: number): void
}

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
  private buffers = new Map<SoundId, AudioBuffer | null>()
  private muted = false
  private volume = 0.8
  private preloaded = false

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctor = audioContextCtor()
    if (!Ctor) return null
    try {
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = effectiveGain(this.muted, this.volume)
      this.master.connect(this.ctx.destination)
      void this.preload()
    } catch {
      this.ctx = null
      this.master = null
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
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }

  play(id: SoundId): void {
    if (this.muted) return
    const ctx = this.ensureContext()
    if (!ctx || !this.master) return
    const buf = this.buffers.get(id)
    if (!buf) return // absent / still decoding → silence
    try {
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(this.master)
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
}

const SILENT: AudioEngine = {
  unlock() {},
  play() {},
  setMuted() {},
  setVolume() {},
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
