// pixel-ratio.ts — how big the canvas's backing store should be.
//
// A <canvas> has two sizes: the CSS box the page lays out, and the pixel buffer
// it actually draws into. Set only the CSS box and the buffer stays at 1×, so on
// any scaled display (150% on Windows, any Retina Mac) the browser upscales a
// low-resolution image — the board, its numerals and the tile motifs all come
// out soft. The whole screen here is one canvas, so it's the most visible thing
// in the game.
//
// Split out as a pure function because the interesting parts — the clamp, the
// rounding, the nonsense values — deserve tests, and a canvas can't be
// constructed in jsdom.

/**
 * Beyond 2× the difference isn't visible at normal viewing distance, but the
 * buffer keeps growing with the square of the ratio: a 2560×1440 window at 3×
 * is a 33-megapixel buffer, ~130 MB, reallocated on every resize. 2× is the
 * quality/memory knee.
 */
export const MAX_RATIO = 2

export interface BackingSize {
  /** Buffer dimensions, in device pixels — what `canvas.width/height` get. */
  width: number
  height: number
  /** The scale to apply to the context so drawing code keeps using CSS pixels. */
  scale: number
}

/** Device pixels per CSS pixel, or 1 wherever we can't tell (tests, old webviews). */
export function currentPixelRatio(): number {
  if (typeof window === 'undefined') return 1
  return window.devicePixelRatio
}

/**
 * The backing store for a CSS-pixel box at a given device pixel ratio.
 *
 * Never returns a zero dimension: a 0×0 canvas throws in some engines, and a
 * collapsed container (a hidden tab, a pane mid-drag) is entirely normal.
 */
export function backingSize(cssWidth: number, cssHeight: number, ratio: number): BackingSize {
  const scale = normalizeRatio(ratio)
  return {
    width: Math.max(1, Math.round(Math.max(0, cssWidth) * scale)),
    height: Math.max(1, Math.round(Math.max(0, cssHeight) * scale)),
    scale,
  }
}

/** Clamp a reported ratio into something safe to multiply by. */
function normalizeRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1
  return Math.min(ratio, MAX_RATIO)
}
