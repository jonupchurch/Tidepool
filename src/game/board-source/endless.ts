// endless.ts — a deterministic, reproducible seed stream. next(seed) is pure
// seed math over the engine RNG; a stream is reproducible from {startSeed,index}.
// Persists the last size/difficulty through the SaveStore seam (008). No ambient
// randomness or wall-clock (Principle XI).
import type { DifficultyTier, ShapeId, SizeTier } from '@/core'
import { DEFAULT_SHAPE, DIFFICULTY_TIERS, SIZE_TIERS, formatSeed, nextInt, seedToRng } from '@/core'
import { type SaveStore, loadRecord, saveRecord } from '@/platform'
import type { BoardRequest } from './request'
import { DEFAULT_SHORE, type ShoreChoice, endlessClues, isShoreChoice, resolveShore } from './shore'

/** Shore-themed words for generated seeds — all `[A-Z]+` so they parse. */
const SEED_WORDS = [
  'KELP', 'CORAL', 'TIDE', 'SHELL', 'WAVE', 'REEF', 'SAND', 'FOAM', 'SURF', 'DUNE',
  'COVE', 'SHOAL', 'BRINE', 'PEARL', 'CRAB', 'MARSH', 'INLET', 'SPRAY', 'DRIFT', 'EBB',
  'SWELL', 'LAGOON', 'ANEMONE', 'URCHIN',
] as const

/** Deterministic seed-step: a pure function of the current seed → a fresh
 *  human-friendly `WORD-NNNN`. Reproducible across engines (engine RNG). */
export function nextSeed(seed: string): string {
  const rng = seedToRng(seed)
  const word = SEED_WORDS[nextInt(rng, SEED_WORDS.length)]
  const num = nextInt(rng, 10000)
  return formatSeed(`${word}-${String(num).padStart(4, '0')}`)
}

export interface EndlessOpts {
  startSeed: string
  size: SizeTier
  difficulty: DifficultyTier
  /** Silhouette choice (016). Absent = the filled hexagon, as before. */
  shore?: ShoreChoice
  /** `{n}` / `-n-` on row totals (016). Absent = off. Only bites at Deep. */
  edgeHints?: boolean
}

export interface EndlessStream {
  current(): BoardRequest
  next(): BoardRequest
}

/**
 * A reproducible stream: `current()` is the board at the current index, `next()`
 * advances one deterministic step. Same options always yield the same sequence
 * (SC-001).
 *
 * The shore is resolved **per seed**, not once for the stream — under `Any` that
 * is the whole point: each board in the run gets its own silhouette, and the
 * sequence is still reproducible because the derivation is seed math.
 */
export function createEndlessStream({
  startSeed,
  size,
  difficulty,
  shore = DEFAULT_SHORE,
  edgeHints = false,
}: EndlessOpts): EndlessStream {
  let seed = formatSeed(startSeed)
  const at = (s: string): BoardRequest => ({
    seed: s,
    size,
    difficulty,
    clues: endlessClues(difficulty, edgeHints),
    ...shapeField(resolveShore(shore, s, size)),
  })
  return {
    current: () => at(seed),
    next: () => {
      seed = nextSeed(seed)
      return at(seed)
    },
  }
}

/** The hexagon is the *absence* of a shape, everywhere a request is built —
 *  `rngSeedString` keys off `shape !== DEFAULT_SHAPE`, and an explicit `hex`
 *  would make two identical boards compare unequal. */
export function shapeField(shape: ShapeId): { shape?: ShapeId } {
  return shape === DEFAULT_SHAPE ? {} : { shape }
}

/** The seed at `index` steps from `startSeed` (pure; for reproducibility tests). */
export function seedAtIndex(startSeed: string, index: number): string {
  let seed = formatSeed(startSeed)
  for (let i = 0; i < index; i++) seed = nextSeed(seed)
  return seed
}

// ── Last endless size/difficulty — persisted on the shared settings record ────

const asSize = (x: string): SizeTier =>
  (SIZE_TIERS as readonly string[]).includes(x) ? (x as SizeTier) : 'Small'
const asDifficulty = (x: string): DifficultyTier =>
  (DIFFICULTY_TIERS as readonly string[]).includes(x) ? (x as DifficultyTier) : 'Calm'

export interface EndlessPrefs {
  size: SizeTier
  difficulty: DifficultyTier
  shore: ShoreChoice
  edgeHints: boolean
}

export async function loadEndlessPrefs(store: SaveStore): Promise<EndlessPrefs> {
  const s = await loadRecord(store, 'settings')
  return {
    size: asSize(s.play.defaultSize),
    difficulty: asDifficulty(s.play.defaultDifficulty),
    shore: isShoreChoice(s.play.defaultShore) ? s.play.defaultShore : DEFAULT_SHORE,
    edgeHints: s.play.edgeHints === true,
  }
}

export async function saveEndlessPrefs(store: SaveStore, prefs: EndlessPrefs): Promise<void> {
  const s = await loadRecord(store, 'settings')
  await saveRecord(store, 'settings', {
    ...s,
    // Spread the existing group: writing a bare object here used to drop
    // `stopwatch`, and now there are four fields that would go with it.
    play: {
      ...s.play,
      defaultSize: prefs.size,
      defaultDifficulty: prefs.difficulty,
      defaultShore: prefs.shore,
      edgeHints: prefs.edgeHints,
    },
  })
}
