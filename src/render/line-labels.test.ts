// Line-label placement: a total must be unambiguously attributable to its own
// row (collinear with it, outside the board) and must not overlap another
// label. Also covers click-to-toggle hit-testing and the guide segment.
import { lineIndex, parseKey } from '@/core'
import { hexRegion, presentSet } from '@/core/hex'
import { fullyClued, layoutOf } from '@/core/test-helpers'
import { fitLayout, hexToPixel } from './layout'
import { AXIS_STEP, guideSegment, labelAt, lineAnchors, lineLabels } from './line-labels'

// A fully-clued board shows EVERY line on all three axes — the densest label
// case there is, and so the strongest test of the anti-overlap rule. (Generated
// boards carry a reduced subset; some carry none at all.)
const present = presentSet(hexRegion(4)) // 61 cells
const water = [...present].filter((_, i) => i % 3 === 0)
const board = fullyClued(present, layoutOf(present, water), { withLines: true })
const W = 960
const H = 640
// Labels live outside the board, so the fit must reserve room for them —
// otherwise they render off-canvas (they are drawn, just not visible).
const layout = fitLayout(
  board.present,
  W,
  H,
  24,
  lineAnchors(board).map((a) => a.coord),
)
const labels = lineLabels(board, layout)

/** Perpendicular distance from `p` to the infinite line through `a` along `dir`. */
function offAxis(
  p: { x: number; y: number },
  a: { x: number; y: number },
  dir: { x: number; y: number },
): number {
  const mag = Math.hypot(dir.x, dir.y)
  return Math.abs((p.x - a.x) * dir.y - (p.y - a.y) * dir.x) / mag
}

describe('lineLabels placement', () => {
  it('emits one label per line clue', () => {
    expect(labels.length).toBe(board.lines.length)
    expect(labels.length).toBeGreaterThan(0)
  })

  it('sits collinear with its own row — the cue that identifies the row', () => {
    for (const l of labels) {
      const first = parseKey(l.cells[0])
      const step = AXIS_STEP[l.axis]
      const a = hexToPixel(layout, first)
      const ahead = hexToPixel(layout, { q: first.q + step.q, r: first.r + step.r })
      const dir = { x: ahead.x - a.x, y: ahead.y - a.y }
      // Within a hairline of the row's axis through its first cell.
      expect(offAxis(l, a, dir)).toBeLessThan(layout.size * 0.02)
    }
  })

  it('places every label outside the board, past the end of its row', () => {
    for (const l of labels) {
      expect(board.present.has(`${Math.round(axialOf(l).q)},${Math.round(axialOf(l).r)}`)).toBe(
        false,
      )
    }
  })

  it('keeps every label on the row it reports', () => {
    for (const l of labels) {
      for (const c of l.cells) {
        // `+ 0` normalizes -0 (lineIndex negates on axis 2) so Object.is agrees.
        expect(lineIndex(parseKey(c), l.axis) + 0).toBe(l.index + 0)
      }
    }
  })

  it('never overlaps another label', () => {
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const d = Math.hypot(labels[i].x - labels[j].x, labels[i].y - labels[j].y)
        expect(d, `${labels[i].id} vs ${labels[j].id}`).toBeGreaterThan(layout.size * 1.5)
      }
    }
  })

  it('lands every label inside the viewport, with room for the numeral', () => {
    const pad = layout.size * 0.5 // half a hex — comfortably clears the glyph
    for (const l of labels) {
      expect(l.x, `${l.id} off the left/right edge`).toBeGreaterThan(pad)
      expect(l.x).toBeLessThan(W - pad)
      expect(l.y, `${l.id} off the top/bottom edge`).toBeGreaterThan(pad)
      expect(l.y).toBeLessThan(H - pad)
    }
  })

  it('still fits every board cell on-canvas alongside the labels', () => {
    for (const k of board.present) {
      const p = hexToPixel(layout, parseKey(k))
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(W)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(H)
    }
  })

  it('anchors are size-independent — the same board fits any viewport', () => {
    const small = fitLayout(
      board.present,
      480,
      320,
      24,
      lineAnchors(board).map((a) => a.coord),
    )
    const scaled = lineLabels(board, small)
    expect(scaled.map((l) => l.id)).toEqual(labels.map((l) => l.id))
    for (const l of scaled) {
      expect(l.x).toBeGreaterThan(0)
      expect(l.x).toBeLessThan(480)
      expect(l.y).toBeGreaterThan(0)
      expect(l.y).toBeLessThan(320)
    }
  })

  it('is deterministic for the same board + layout', () => {
    expect(lineLabels(board, layout)).toEqual(labels)
  })

  it('covers all three axes', () => {
    expect(new Set(labels.map((l) => l.axis))).toEqual(new Set([0, 1, 2]))
  })

  it('returns nothing when the board carries no line clues', () => {
    const plain = fullyClued(present, layoutOf(present, water), { withLines: false })
    expect(lineLabels(plain, fitLayout(plain.present, 960, 640))).toEqual([])
  })
})

describe('labelAt (click to toggle a row)', () => {
  const radius = layout.size * 0.7

  it('picks the label under the pointer', () => {
    for (const l of labels) {
      expect(labelAt(labels, l.x, l.y, radius)?.id).toBe(l.id)
    }
  })

  it('returns null away from every label', () => {
    expect(labelAt(labels, -5000, -5000, radius)).toBeNull()
  })

  it('does not claim a cell centre', () => {
    for (const k of board.present) {
      const p = hexToPixel(layout, parseKey(k))
      expect(labelAt(labels, p.x, p.y, radius)).toBeNull()
    }
  })
})

describe('guideSegment', () => {
  it('spans the whole row and overhangs both ends', () => {
    for (const l of labels) {
      const seg = guideSegment(l, layout)
      const ends = [l.cells[0], l.cells[l.cells.length - 1]].map((c) =>
        hexToPixel(layout, parseKey(c)),
      )
      const segLen = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1)
      const rowLen = Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y)
      expect(segLen).toBeGreaterThan(rowLen)
      // Every cell of the row lies on the segment's line.
      for (const c of l.cells) {
        const p = hexToPixel(layout, parseKey(c))
        const dir = { x: seg.x2 - seg.x1, y: seg.y2 - seg.y1 }
        expect(offAxis(p, { x: seg.x1, y: seg.y1 }, dir)).toBeLessThan(layout.size * 0.02)
      }
    }
  })
})

/** Recover a label's (fractional) axial coord, for the "outside the board" check. */
function axialOf(l: { x: number; y: number }): { q: number; r: number } {
  const SQRT3 = Math.sqrt(3)
  const r = (l.y - layout.originY) / (layout.size * 1.5)
  const q = (l.x - layout.originX) / (layout.size * SQRT3) - r / 2
  return { q, r }
}
