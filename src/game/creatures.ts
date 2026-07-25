// creatures.ts — the single shared creature catalog (FR-007). Loaded from the
// bundled `creatures.json` data (mirrors curated.json); enriched here with the
// pool-size → creature reward mapping shared with Gameplay's pools and the Shore
// Journal (005). Deterministic: a pool of a given size always yields the same
// creature. Pure; no DOM.
import catalog from '@/content/creatures.json'

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary'
export const RARITIES: readonly Rarity[] = ['Common', 'Uncommon', 'Rare', 'Legendary']

export interface CreatureDef {
  id: string
  name: string
  rarity: Rarity
  /** a warm one-line field-guide description */
  description: string
  /** smallest pool size that yields this creature */
  minSize: number
  /** whether finished art exists (others render as styled placeholders for now) */
  hasArt: boolean
  /** servable art URL when `hasArt` (public/ asset); absent otherwise */
  art?: string
}

/** Ordered by minSize ascending — bigger pools yield rarer creatures. */
export const CREATURES: readonly CreatureDef[] = (catalog as unknown as CreatureDef[])
  .slice()
  .sort((a, b) => a.minSize - b.minSize)

const CREATURE_BY_ID = new Map(CREATURES.map((c) => [c.id, c]))

/** The creature a pool of `size` cells reveals (largest tier whose minSize ≤ size). */
export function creatureForPool(size: number): string {
  let chosen = CREATURES[0]
  for (const c of CREATURES) if (size >= c.minSize) chosen = c
  return chosen.id
}

export function creatureDef(id: string): CreatureDef | undefined {
  return CREATURE_BY_ID.get(id)
}

/** Inclusive pool-size range that yields this creature: [min, max]; max is
 *  Infinity for the rarest. Ranges partition [1, ∞) with no gaps or overlap. */
export function creatureUnlock(id: string): { min: number; max: number } | undefined {
  const i = CREATURES.findIndex((c) => c.id === id)
  if (i < 0) return undefined
  const min = CREATURES[i].minSize
  const max = i + 1 < CREATURES.length ? CREATURES[i + 1].minSize - 1 : Number.POSITIVE_INFINITY
  return { min, max }
}
