// Interaction hot-path performance (T033 / SC-004). Real 60fps canvas painting
// is verified in a browser (e2e/manual); here we guard the pure per-pointer cost
// — layout + hit-testing on a ~217-cell board — which is what must stay cheap on
// every mousemove. A generous ceiling keeps this non-flaky across CI hardware.
import { hexRegion, presentSet } from '@/core/hex'
import { fitLayout, hexToPixel, hitTest } from './layout'

describe('pointer hot path', () => {
  it('layout + 10k hit-tests on a ~217-cell board stay well under budget', () => {
    const present = presentSet(hexRegion(8)) // 217 cells
    const layout = fitLayout(present, 960, 640)
    const centres = [...present].map((k) => {
      const [q, r] = k.split(',').map(Number)
      return hexToPixel(layout, { q, r })
    })

    const t0 = performance.now()
    let hits = 0
    for (let i = 0; i < 10_000; i++) {
      const p = centres[i % centres.length]
      if (hitTest(layout, present, p.x, p.y)) hits++
    }
    const elapsed = performance.now() - t0

    expect(hits).toBe(10_000)
    // 10k picks in < 100ms ⇒ per-mousemove cost is ~0.01ms, far under a frame.
    expect(elapsed).toBeLessThan(100)
  })
})
