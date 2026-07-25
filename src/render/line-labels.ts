// line-labels.ts — placement + hit-testing for the margin line totals. Pure
// geometry (no canvas), so the "which row does this number belong to?" rule is
// testable on its own.
//
// A total is anchored in the empty hex slot the row would continue into, one
// step back along that row's OWN axis — so its position alone identifies the
// row. (The previous rule pushed labels radially away from the board centre,
// a direction unrelated to the line, which left them ambiguous and stacked at
// the corners.) Where two labels would still collide, the loser slides further
// out along its own axis — never sideways — so the alignment cue survives.
import type { Axial, Axis, Board } from '@/core'
import { linesOf, parseKey } from '@/core'
import { type HexLayout, hexToPixel } from './layout'

/**
 * The forward step along each axis, matching `linesOf()`'s cell order (sorted
 * by q, then r): axis 0 runs E (r fixed), axis 1 runs SE (q fixed), axis 2
 * runs NE (s = -q-r fixed).
 */
export const AXIS_STEP: Record<Axis, Axial> = {
  0: { q: 1, r: 0 },
  1: { q: 0, r: 1 },
  2: { q: 1, r: -1 },
}

/** A label's resolved position in axial space — independent of hex size. */
export interface LineAnchor {
  /** `${axis},${index}` — stable id, also the guide-line toggle key */
  id: string
  axis: Axis
  index: number
  total: number
  /** anchor coord, fractional: a point just off the end of the row */
  coord: Axial
  /** the row's member cell keys, ordered from the label end outward */
  cells: string[]
}

export interface LineLabel extends LineAnchor {
  /** label centre, in canvas pixels */
  x: number
  y: number
}

/** How far outside the board (in hex steps) a label sits before de-overlapping. */
const BASE_GAP = 1
/** Extra distance tried, per attempt, when a slot is already taken. */
const NUDGE_STEP = 0.62
const MAX_NUDGE = 4
/** Closest two label centres may sit, in hex-step units (scale-free). */
const MIN_GAP = 1.55

const SQRT3 = Math.sqrt(3)

/** Axial → the size-independent "unit" plane fitLayout and hexToPixel share. */
function unit(a: Axial): { x: number; y: number } {
  return { x: SQRT3 * (a.q + a.r / 2), y: 1.5 * a.r }
}

/**
 * Resolve where every line total sits, in axial space. Size-independent by
 * construction (all distances are in hex-step units), so the caller can feed
 * these anchors to `fitLayout` to reserve on-canvas room *before* a hex size
 * exists. Deterministic: same board always yields the same anchors, in
 * `board.lines` order.
 */
export function lineAnchors(board: Board): LineAnchor[] {
  if (board.lines.length === 0) return []
  const byId = new Map(linesOf(board.present).map((l) => [`${l.axis},${l.index}`, l]))
  const placed: LineAnchor[] = []
  const placedUnits: Array<{ x: number; y: number }> = []

  for (const lc of board.lines) {
    const id = `${lc.axis},${lc.index}`
    const line = byId.get(id)
    if (!line || line.cells.length === 0) continue

    const step = AXIS_STEP[lc.axis]
    // 'start' labels sit before the first cell; 'end' labels after the last —
    // in both cases outside the board, on the row's own line.
    const fromStart = lc.from === 'start'
    const cells = fromStart ? line.cells : [...line.cells].reverse()
    const edge = parseKey(cells[0])
    const sign = fromStart ? -1 : 1

    let coord: Axial = edge
    let u = unit(edge)
    for (let n = 0; n <= MAX_NUDGE; n++) {
      const d = BASE_GAP + n * NUDGE_STEP
      coord = { q: edge.q + sign * step.q * d, r: edge.r + sign * step.r * d }
      u = unit(coord)
      const clash = placedUnits.some((p) => Math.hypot(p.x - u.x, p.y - u.y) < MIN_GAP)
      if (!clash) break
    }

    placed.push({ id, axis: lc.axis, index: lc.index, total: lc.total, coord, cells })
    placedUnits.push(u)
  }

  return placed
}

/** Project `lineAnchors(board)` into canvas pixels under `layout`. */
export function lineLabels(board: Board, layout: HexLayout): LineLabel[] {
  return lineAnchors(board).map((a) => ({ ...a, ...hexToPixel(layout, a.coord) }))
}

/**
 * The label under a pixel, or null. `radius` defaults to a comfortable touch
 * target just under half a hex step, so labels never steal clicks from cells.
 */
export function labelAt(
  labels: readonly LineLabel[],
  x: number,
  y: number,
  radius: number,
): LineLabel | null {
  let best: LineLabel | null = null
  let bestD = radius
  for (const l of labels) {
    const d = Math.hypot(l.x - x, l.y - y)
    if (d <= bestD) {
      bestD = d
      best = l
    }
  }
  return best
}

/**
 * Endpoints of the guide line for a label: the row's first and last cell
 * centres, extended `overhang` hex-steps past each end so the stroke reads as
 * covering the whole row.
 */
export function guideSegment(
  label: LineLabel,
  layout: HexLayout,
  overhang = 0.5,
): { x1: number; y1: number; x2: number; y2: number } {
  const step = AXIS_STEP[label.axis]
  const head = parseKey(label.cells[0])
  const tail = parseKey(label.cells[label.cells.length - 1])
  // `cells` runs label-end → far-end, so the head extends backwards along the
  // axis and the tail forwards — regardless of which end the label sits at.
  const dir = signOf(head, tail, step)
  const a = hexToPixel(layout, {
    q: head.q - dir * step.q * overhang,
    r: head.r - dir * step.r * overhang,
  })
  const b = hexToPixel(layout, {
    q: tail.q + dir * step.q * overhang,
    r: tail.r + dir * step.r * overhang,
  })
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}

/** +1 if `tail` lies forward of `head` along `step`, -1 otherwise. */
function signOf(head: Axial, tail: Axial, step: Axial): number {
  const along = (tail.q - head.q) * step.q + (tail.r - head.r) * step.r
  return along >= 0 ? 1 : -1
}
