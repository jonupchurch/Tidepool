// palette.ts — resolve the board colours from the Tailwind `@theme` design
// tokens at runtime (so the Canvas honours the theme; no hardcoded palette hex
// in the drawing code). The fallback mirrors src/index.css for non-DOM hosts
// (tests/SSR) where there is no computed style to read.
export interface Palette {
  sand: string
  driftwood: string
  foam: string
  tide: string
  tideFill: string
  water: string
  deepPool: string
  seaGlass: string
  coral: string
  rock: string
  ink: string
}

const FALLBACK: Palette = {
  sand: '#e9e7dc',
  driftwood: '#d9d6c7',
  foam: '#f6f4ec',
  tide: '#6fa8a0',
  tideFill: '#a6cfc8',
  water: '#cfe6f5',
  deepPool: '#274a54',
  seaGlass: '#8fbdb2',
  coral: '#de8368',
  rock: '#8e877a',
  ink: '#22303a',
}

const TOKENS: Record<keyof Palette, string> = {
  sand: '--color-sand',
  driftwood: '--color-driftwood',
  foam: '--color-foam',
  tide: '--color-tide',
  tideFill: '--color-tide-fill',
  water: '--color-water',
  deepPool: '--color-deep-pool',
  seaGlass: '--color-sea-glass',
  coral: '--color-coral',
  rock: '--color-rock',
  ink: '--color-ink',
}

/** Read the current theme palette from CSS custom properties. */
export function readPalette(): Palette {
  if (typeof document === 'undefined' || !document.documentElement) return FALLBACK
  const styles = getComputedStyle(document.documentElement)
  const out = {} as Palette
  for (const key of Object.keys(TOKENS) as Array<keyof Palette>) {
    out[key] = styles.getPropertyValue(TOKENS[key]).trim() || FALLBACK[key]
  }
  return out
}
