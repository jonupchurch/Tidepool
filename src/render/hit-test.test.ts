// Hit-test / layout (T007): pixel↔hex round-trips and cell picking on a known
// layout, plus fit-to-viewport keeping a large board on-canvas.
import { hexRegion, presentSet } from '@/core/hex'
import { fitLayout, hexToPixel, pixelToAxial } from './layout'
import { hitTest } from './hit-test'

describe('layout round-trip', () => {
  const layout = { size: 20, originX: 300, originY: 300 }
  const present = presentSet(hexRegion(3))

  it('pixelToAxial(hexToPixel(cell)) is the identity for every cell', () => {
    for (const k of present) {
      const [q, r] = k.split(',').map(Number)
      const px = hexToPixel(layout, { q, r })
      expect(pixelToAxial(layout, px.x, px.y)).toEqual({ q, r })
    }
  })

  it('hitTest at a cell centre returns that cell key; off-board returns null', () => {
    for (const k of present) {
      const [q, r] = k.split(',').map(Number)
      const px = hexToPixel(layout, { q, r })
      expect(hitTest(layout, present, px.x, px.y)).toBe(k)
    }
    expect(hitTest(layout, present, -10_000, -10_000)).toBeNull()
  })
})

describe('fitLayout', () => {
  it('keeps a large (~250-cell) board within the viewport and round-tripping', () => {
    const present = presentSet(hexRegion(8)) // 217 cells
    const W = 960
    const H = 640
    const layout = fitLayout(present, W, H)
    expect(layout.size).toBeGreaterThan(0)
    for (const k of present) {
      const [q, r] = k.split(',').map(Number)
      const px = hexToPixel(layout, { q, r })
      expect(px.x).toBeGreaterThanOrEqual(0)
      expect(px.x).toBeLessThanOrEqual(W)
      expect(px.y).toBeGreaterThanOrEqual(0)
      expect(px.y).toBeLessThanOrEqual(H)
      expect(pixelToAxial(layout, px.x, px.y)).toEqual({ q, r })
    }
  })
})
