import { MAX_RATIO, backingSize, currentPixelRatio } from './pixel-ratio'

describe('backingSize', () => {
  it('matches the CSS box on an ordinary display', () => {
    expect(backingSize(800, 600, 1)).toEqual({ width: 800, height: 600, scale: 1 })
  })

  it('scales the buffer up on a scaled display', () => {
    // 150% Windows scaling — by far the most common case this fixes.
    expect(backingSize(800, 600, 1.5)).toEqual({ width: 1200, height: 900, scale: 1.5 })
    expect(backingSize(800, 600, 2)).toEqual({ width: 1600, height: 1200, scale: 2 })
  })

  it('clamps beyond 2×, where the buffer grows faster than the benefit', () => {
    expect(backingSize(800, 600, 3)).toEqual({ width: 1600, height: 1200, scale: MAX_RATIO })
    expect(backingSize(800, 600, 4)).toEqual({ width: 1600, height: 1200, scale: MAX_RATIO })
  })

  it('rounds to whole device pixels', () => {
    // A fractional buffer dimension is silently floored by the browser, which
    // leaves the drawn image a hair short of the CSS box — a visible seam.
    const { width, height } = backingSize(801, 601, 1.5)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
    expect(width).toBe(1202)
    expect(height).toBe(902)
  })

  it('never produces a zero dimension', () => {
    // A collapsed container is normal — a hidden tab, a pane mid-drag — and a
    // 0×0 canvas throws in some engines.
    expect(backingSize(0, 0, 2)).toMatchObject({ width: 1, height: 1 })
    expect(backingSize(-50, -50, 1)).toMatchObject({ width: 1, height: 1 })
  })

  it('treats a nonsense ratio as 1', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(backingSize(800, 600, bad)).toEqual({ width: 800, height: 600, scale: 1 })
    }
  })
})

describe('currentPixelRatio', () => {
  it('reports what the window says', () => {
    const original = window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2.5 })
    expect(currentPixelRatio()).toBe(2.5)
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: original })
  })

  it('falls back to 1 where the window cannot say', () => {
    const original = window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: undefined })
    // Undefined is not a usable ratio; backingSize normalises it away.
    expect(backingSize(100, 100, currentPixelRatio())).toEqual({
      width: 100,
      height: 100,
      scale: 1,
    })
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: original })
  })
})
