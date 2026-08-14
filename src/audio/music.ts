// music.ts — the ambient music catalog. Mirrors `sounds.ts`: tracks are
// discovered at BUILD time from `src/assets/music/` via Vite's `import.meta.glob`,
// so a track that hasn't been written yet is silence rather than a 404, and the
// whole music feature ships and verifies before any audio exists (014 FR-010).
//
// Separate from the SFX folder on purpose. `sounds.ts` matches files by exact
// event id and `check:audio` flags anything that isn't one, so a music file
// dropped in there would be reported as never played — and, worse, every file
// under a globbed folder is copied into the web and Steam builds whether it is
// played or not.

/** A track's loop geometry, when its container needs the padding trimmed. */
export interface LoopPoints {
  /** Seconds of encoder delay at the head of the decoded buffer. */
  start: number
  /** True content length in seconds, from the lossless master. */
  duration: number
}

export interface MusicTrack {
  id: string
  url: string
  /**
   * Measured loop geometry, or undefined to loop the whole decoded buffer.
   *
   * MP3 bakes encoder delay and end padding into the file and decoders disagree
   * about stripping it, so looping the raw buffer can click at the wrap. These
   * numbers come from the WAV master (true length) and the MP3's Xing/LAME
   * header (delay/padding) — see src/assets/music/README.md. The engine still
   * checks the decoded duration at runtime and only applies them if the decoder
   * did NOT already strip the padding, so this is correct either way.
   */
  loop?: LoopPoints
}

/** Per-track loop geometry, keyed by file basename. Measured, not guessed. */
const LOOP_POINTS: Record<string, LoopPoints> = {
  // 48 kHz stereo. Master: 6,464,640 samples = 134.680 s exactly.
  // MP3 (Lavc60.31): 576-sample encoder delay = 0.012 s, 1464-sample end pad.
  'driftwood-garden': { start: 576 / 48000, duration: 6_464_640 / 48000 },
}

const modules = import.meta.glob('/src/assets/music/*.{mp3,ogg,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/**
 * Every discovered track, ordered by id so the choice of bed is deterministic
 * rather than dependent on filesystem order.
 */
export const MUSIC_TRACKS: MusicTrack[] = Object.entries(modules)
  .map(([path, url]) => {
    const id = (path.split('/').pop() ?? '').replace(/\.(mp3|ogg|wav)$/i, '')
    return { id, url, ...(LOOP_POINTS[id] ? { loop: LOOP_POINTS[id] } : {}) }
  })
  .filter((t) => t.id.length > 0)
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

/** The ambient bed to play, or null when no track has been added yet. */
export function defaultTrack(): MusicTrack | null {
  return MUSIC_TRACKS[0] ?? null
}
