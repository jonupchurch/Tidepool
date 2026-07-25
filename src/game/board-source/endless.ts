// endless.ts — a deterministic, reproducible seed stream. next(seed) is pure
// seed math over the engine RNG; a stream is reproducible from {startSeed,index}.
// Persists the last size/difficulty through the SaveStore seam (008). No ambient
// randomness or wall-clock (Principle XI).
import type { DifficultyTier, SizeTier } from '@/core'
import { DIFFICULTY_TIERS, SIZE_TIERS, formatSeed, nextInt, seedToRng } from '@/core'
import { type SaveStore, loadRecord, saveRecord } from '@/platform'
import type { BoardRequest } from './request'

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
}

export interface EndlessStream {
  current(): BoardRequest
  next(): BoardRequest
}

/** A reproducible stream: `current()` is the board at the current index,
 *  `next()` advances one deterministic step. Same {startSeed,size,difficulty}
 *  always yields the same sequence (SC-001). */
export function createEndlessStream({ startSeed, size, difficulty }: EndlessOpts): EndlessStream {
  let seed = formatSeed(startSeed)
  return {
    current: () => ({ seed, size, difficulty }),
    next: () => {
      seed = nextSeed(seed)
      return { seed, size, difficulty }
    },
  }
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

export async function loadEndlessPrefs(
  store: SaveStore,
): Promise<{ size: SizeTier; difficulty: DifficultyTier }> {
  const s = await loadRecord(store, 'settings')
  return { size: asSize(s.play.defaultSize), difficulty: asDifficulty(s.play.defaultDifficulty) }
}

export async function saveEndlessPrefs(
  store: SaveStore,
  prefs: { size: SizeTier; difficulty: DifficultyTier },
): Promise<void> {
  const s = await loadRecord(store, 'settings')
  await saveRecord(store, 'settings', {
    ...s,
    play: { defaultSize: prefs.size, defaultDifficulty: prefs.difficulty },
  })
}
