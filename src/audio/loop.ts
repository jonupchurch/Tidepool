// loop.ts — make a decoded music buffer loop seamlessly (015 follow-up).
//
// "Driftwood Garden" was composed, not authored as a loop: measured from the
// WAV master it has a 3.55 s fade-in and a 1.34 s fade-out. Looping the whole
// file therefore dies away to near silence and swells back at every wrap, which
// is audible as an abrupt switch. That is a property of the music, so no amount
// of sample-accurate splicing fixes it — the container arithmetic in `music.ts`
// was correct all along and was never what made the noise.
//
// The fix is to loop an *inner* region that never touches either ramp, and to
// crossfade so the seam is inaudible. The construction is the standard one:
//
//     play:   [ 0 .............. S ][ S ......... E )   then repeat [S, E)
//                    intro, once        loop body
//
//     bake:   buffer[S .. S+X)  :=  buffer[E .. E+X) * fadeOut
//                                 + buffer[S .. S+X) * fadeIn
//
// At the moment playback wraps from E back to S it hears `buffer[E]` at full
// weight — precisely the audio that followed E in the original — so the join is
// continuous by construction, not merely close. The crossfade then eases into
// the material at S+X over X seconds.
//
// This mutates the buffer's channel data in place. The alternative, building a
// second buffer, would hold ~48 MB twice for no benefit: every sample outside
// [S, S+X) is unchanged, and the crossfade reads only from [E, E+X), which lies
// beyond the region it writes.

/** An inner loop region, in seconds of true content (padding already removed). */
export interface LoopRegion {
  /** Where the loop body begins. Must sit after any composed intro. */
  start: number
  /** Where the loop body ends. Must sit before any composed outro. */
  end: number
  /** Crossfade length. Needs this much material to exist after `end`. */
  crossfade: number
}

/** What the caller should set on the source node. */
export interface BakedLoop {
  loopStart: number
  loopEnd: number
}

/**
 * Bake a crossfaded loop into `channels`, returning the loop points to set on
 * the source node — or `null` when the region does not fit the material, in
 * which case the caller should fall back to looping the whole buffer.
 *
 * `offset` is where true content begins in the buffer, for decoders that leave
 * the container's encoder delay in place; `region` is always expressed in
 * true-content time so the numbers in `music.ts` mean one thing.
 */
export function bakeCrossfadeLoop(
  channels: Float32Array[],
  sampleRate: number,
  region: LoopRegion,
  offset = 0,
): BakedLoop | null {
  if (channels.length === 0 || !Number.isFinite(sampleRate) || sampleRate <= 0) return null

  const length = channels[0]?.length ?? 0
  const s = Math.round((offset + region.start) * sampleRate)
  const e = Math.round((offset + region.end) * sampleRate)
  const x = Math.round(region.crossfade * sampleRate)

  // The crossfade reads [e, e+x), so that has to exist; and it writes [s, s+x),
  // which must not reach into what it reads. A region that fails either of
  // these is a mistake in the catalog, and silently looping the whole file is a
  // far better outcome than a buffer overrun or silence.
  if (!(s >= 0 && x > 0 && s + x < e && e + x <= length)) return null

  for (const data of channels) {
    for (let i = 0; i < x; i++) {
      const t = i / x
      // Equal power, not linear. The two sides of the seam are different
      // moments of the music (measured correlation r=0.51 — related, not the
      // same), and a linear crossfade of uncorrelated material dips ~3 dB in
      // the middle. cos/sin holds the perceived level flat.
      const out = Math.cos((t * Math.PI) / 2)
      const into = Math.sin((t * Math.PI) / 2)
      data[s + i] = (data[e + i] ?? 0) * out + (data[s + i] ?? 0) * into
    }
  }

  return { loopStart: s / sampleRate, loopEnd: e / sampleRate }
}
