// Animation + a11y primitives (T034): reduced motion collapses to instant;
// colorblind cell styles distinguish water from rock by glyph, not just colour.
import { cellStyle } from './cell-style'
import { animate, makeTimeline } from './animations'

describe('reduced motion', () => {
  it('collapses a timeline to instant', () => {
    const t = makeTimeline(400, true)
    expect(t.duration).toBe(0)
    expect(t.progress(0)).toBe(1)
  })

  it('ramps progress 0→1 when motion is allowed', () => {
    const t = makeTimeline(400, false)
    expect(t.progress(0)).toBe(0)
    expect(t.progress(400)).toBe(1)
    expect(t.progress(200)).toBeGreaterThan(0)
    expect(t.progress(200)).toBeLessThan(1)
  })

  it('animate fires a single final frame under reduced motion', () => {
    const frames: number[] = []
    let done = false
    animate(makeTimeline(400, true), (p) => frames.push(p), () => {
      done = true
    })
    expect(frames).toEqual([1])
    expect(done).toBe(true)
  })
})

describe('colorblind-safe cell styles (FR-012)', () => {
  it('distinguishes water and rock by glyph when colorblind mode is on', () => {
    const water = cellStyle('water', true)
    const rock = cellStyle('rock', true)
    expect(water.glyph).not.toBe('')
    expect(rock.glyph).not.toBe('')
    expect(water.glyph).not.toBe(rock.glyph)
  })

  it('uses colour only (no glyph) when colorblind mode is off', () => {
    expect(cellStyle('water', false).glyph).toBe('')
    expect(cellStyle('rock', false).glyph).toBe('')
  })
})
