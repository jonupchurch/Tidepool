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
import type { Axial, Axis, Board, Connectivity } from '@/core'
import { AXIS_STEP, linesOf, parseKey } from '@/core'
import { type HexLayout, hexToPixel } from './layout'

// AXIS_STEP moved to core/hex.ts — the solver needs the same steps to tell
// whether two consecutive cells of a row adjoin. Re-exported so the renderer's
// existing importers keep working.
export { AXIS_STEP }

/** A label's resolved position in axial space — independent of hex size. */
export interface LineAnchor {
  /** `${axis},${index}` — stable id, also the guide-line toggle key */
  id: string
  axis: Axis
  index: number
  total: number
  /** `{}` / `--` on this row's total (010); absent = a plain number. */
  connectivity?: Connectivity
  /** anchor coord, fractional: a point just off the end of the row */
  coord: Axial
  /** far tip of the direction dash — the outermost ink this label puts down */
  tip: Axial
  /** the row's member cell keys, ordered from the label end outward */
  cells: string[]
}

export interface LineLabel extends LineAnchor {
  /** label centre, in canvas pixels */
  x: number
  y: number
}

/** How far outside the board (in hex steps) a label sits — snug to the edge. */
const BASE_GAP = 0.85
/** Extra distance tried, per attempt, once BOTH ends of a row are taken. */
const NUDGE_STEP = 0.55
const MAX_NUDGE = 3
/** Closest two label centres may sit, in hex-step units (scale-free). */
const MIN_GAP = 1.5
/**
 * How much more room an annotated total needs. `-10-` is roughly twice the
 * width of `10`, so the spacing tuned for a bare number lets braced ones touch.
 * Applied per-label, so a board with no annotations keeps its exact current
 * label placement.
 */
const ANNOTATED_GAP_SCALE = 1.45
/**
 * How close a label centre may come to a CELL centre, in unit space (a hex's
 * centre-to-corner radius is exactly 1 there), with a margin for the glyph.
 *
 * This guards an invariant that currently holds for free, and it is worth
 * writing down WHY rather than leaving it as a mystery check.
 *
 * A label sits on its own row's line, one step back from that row's first cell.
 * Nothing of its own row can be there: any cell further back along the line
 * would sort before the "first" cell, so by construction the slot is empty. And
 * nothing of any OTHER row can be there either — rows on the same axis lie on
 * parallel lines whose perpendicular spacing is exactly 1.5 in unit space, wider
 * than a hex's radius. Collinearity, chosen originally so a label would identify
 * its row, turns out to keep labels off every cell on the board.
 *
 * So this never fires today, on hexagons or on the 012 silhouettes — verified by
 * disabling it and watching the shaped-board tests still pass. It is kept as
 * cheap insurance on a non-obvious property: it costs a few thousand distance
 * checks per resize, and it is what would catch a future anchor rule that moved
 * labels off-axis for readability and quietly parked one on a hex.
 */
const CELL_CLEARANCE = 1.15
/** Direction-dash span, as distances from the label centre in hex-steps. */
const TICK_NEAR = 0.32
const TICK_FAR = 0.86

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
  const placedUnits: Array<{ x: number; y: number; gap: number }> = []
  // Every cell centre in unit space, so a candidate anchor can be rejected for
  // sitting on top of one. Computed once; the search below runs per label.
  const cellUnits = [...board.present].map((k) => unit(parseKey(k)))
  const clearOfCells = (u: { x: number; y: number }): boolean =>
    !cellUnits.some((c) => Math.hypot(c.x - u.x, c.y - u.y) < CELL_CLEARANCE)

  for (const lc of board.lines) {
    const id = `${lc.axis},${lc.index}`
    const line = byId.get(id)
    if (!line || line.cells.length === 0) continue

    /** One end of this row, `d` hex-steps outside it, with its dash tip. */
    const at = (fromStart: boolean, d: number): { coord: Axial; tip: Axial; cells: string[] } => {
      const step = AXIS_STEP[lc.axis]
      const cells = fromStart ? line.cells : [...line.cells].reverse()
      const edge = parseKey(cells[0])
      const sign = fromStart ? -1 : 1
      const out = (k: number): Axial => ({
        q: edge.q + sign * step.q * k,
        r: edge.r + sign * step.r * k,
      })
      return { coord: out(d), tip: out(d + TICK_FAR), cells }
    }
    // The pair's clearance is set by the WIDER of the two labels, so a wide
    // one pushes a narrow neighbour away rather than only being pushed itself.
    const myGap = lc.connectivity ? MIN_GAP * ANNOTATED_GAP_SCALE : MIN_GAP
    const free = (u: { x: number; y: number }): boolean =>
      clearOfCells(u) &&
      !placedUnits.some((p) => Math.hypot(p.x - u.x, p.y - u.y) < Math.max(p.gap, myGap))

    // A row total is equally true at either end, so a crowded label moves to the
    // OPPOSITE END of its own row before it ever pushes further out — that keeps
    // labels snug to the board instead of stacking up in the margin.
    const preferred = lc.from === 'start'
    let chosen = at(preferred, BASE_GAP)
    let u = unit(chosen.coord)
    let found = false
    // Best-effort fallback: the first candidate that at least isn't sitting on a
    // cell. Crowding two labels together is ugly; putting one on top of a hex is
    // broken, so when the search can't satisfy both, cell clearance wins.
    let fallback: { coord: Axial; tip: Axial; cells: string[] } | null = null
    let fallbackU = u
    outer: for (let n = 0; n <= MAX_NUDGE; n++) {
      for (const fromStart of [preferred, !preferred]) {
        const cand = at(fromStart, BASE_GAP + n * NUDGE_STEP)
        const cu = unit(cand.coord)
        if (!clearOfCells(cu)) continue
        if (!fallback) {
          fallback = cand
          fallbackU = cu
        }
        if (free(cu)) {
          chosen = cand
          u = cu
          found = true
          break outer
        }
      }
    }
    if (!found && fallback) {
      chosen = fallback
      u = fallbackU
    }

    placed.push({
      id,
      axis: lc.axis,
      index: lc.index,
      total: lc.total,
      ...(lc.connectivity ? { connectivity: lc.connectivity } : {}),
      coord: chosen.coord,
      tip: chosen.tip,
      cells: chosen.cells,
    })
    placedUnits.push({ ...u, gap: myGap })
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
  let bestD = Infinity
  for (const l of labels) {
    // An annotated total is physically wider, so its target grows with it —
    // otherwise the braces would sit outside the clickable area.
    const r = l.connectivity ? radius * ANNOTATED_GAP_SCALE : radius
    const d = Math.hypot(l.x - x, l.y - y)
    if (d <= r && d < bestD) {
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

/**
 * A short dash beside the label, lying along its row's axis — so the row's
 * direction reads at a glance without toggling the guide. Drawn on the OUTER
 * side of the number (away from the board): the number sits snug against the
 * board edge, leaving no room inside for a dash, and a dash must never stray
 * over a hex. `near`/`far` are distances from the label centre in hex-steps.
 */
export function tickSegment(
  label: LineLabel,
  layout: HexLayout,
  near = TICK_NEAR,
  far = TICK_FAR,
): { x1: number; y1: number; x2: number; y2: number } {
  const head = hexToPixel(layout, parseKey(label.cells[0]))
  // Away from the board, along the row.
  const dx = label.x - head.x
  const dy = label.y - head.y
  const mag = Math.hypot(dx, dy) || 1
  // One hex step in pixels — keeps the dash the same size however far the
  // label was nudged out.
  const stepPx = SQRT3 * layout.size
  return {
    x1: label.x + (dx / mag) * stepPx * near,
    y1: label.y + (dy / mag) * stepPx * near,
    x2: label.x + (dx / mag) * stepPx * far,
    y2: label.y + (dy / mag) * stepPx * far,
  }
}

/**
 * The arrowhead that caps the direction dash, as a filled triangle. It sits at
 * the dash's inner end and points the way the row runs — so the whole glyph
 * reads `———▶ 4` with the board beyond the number. Still entirely outside the
 * board: the tip stops at the dash's near end, well clear of the first hex.
 */
export function arrowHead(
  label: LineLabel,
  layout: HexLayout,
): { tip: { x: number; y: number }; left: { x: number; y: number }; right: { x: number; y: number } } {
  const t = tickSegment(label, layout)
  // The dash runs outward, so tip→tail is the inward (row) direction.
  const dx = t.x1 - t.x2
  const dy = t.y1 - t.y2
  const mag = Math.hypot(dx, dy) || 1
  const ux = dx / mag
  const uy = dy / mag
  const len = layout.size * 0.3
  const half = layout.size * 0.17
  const bx = t.x1 - ux * len
  const by = t.y1 - uy * len
  return {
    tip: { x: t.x1, y: t.y1 },
    left: { x: bx - uy * half, y: by + ux * half },
    right: { x: bx + uy * half, y: by - ux * half },
  }
}

/** +1 if `tail` lies forward of `head` along `step`, -1 otherwise. */
function signOf(head: Axial, tail: Axial, step: Axial): number {
  const along = (tail.q - head.q) * step.q + (tail.r - head.r) * step.r
  return along >= 0 ? 1 : -1
}
