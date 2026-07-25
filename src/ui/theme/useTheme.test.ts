// Theme resolution (006 US2): Daylight / Night Tide / Auto → data-theme, with
// Auto following the OS and degrading to Daylight where there's no signal.
import { prefersDark, resolveTheme } from './useTheme'

/** Install a fake matchMedia reporting `dark`, returning a restore function. */
function fakeMatchMedia(dark: boolean | 'throw'): () => void {
  const original = window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (q: string) => {
      if (dark === 'throw') throw new Error('matchMedia unavailable')
      return { matches: dark, media: q, addEventListener() {}, removeEventListener() {} }
    },
  })
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: original,
    })
  }
}

describe('resolveTheme', () => {
  it('honours an explicit choice regardless of the OS', () => {
    expect(resolveTheme('Day', true)).toBe('day')
    expect(resolveTheme('Day', false)).toBe('day')
    expect(resolveTheme('Night', false)).toBe('night')
    expect(resolveTheme('Night', true)).toBe('night')
  })

  it('follows the OS under Auto', () => {
    expect(resolveTheme('Auto', true)).toBe('night')
    expect(resolveTheme('Auto', false)).toBe('day')
  })
})

describe('prefersDark', () => {
  it('reports the OS preference', () => {
    let restore = fakeMatchMedia(true)
    expect(prefersDark()).toBe(true)
    restore()

    restore = fakeMatchMedia(false)
    expect(prefersDark()).toBe(false)
    restore()
  })

  it('falls back to light when matchMedia throws or is missing', () => {
    const restore = fakeMatchMedia('throw')
    expect(prefersDark()).toBe(false)
    restore()

    const original = window.matchMedia
    // @ts-expect-error — deliberately removing it to model an old webview
    window.matchMedia = undefined
    expect(prefersDark()).toBe(false)
    expect(resolveTheme('Auto')).toBe('day')
    window.matchMedia = original
  })
})
