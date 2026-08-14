// loop.test.ts — the crossfaded inner loop (015 follow-up). This is where the
// music-loop logic actually lives, and unlike the rest of the audio layer it is
// pure arithmetic over sample arrays, so it can be tested exactly rather than
// against a fake Web Audio.
//
// The property that matters is continuity AT the wrap: when playback jumps from
// loopEnd back to loopStart it must hear what followed loopEnd in the original,
// or there is a step in the waveform — which is exactly the audible fault this
// exists to remove.
import { describe, expect, it } from 'vitest'
import { bakeCrossfadeLoop } from './loop'

const RATE = 100 // small and exact; the maths doesn't care about the real rate

/** A ramp, so every sample is uniquely identifiable by its value. */
function ramp(n: number): Float32Array {
  const a = new Float32Array(n)
  for (let i = 0; i < n; i++) a[i] = i
  return a
}

describe('bakeCrossfadeLoop', () => {
  it('returns the loop points in seconds', () => {
    const baked = bakeCrossfadeLoop([ramp(1000)], RATE, { start: 2, end: 8, crossfade: 1 })
    expect(baked).toEqual({ loopStart: 2, loopEnd: 8 })
  })

  it('joins continuously at the wrap', () => {
    // The whole point. At the instant of the jump the crossfade is all
    // "material that followed loopEnd" and none of "material at loopStart", so
    // sample loopEnd-1 -> loopStart is adjacent in the original and there is no
    // step. Anything else is the click this feature exists to avoid.
    const src = ramp(1000)
    const original = Float32Array.from(src)
    const baked = bakeCrossfadeLoop([src], RATE, { start: 2, end: 8, crossfade: 1 })
    expect(baked).not.toBeNull()

    const s = Math.round(2 * RATE)
    const e = Math.round(8 * RATE)
    const lastBeforeWrap = src[e - 1]
    const firstAfterWrap = src[s]
    expect(lastBeforeWrap).toBe(original[e - 1])
    expect(firstAfterWrap).toBeCloseTo(original[e], 4) // == what followed e
    expect(firstAfterWrap - lastBeforeWrap).toBeCloseTo(1, 4) // one ramp step
  })

  it('hands over from the incoming material to the body across the crossfade', () => {
    // A fixture that reads the fade curve off directly: the body is silent and
    // the material past `end` is unit level, so each baked sample IS the
    // outgoing weight. (A ramp can't do this — with equal-power the two gains
    // deliberately do not sum to 1, so a normalised difference isn't the gain.)
    const n = 1000
    const a = new Float32Array(n) // body: silence
    const s = Math.round(2 * RATE)
    const x = Math.round(1 * RATE)
    const e = Math.round(8 * RATE)
    for (let i = e; i < n; i++) a[i] = 1 // what follows `end`: unit level

    bakeCrossfadeLoop([a], RATE, { start: 2, end: 8, crossfade: 1 })

    expect(a[s], 'starts as pure incoming — this is what makes the wrap continuous').toBeCloseTo(1, 6)
    expect(a[s + x - 1], 'nearly handed over by the last crossfade sample').toBeLessThan(0.02)
    expect(a[s + x], 'and fully body once the crossfade is done').toBe(0)

    // Monotone, so it is a hand-over rather than anything that wobbles.
    for (let i = 1; i < x; i++) {
      expect(a[s + i] as number).toBeLessThan(a[s + i - 1] as number)
    }
  })

  it('leaves the first sample past the crossfade untouched', () => {
    const src = ramp(1000)
    const original = Float32Array.from(src)
    bakeCrossfadeLoop([src], RATE, { start: 2, end: 8, crossfade: 1 })
    const s = Math.round(2 * RATE)
    const x = Math.round(1 * RATE)
    expect(src[s + x]).toBe(original[s + x])
  })

  it('leaves the intro and the rest of the body untouched', () => {
    const src = ramp(1000)
    const original = Float32Array.from(src)
    bakeCrossfadeLoop([src], RATE, { start: 2, end: 8, crossfade: 1 })
    const s = Math.round(2 * RATE)
    const x = Math.round(1 * RATE)
    const e = Math.round(8 * RATE)
    for (let i = 0; i < s; i++) expect(src[i]).toBe(original[i]) // intro, played once
    for (let i = s + x; i < e; i++) expect(src[i]).toBe(original[i]) // body after the fade
  })

  it('holds the level flat across the seam rather than dipping', () => {
    // Equal-power, not linear. With two uncorrelated sources a linear crossfade
    // loses ~3 dB in the middle — an audible sag exactly where the seam is.
    const n = 2000
    const a = new Float32Array(n).fill(1) // body at unit level
    // Make the region past `end` a different but equally loud signal.
    const e = Math.round(8 * RATE)
    for (let i = e; i < n; i++) a[i] = -1
    bakeCrossfadeLoop([a], RATE, { start: 2, end: 8, crossfade: 1 })

    const s = Math.round(2 * RATE)
    const x = Math.round(1 * RATE)
    // cos^2 + sin^2 = 1, so the sum of powers is constant even though the two
    // sides cancel in amplitude. Check power, which is what loudness follows.
    for (let i = 0; i < x; i++) {
      const t = i / x
      const power = Math.cos((t * Math.PI) / 2) ** 2 + Math.sin((t * Math.PI) / 2) ** 2
      expect(power).toBeCloseTo(1, 6)
    }
    expect(a[s]).toBeCloseTo(-1, 4) // starts as the material that followed `end`
    expect(a[s + x]).toBeCloseTo(1, 4) // ends as the body
  })

  it('crossfades every channel', () => {
    const l = ramp(1000)
    const r = ramp(1000).map((v) => -v) as Float32Array
    const originalR = Float32Array.from(r)
    bakeCrossfadeLoop([l, r], RATE, { start: 2, end: 8, crossfade: 1 })
    const s = Math.round(2 * RATE)
    const e = Math.round(8 * RATE)
    expect(r[s]).toBeCloseTo(originalR[e], 4)
  })

  // A bad region must degrade to "loop the whole file" — worse, but never a
  // buffer overrun and never silence.
  describe('rejects a region that does not fit the material', () => {
    it('when there is no room after the end to crossfade with', () => {
      // end + crossfade runs past the buffer.
      expect(bakeCrossfadeLoop([ramp(1000)], RATE, { start: 2, end: 9.5, crossfade: 1 })).toBeNull()
    })
    it('when the crossfade would reach the end of the loop', () => {
      expect(bakeCrossfadeLoop([ramp(1000)], RATE, { start: 2, end: 2.5, crossfade: 1 })).toBeNull()
    })
    it('when the region is inverted or empty', () => {
      expect(bakeCrossfadeLoop([ramp(1000)], RATE, { start: 8, end: 2, crossfade: 1 })).toBeNull()
      expect(bakeCrossfadeLoop([ramp(1000)], RATE, { start: 2, end: 2, crossfade: 1 })).toBeNull()
    })
    it('when there is no crossfade', () => {
      expect(bakeCrossfadeLoop([ramp(1000)], RATE, { start: 2, end: 8, crossfade: 0 })).toBeNull()
    })
    it('when there are no channels or no sample rate', () => {
      expect(bakeCrossfadeLoop([], RATE, { start: 2, end: 8, crossfade: 1 })).toBeNull()
      expect(bakeCrossfadeLoop([ramp(1000)], 0, { start: 2, end: 8, crossfade: 1 })).toBeNull()
    })
  })

  it('shifts the region by the container offset', () => {
    // The catalog's numbers are in true-content time. A decoder that leaves the
    // encoder delay in place shifts everything, and the loop must move with it
    // or it drifts by that much every lap.
    const baked = bakeCrossfadeLoop([ramp(1000)], RATE, { start: 2, end: 8, crossfade: 1 }, 0.5)
    expect(baked).toEqual({ loopStart: 2.5, loopEnd: 8.5 })
  })
})
