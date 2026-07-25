// cell-style.ts — the pure mapping from a cell's visual state to fill/outline
// palette keys + a colorblind glyph. Extracted so the colorblind-safe rule
// (water ≠ rock by shape, not just colour) is unit-testable. FR-012.
import type { Palette } from './palette'

export type CellVisual = 'unknown' | 'water' | 'rock' | 'clue'

export interface CellStyle {
  fill: keyof Palette
  outline: keyof Palette
  /** a shape/pattern marker drawn in addition to colour (colorblind mode) */
  glyph: string
}

export function cellStyle(visual: CellVisual, colorblind: boolean): CellStyle {
  switch (visual) {
    case 'water':
      return { fill: 'water', outline: 'tide', glyph: colorblind ? '≈' : '' }
    case 'rock':
      return { fill: 'rock', outline: 'deepPool', glyph: colorblind ? '▲' : '' }
    // `deepPool` matches the numeral drawn on top, so a clue tile reads as one
    // unit with a defined edge (`rock` on `driftwood` was near-invisible).
    case 'clue':
      return { fill: 'driftwood', outline: 'deepPool', glyph: '' } // number drawn separately
    default:
      return { fill: 'foam', outline: 'seaGlass', glyph: '' }
  }
}
