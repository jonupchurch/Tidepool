// Line-label placement: a total must be unambiguously attributable to its own
// row (collinear with it, outside the board) and must not overlap another
// label. Also covers click-to-toggle hit-testing and the guide segment.
import { lineIndex, parseKey } from '@/core'
import { hexRegion, presentSet } from '@/core/hex'
import { fullyClued, layoutOf } from '@/core/test-helpers'
import { fitLayout, hexToPixel } from './layout'
import {
  AXIS_STEP,
  guideSegment,
  labelAt,
  lineAnchors,
  lineLabels,
  tickSegment,
} from './line-labels'

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
  lineAnchors(board).flatMap((a) => [a.coord, a.tip]),
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

  it('hugs the board edge rather than floating out in the margin', () => {
    const step = Math.sqrt(3) * layout.size
    const gaps = labels.map((l) => {
      const first = hexToPixel(layout, parseKey(l.cells[0]))
      return Math.hypot(l.x - first.x, l.y - first.y) / step
    })
    // Hard bound: nothing may drift past the last nudge the placer will try.
    for (const [i, g] of gaps.entries()) {
      expect(g, `${labels[i].id} drifted too far from its row`).toBeLessThanOrEqual(2.51)
    }
    // And on this every-line-clued worst case, most still sit right on the edge.
    const snug = gaps.filter((g) => g < 0.9).length
    expect(snug / gaps.length).toBeGreaterThan(0.8)
  })

  it('resolves crowding by flipping to the row\'s other end, not by pushing out', () => {
    // With every line clued, both ends get used — proof the flip is doing the
    // work. (`cells[0]` is the end the label sits at, in linesOf order.)
    const flipped = labels.filter((l) => {
      const line = l.cells
      return line[0] > line[line.length - 1] // reversed => placed at the far end
    })
    expect(flipped.length).toBeGreaterThan(0)
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
  const radius = layout.size * 0.55

  it('picks the label under the pointer', () => {
    for (const l of labels) {
      expect(labelAt(labels, l.x, l.y, radius)?.id).toBe(l.id)
    }
  })

  it('returns null away from every label', () => {
    expect(labelAt(labels, -5000, -5000, radius)).toBeNull()
  })

  it('never reaches inside a hex — a label may not steal a mark', () => {
    // Sample each cell's centre and its six corners: the whole tile must be
    // free of every label's touch target.
    for (const k of board.present) {
      const c = hexToPixel(layout, parseKey(k))
      expect(labelAt(labels, c.x, c.y, radius), `centre of ${k}`).toBeNull()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i - 30)
        const x = c.x + layout.size * 0.98 * Math.cos(a)
        const y = c.y + layout.size * 0.98 * Math.sin(a)
        expect(labelAt(labels, x, y, radius), `corner ${i} of ${k}`).toBeNull()
      }
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

describe('tickSegment (direction dash)', () => {
  it('lies along its row and never crosses into a hex', () => {
    const cellCentres = [...board.present].map((k) => hexToPixel(layout, parseKey(k)))
    // A pointy-top hex's apothem — inside this radius the dash is over a tile.
    const apothem = (Math.sqrt(3) / 2) * layout.size
    for (const l of labels) {
      const t = tickSegment(l, layout)
      // Collinear with the row it belongs to...
      const first = hexToPixel(layout, parseKey(l.cells[0]))
      const dir = { x: t.x2 - t.x1, y: t.y2 - t.y1 }
      expect(offAxis(first, { x: t.x1, y: t.y1 }, dir)).toBeLessThan(layout.size * 0.02)
      // ...on the far side of the number from the board...
      const away = { x: l.x - first.x, y: l.y - first.y }
      expect(dir.x * away.x + dir.y * away.y).toBeGreaterThan(0)
      // ...and clear of every tile, sampled along its length.
      for (let s = 0; s <= 1; s += 0.05) {
        const p = { x: t.x1 + (t.x2 - t.x1) * s, y: t.y1 + (t.y2 - t.y1) * s }
        for (const c of cellCentres) {
          expect(Math.hypot(p.x - c.x, p.y - c.y), `${l.id} dash overlaps a hex`).toBeGreaterThan(
            apothem,
          )
        }
      }
    }
  })

  it('starts clear of the numeral', () => {
    for (const l of labels) {
      const t = tickSegment(l, layout)
      expect(Math.hypot(t.x1 - l.x, t.y1 - l.y)).toBeGreaterThan(layout.size * 0.5)
    }
  })

  it('stays on-canvas — the fit reserves room for the dash, not just the number', () => {
    for (const l of labels) {
      const t = tickSegment(l, layout)
      for (const [x, y] of [
        [t.x1, t.y1],
        [t.x2, t.y2],
      ]) {
        expect(x, `${l.id} dash off the left/right edge`).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(W)
        expect(y, `${l.id} dash off the top/bottom edge`).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(H)
      }
    }
  })

  it('is the same length for every label, however far it was nudged out', () => {
    const lengths = labels.map((l) => {
      const t = tickSegment(l, layout)
      return Math.hypot(t.x2 - t.x1, t.y2 - t.y1)
    })
    for (const len of lengths) expect(len).toBeCloseTo(lengths[0], 6)
  })
})

/** Recover a label's (fractional) axial coord, for the "outside the board" check. */
function axialOf(l: { x: number; y: number }): { q: number; r: number } {
  const SQRT3 = Math.sqrt(3)
  const r = (l.y - layout.originY) / (layout.size * 1.5)
  const q = (l.x - layout.originX) / (layout.size * SQRT3) - r / 2
  return { q, r }
}
