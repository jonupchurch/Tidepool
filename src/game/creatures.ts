// creatures.ts — the pool-size → creature mapping (the reward table shared with
// the Shore Journal, feature 005). Deterministic: a pool of a given size always
// yields the same creature. Pure; no DOM.

export interface CreatureDef {
  id: string
  name: string
  /** smallest pool size that yields this creature */
  minSize: number
  /** whether finished art exists (others render as styled placeholders for now) */
  hasArt: boolean
}

/** Ordered by minSize ascending — bigger pools yield rarer creatures. */
export const CREATURES: readonly CreatureDef[] = [
  { id: 'limpet', name: 'Limpet', minSize: 1, hasArt: false },
  { id: 'periwinkle', name: 'Periwinkle', minSize: 2, hasArt: false },
  { id: 'anemone', name: 'Anemone', minSize: 3, hasArt: false },
  { id: 'crab', name: 'Shore Crab', minSize: 4, hasArt: true },
  { id: 'seastar', name: 'Sea Star', minSize: 6, hasArt: false },
  { id: 'octopus', name: 'Little Octopus', minSize: 9, hasArt: false },
]

const CREATURE_BY_ID = new Map(CREATURES.map((c) => [c.id, c]))

/** The creature a pool of `size` cells reveals. */
export function creatureForPool(size: number): string {
  let chosen = CREATURES[0]
  for (const c of CREATURES) if (size >= c.minSize) chosen = c
  return chosen.id
}

export function creatureDef(id: string): CreatureDef | undefined {
  return CREATURE_BY_ID.get(id)
}
