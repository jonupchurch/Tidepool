// sounds.ts — the game's sound catalog. Sound IDs are the event vocabulary the
// rest of the app plays against; the actual audio files are discovered at BUILD
// time from `src/assets/audio/` via Vite's `import.meta.glob`. That means:
//   • no runtime 404s for sounds that don't exist yet (glob only matches real files)
//   • no manifest to maintain — drop `<id>.mp3` into src/assets/audio/ and it's
//     auto-bundled and picked up on the next reload.
// Until files are added, `SOUND_URLS` is empty and the game simply plays silence.

export type SoundId =
  | 'water' // correct water mark
  | 'rock' // correct stone mark
  | 'mistake' // a mark against the solution
  | 'poolComplete' // a pool filled (creature joins the journal)
  | 'boardComplete' // the board solved
  | 'undo'
  | 'redo'

export const SOUND_IDS: readonly SoundId[] = [
  'water',
  'rock',
  'mistake',
  'poolComplete',
  'boardComplete',
  'undo',
  'redo',
]

const isSoundId = (s: string): s is SoundId => (SOUND_IDS as readonly string[]).includes(s)

// Build-time discovery. Files are named exactly `<SoundId>.<ext>`
// (e.g. water.mp3, poolComplete.mp3). Missing files simply aren't matched.
const modules = import.meta.glob('/src/assets/audio/*.{mp3,wav,ogg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** id → bundled asset URL, for the sound files that actually exist. */
export const SOUND_URLS: Partial<Record<SoundId, string>> = {}
for (const [path, url] of Object.entries(modules)) {
  const base = path.split('/').pop()?.replace(/\.(mp3|wav|ogg)$/i, '') ?? ''
  if (isSoundId(base)) SOUND_URLS[base] = url
}
