// shore.test.ts — the endless variety selection (016). The load-bearing claims
// are the conservative ones: defaults reproduce today's board exactly, and a
// choice that can't be honoured degrades to the hexagon rather than throwing.
import { DEFAULT_CLUES } from './request'
import {
  ANY_SHORE,
  type ShoreChoice,
  edgeHintsApply,
  endlessClues,
  isShoreChoice,
  resolveShore,
  shoreName,
  shoresFor,
} from './shore'

describe('shoresFor — what the picker may offer', () => {
  it('offers only Open water on Small: no silhouette supports radius 3', () => {
    expect(shoresFor('Small')).toEqual(['hex'])
  })

  it('offers Any plus every supported silhouette on Medium and Large', () => {
    for (const size of ['Medium', 'Large'] as const) {
      const offered = shoresFor(size)
      expect(offered).toContain('hex')
      expect(offered).toContain(ANY_SHORE)
      expect(offered).toContain('atoll')
      expect(offered).toContain('crescent')
      expect(offered).toContain('wedge')
      expect(offered).toContain('shoal')
    }
  })

  it('leads with Open water so the default is the first choice', () => {
    expect(shoresFor('Medium')[0]).toBe('hex')
  })
})

describe('resolveShore', () => {
  it('is the hexagon by default, so an unchanged setting is an unchanged board', () => {
    expect(resolveShore('hex', 'KELP-0007', 'Large')).toBe('hex')
  })

  it('honours a named shore the size supports', () => {
    expect(resolveShore('atoll', 'KELP-0007', 'Medium')).toBe('atoll')
  })

  // Degrade, don't throw: a persisted 'wedge' + a switch to Small must still
  // produce a board. generateBoard would throw on the unsupported pair.
  it('falls back to the hexagon when the size cannot carry the shore', () => {
    expect(resolveShore('wedge', 'KELP-0007', 'Small')).toBe('hex')
    expect(resolveShore(ANY_SHORE, 'KELP-0007', 'Small')).toBe('hex')
  })

  it('derives a supported shore from the seed under Any', () => {
    for (const seed of ['KELP-0007', 'CORAL-4417', 'TIDE-1234', 'COVE-0001']) {
      for (const size of ['Medium', 'Large'] as const) {
        const shape = resolveShore(ANY_SHORE, seed, size)
        expect(shoresFor(size)).toContain(shape)
      }
    }
  })

  it('is deterministic — the same seed and size always derive the same shore', () => {
    const a = resolveShore(ANY_SHORE, 'CORAL-4417', 'Large')
    const b = resolveShore(ANY_SHORE, 'CORAL-4417', 'Large')
    expect(a).toBe(b)
  })

  it('varies across seeds, or Any would be a pointless choice', () => {
    const seeds = Array.from({ length: 40 }, (_, i) => `TIDE-${String(i).padStart(4, '0')}`)
    const derived = new Set(seeds.map((s) => resolveShore(ANY_SHORE, s, 'Large')))
    expect(derived.size).toBeGreaterThan(1)
  })

  // Any includes the plain hexagon: variety that never serves the familiar
  // board reads as a different game, not a varied one.
  it('can still derive the hexagon under Any', () => {
    const seeds = Array.from({ length: 60 }, (_, i) => `WAVE-${String(i).padStart(4, '0')}`)
    expect(seeds.some((s) => resolveShore(ANY_SHORE, s, 'Large') === 'hex')).toBe(true)
  })
})

describe('endlessClues', () => {
  it('is exactly the shipped default clue set when hints are off', () => {
    for (const d of ['Calm', 'Tricky', 'Deep'] as const) {
      expect(endlessClues(d, false)).toEqual(DEFAULT_CLUES)
    }
  })

  it('adds lineConnectivity at Deep when hints are on', () => {
    expect(endlessClues('Deep', true)).toEqual({
      connectivity: true,
      lineTotals: true,
      lineConnectivity: true,
    })
  })

  /**
   * The measured fact this feature is built on: reduction strips every `{n}` /
   * `-n-` a tier's technique set cannot use, and `line-connectivity` is Deep-only
   * (difficulty.ts). Below Deep the toggle would change the RNG seed string — and
   * therefore the board — while producing no annotation at all. So it is gated
   * here too, not merely hidden in the UI: a stale `true` in settings must never
   * alter a Calm or Tricky board.
   */
  it('leaves Calm and Tricky untouched even when hints are on', () => {
    expect(endlessClues('Calm', true)).toEqual(DEFAULT_CLUES)
    expect(endlessClues('Tricky', true)).toEqual(DEFAULT_CLUES)
  })

  it('edgeHintsApply reports where the toggle does anything', () => {
    expect(edgeHintsApply('Deep')).toBe(true)
    expect(edgeHintsApply('Calm')).toBe(false)
    expect(edgeHintsApply('Tricky')).toBe(false)
  })
})

describe('isShoreChoice / shoreName', () => {
  it('accepts the catalog and Any, and rejects anything else', () => {
    expect(isShoreChoice('hex')).toBe(true)
    expect(isShoreChoice('atoll')).toBe(true)
    expect(isShoreChoice(ANY_SHORE)).toBe(true)
    expect(isShoreChoice('lagoon')).toBe(false)
    expect(isShoreChoice(undefined)).toBe(false)
    expect(isShoreChoice(3)).toBe(false)
  })

  it('names every choice it accepts', () => {
    const choices: ShoreChoice[] = [ANY_SHORE, 'hex', 'atoll', 'crescent', 'wedge', 'shoal']
    for (const c of choices) expect(shoreName(c).length).toBeGreaterThan(0)
    expect(shoreName('hex')).toBe('Open water')
    expect(shoreName(ANY_SHORE)).toBe('Any')
  })
})
