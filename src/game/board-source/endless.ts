// endless.ts — a deterministic, reproducible seed stream. next(seed) is pure
// seed math over the engine RNG; a stream is reproducible from {startSeed,index}.
// Persists the last size/difficulty through the SaveStore seam (008).
import type { SaveStore } from '@/platform'
import type { BoardRequest } from './request'

// stub — implemented in US1 (T008-T010)
export function nextSeed(seed: string): string {
  return seed
}

export interface EndlessStream {
  current(): BoardRequest
  next(): BoardRequest
}

export function createEndlessStream(_opts: {
  startSeed: string
  size: BoardRequest['size']
  difficulty: BoardRequest['difficulty']
}): EndlessStream {
  throw new Error('not implemented')
}

export async function loadEndlessPrefs(_store: SaveStore): Promise<{
  size: BoardRequest['size']
  difficulty: BoardRequest['difficulty']
}> {
  return { size: 'Small', difficulty: 'Calm' }
}

export async function saveEndlessPrefs(
  _store: SaveStore,
  _prefs: { size: BoardRequest['size']; difficulty: BoardRequest['difficulty'] },
): Promise<void> {}
