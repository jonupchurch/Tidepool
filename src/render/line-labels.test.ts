// Line-label placement: a total must be unambiguously attributable to its own
// row (collinear with it, outside the board) and must not overlap another
// label. Also covers click-to-toggle hit-testing and the guide segment.
import { SIZE_TIERS, lineIndex, parseKey } from '@/core'
import { hexRegion, presentSet } from '@/core/hex'
import { DEFAULT_SHAPE, SHAPE_IDS, shapePresent, shapeSupportsSize } from '@/core/shapes'
import { fullyClued, layoutOf } from '@/core/test-helpers'
import { fitLayout, hexToPixel } from './layout'
import {
  AXIS_STEP,
  arrowHead,
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

describe('arrowHead', () => {
  it('points the way the row runs, and stays clear of every hex', () => {
    const cellCentres = [...board.present].map((k) => hexToPixel(layout, parseKey(k)))
    const apothem = (Math.sqrt(3) / 2) * layout.size
    for (const l of labels) {
      const a = arrowHead(l, layout)
      const first = hexToPixel(layout, parseKey(l.cells[0]))
      // Tip leads toward the board (the direction the guide will run).
      const nose = {
        x: a.tip.x - (a.left.x + a.right.x) / 2,
        y: a.tip.y - (a.left.y + a.right.y) / 2,
      }
      const toBoard = { x: first.x - l.x, y: first.y - l.y }
      expect(nose.x * toBoard.x + nose.y * toBoard.y).toBeGreaterThan(0)
      // Aligned with the row, not skewed off it.
      const offRow = offAxis(a.tip, l, toBoard)
      expect(offRow).toBeLessThan(layout.size * 0.02)
      for (const p of [a.tip, a.left, a.right]) {
        for (const c of cellCentres) {
          expect(Math.hypot(p.x - c.x, p.y - c.y), `${l.id} arrow overlaps a hex`).toBeGreaterThan(
            apothem,
          )
        }
      }
    }
  })

  it('sits at the dash, on the far side of the number from the board', () => {
    for (const l of labels) {
      const a = arrowHead(l, layout)
      const first = hexToPixel(layout, parseKey(l.cells[0]))
      const away = { x: l.x - first.x, y: l.y - first.y }
      const fromLabel = { x: a.tip.x - l.x, y: a.tip.y - l.y }
      expect(fromLabel.x * away.x + fromLabel.y * away.y).toBeGreaterThan(0)
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

// 010: an annotated total renders as `{4}` / `-4-`, which is roughly twice as
// wide as `4`. Placement is tuned in hex-step units for a bare number, so the
// annotated case needs its own clearance or the labels touch.
describe('annotated row totals (010)', () => {
  const annotatedBoard = {
    ...board,
    lines: board.lines.map((l, i) => ({
      ...l,
      // Annotate every other row: a mix is the case that actually exercises
      // "the wider of the pair sets the clearance".
      ...(i % 2 === 0 ? { connectivity: 'connected' as const } : {}),
    })),
  }
  const annotatedLayout = fitLayout(
    annotatedBoard.present,
    W,
    H,
    24,
    lineAnchors(annotatedBoard).flatMap((a) => [a.coord, a.tip]),
  )
  const annotatedLabels = lineLabels(annotatedBoard, annotatedLayout)

  it('carries the annotation through to the label', () => {
    expect(annotatedLabels.some((l) => l.connectivity === 'connected')).toBe(true)
    expect(annotatedLabels.filter((l) => !l.connectivity).length).toBeGreaterThan(0)
  })

  it('the wider clearance actually takes effect on placement', () => {
    // Same board, same rows — only the annotations differ. If the clearance
    // rule were inert, every label would land in exactly the same place.
    const bare = lineLabels(board, annotatedLayout)
    const byId = new Map(bare.map((l) => [l.id, l]))
    const moved = annotatedLabels.filter((l) => {
      const b = byId.get(l.id)
      return b && (Math.abs(b.x - l.x) > 0.01 || Math.abs(b.y - l.y) > 0.01)
    })
    expect(moved.length).toBeGreaterThan(0)
  })

  it('clears the wider gap wherever the nudge search can satisfy it', () => {
    // The dense fully-clued board above is deliberately over-subscribed: the
    // nudge search gives up after MAX_NUDGE and some labels end up inside even
    // the BARE gap. That is pre-existing behaviour, not something 010 changed,
    // so the widened-clearance rule is checked on a board with room instead.
    const sparse = presentSet(hexRegion(3))
    const sparseWater = [...sparse].filter((_, i) => i % 3 === 0)
    const base = fullyClued(sparse, layoutOf(sparse, sparseWater), { withLines: true })
    const roomy = {
      ...base,
      // Three well-separated rows on one axis, all annotated.
      lines: base.lines
        .filter((l) => l.axis === 0 && Math.abs(l.index) === 3)
        .map((l) => ({ ...l, connectivity: 'split' as const })),
    }
    const l2 = fitLayout(
      roomy.present,
      W,
      H,
      24,
      lineAnchors(roomy).flatMap((a) => [a.coord, a.tip]),
    )
    const placed = lineLabels(roomy, l2)
    expect(placed.length).toBeGreaterThan(1)
    const stepPx = Math.sqrt(3) * l2.size
    for (const a of placed) {
      for (const b of placed) {
        if (a.id === b.id) continue
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(
          1.5 * 1.45 * stepPx * 0.999,
        )
      }
    }
  })

  it('an annotated label keeps a click target matching its width', () => {
    const wide = annotatedLabels.find((l) => l.connectivity)!
    const radius = annotatedLayout.size * 0.55
    // A point out at the brace — past a bare label's radius, inside a wide one's.
    const offset = radius * 1.2
    expect(labelAt(annotatedLabels, wide.x + offset, wide.y, radius)?.id).toBe(wide.id)
  })

  it('does not widen the target for a plain total', () => {
    const plain = lineLabels(board, layout)
    const l = plain[0]
    const radius = layout.size * 0.55
    expect(labelAt(plain, l.x + radius * 1.2, l.y, radius)).toBeNull()
  })

  it('leaves an unannotated board carrying no annotation at all', () => {
    // Boards players already have take the bare gap on every label, so their
    // layout is untouched — the same reason the seed string is append-only.
    expect(lineLabels(board, layout).every((l) => l.connectivity === undefined)).toBe(true)
  })
})

// 012: labels on irregular boards.
//
// Planning this feature predicted that a concave silhouette would let a short
// row's label land on a NEIGHBOURING row's cell. It doesn't, and the reason is
// worth keeping: a label sits ON its own row's line, and rows of the same axis
// lie on parallel lines 1.5 units apart in unit space — wider than a hex's
// radius. Collinearity, chosen so a label would identify its row, also keeps it
// clear of every cell on the board.
//
// These tests therefore pin an invariant rather than guard a fixed bug, and they
// are the ones that would notice if a future anchor rule broke it.
describe('label placement on irregular boards (012)', () => {
  const shapes = SHAPE_IDS.filter((id) => id !== DEFAULT_SHAPE)

  for (const id of shapes) {
    for (const size of SIZE_TIERS) {
      if (!shapeSupportsSize(id, size)) continue

      it(`${id}/${size}: no label lands on a cell`, () => {
        const present = shapePresent(size, id)
        const water = [...present].filter((_, i) => i % 3 === 0)
        const b = fullyClued(present, layoutOf(present, water), { withLines: true })
        const anchors = lineAnchors(b)
        expect(anchors.length).toBeGreaterThan(0)

        const SQ3 = Math.sqrt(3)
        const unitOf = (a: { q: number; r: number }) => ({
          x: SQ3 * (a.q + a.r / 2),
          y: 1.5 * a.r,
        })
        const cells = [...present].map((k) => unitOf(parseKey(k)))

        for (const a of anchors) {
          const u = unitOf(a.coord)
          const nearest = Math.min(...cells.map((c) => Math.hypot(c.x - u.x, c.y - u.y)))
          // 1.0 is a hex's centre-to-corner radius in unit space: closer than
          // that and the label centre is literally inside a hex.
          expect(nearest, `${id}/${size} label ${a.id} sits on a cell`).toBeGreaterThan(1)
        }
      })

      it(`${id}/${size}: every label still identifies its own row`, () => {
        const present = shapePresent(size, id)
        const water = [...present].filter((_, i) => i % 3 === 0)
        const b = fullyClued(present, layoutOf(present, water), { withLines: true })
        const l = fitLayout(
          b.present,
          W,
          H,
          24,
          lineAnchors(b).flatMap((a) => [a.coord, a.tip]),
        )
        for (const label of lineLabels(b, l)) {
          const first = parseKey(label.cells[0])
          const step = AXIS_STEP[label.axis]
          const a = hexToPixel(l, first)
          const ahead = hexToPixel(l, { q: first.q + step.q, r: first.r + step.r })
          expect(
            offAxis({ x: label.x, y: label.y }, a, { x: ahead.x - a.x, y: ahead.y - a.y }),
            `${id}/${size} ${label.id} drifted off its own axis`,
          ).toBeLessThan(0.01 * l.size)
        }
      })
    }
  }

  it('a shaped board really is concave enough to matter', () => {
    // If every silhouette were convex the tests above would be vacuous.
    const present = shapePresent('Medium', 'crescent')
    const hex = presentSet(hexRegion(5))
    expect(present.size).toBeLessThan(hex.size)
  })
})
