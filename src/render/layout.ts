// layout.ts — pointy-top axial↔pixel geometry + fit-to-viewport. Pure math,
// shared by the Canvas renderer (hex→pixel) and hit-testing (pixel→hex). No DOM.
import type { Axial } from '@/core'

export interface HexLayout {
  /** hex radius (centre → corner) in pixels */
  size: number
  originX: number
  originY: number
}

const SQRT3 = Math.sqrt(3)

/** Centre pixel of a hex (pointy-top). */
export function hexToPixel(layout: HexLayout, a: Axial): { x: number; y: number } {
  return {
    x: layout.size * SQRT3 * (a.q + a.r / 2) + layout.originX,
    y: layout.size * 1.5 * a.r + layout.originY,
  }
}

function axialRound(qf: number, rf: number): Axial {
  const xf = qf
  const zf = rf
  const yf = -xf - zf
  let rx = Math.round(xf)
  let ry = Math.round(yf)
  let rz = Math.round(zf)
  const dx = Math.abs(rx - xf)
  const dy = Math.abs(ry - yf)
  const dz = Math.abs(rz - zf)
  if (dx > dy && dx > dz) rx = -ry - rz
  else if (dy > dz) ry = -rx - rz
  else rz = -rx - ry
  // `+ 0` normalizes any -0 to +0 so keys/comparisons stay canonical.
  return { q: rx + 0, r: rz + 0 }
}

/** Nearest hex (axial) to a pixel. */
export function pixelToAxial(layout: HexLayout, x: number, y: number): Axial {
  const px = (x - layout.originX) / layout.size
  const py = (y - layout.originY) / layout.size
  const r = (2 / 3) * py
  const q = px / SQRT3 - r / 2
  return axialRound(q, r)
}

/** The present cell key under a pixel, or null if the pixel isn't on a cell. */
export function hitTest(
  layout: HexLayout,
  present: Set<string>,
  x: number,
  y: number,
): string | null {
  const a = pixelToAxial(layout, x, y)
  const k = `${a.q},${a.r}`
  return present.has(k) ? k : null
}

/**
 * Compute a layout that fits `present` centred in a `width`×`height` viewport.
 * `extra` holds additional (possibly fractional) axial points that must also
 * stay on-canvas — the margin line totals, which sit outside the board.
 */
export function fitLayout(
  present: Iterable<string>,
  width: number,
  height: number,
  padding = 24,
  extra: Iterable<Axial> = [],
): HexLayout {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const include = (q: number, r: number): void => {
    const x = SQRT3 * (q + r / 2)
    const y = 1.5 * r
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  for (const k of present) {
    const i = k.indexOf(',')
    include(Number(k.slice(0, i)), Number(k.slice(i + 1)))
  }
  for (const a of extra) include(a.q, a.r)
  if (!Number.isFinite(minX)) return { size: 1, originX: width / 2, originY: height / 2 }

  // Board extent in "unit" hex coords, plus one hex of margin on each axis.
  const boardW = maxX - minX + SQRT3
  const boardH = maxY - minY + 2
  const size = Math.min((width - 2 * padding) / boardW, (height - 2 * padding) / boardH)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return { size, originX: width / 2 - size * cx, originY: height / 2 - size * cy }
}
