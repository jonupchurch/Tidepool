// sprites.ts — board tile motifs (waves on water, boulder on stones) as SVG
// assets rasterized onto the Canvas. Loaded once as module singletons; drawn
// only once ready. Inert in non-DOM hosts (tests) where `Image` is unavailable
// or never loads. Kept in `render/` so the board stays the sole owner of pixels.

function make(src: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  return img
}

export const WAVES = make('/waves.svg')
export const BOULDER = make('/boulder.svg')

/** True once an image has decoded and can be drawn. */
export function spriteReady(img: HTMLImageElement | null): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0
}

function whenReady(img: HTMLImageElement | null): Promise<void> {
  if (!img) return Promise.resolve()
  if (img.complete && img.naturalWidth > 0) return Promise.resolve()
  return new Promise((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true })
    img.addEventListener('error', () => resolve(), { once: true })
  })
}

/** Resolves once both board sprites are ready (or immediately if unavailable) —
 *  callers redraw the board afterwards so the motifs appear without a click. */
export function whenSpritesReady(): Promise<void> {
  return Promise.all([whenReady(WAVES), whenReady(BOULDER)]).then(() => undefined)
}
