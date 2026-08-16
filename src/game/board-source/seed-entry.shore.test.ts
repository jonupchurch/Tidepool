// seed-entry.shore.test.ts — the 016 half of the token grammar: a shared board
// only reproduces if the shore and the edge hints travel with the seed.
import { describe, expect, it } from 'vitest'
import { ANY_SHORE } from './shore'
import { type SeedEntryPrefs, parseSeedEntry } from './seed-entry'

const prefs: SeedEntryPrefs = {
  size: 'Small',
  difficulty: 'Calm',
  shore: 'hex',
  edgeHints: false,
}

describe('parseSeedEntry — shores', () => {
  it('says nothing about clues or shape for a default board, as before', () => {
    // The request carries only what DIFFERS from the default, so `toBoardParams`
    // fills the rest — which is what keeps a pre-016 token byte-identical.
    expect(parseSeedEntry('CORAL-4417', prefs)).toEqual({
      ok: true,
      request: { seed: 'CORAL-4417', size: 'Small', difficulty: 'Calm' },
    })
  })

  it('reads a shore token', () => {
    const r = parseSeedEntry('KELP-0007 Large Deep atoll', prefs)
    expect(r.ok && r.request.shape).toBe('atoll')
  })

  it('is case-insensitive and accepts the player-facing name', () => {
    expect(parseSeedEntry('KELP-0007 Medium Deep CRESCENT', prefs).ok).toBe(true)
    const r = parseSeedEntry('KELP-0007 Medium Deep Crescent', prefs)
    expect(r.ok && r.request.shape).toBe('crescent')
  })

  it('resolves an Any token from the seed, so the token still reproduces', () => {
    const a = parseSeedEntry('KELP-0007 Large Deep any', prefs)
    const b = parseSeedEntry('KELP-0007 Large Deep any', prefs)
    expect(a).toEqual(b)
    expect(a.ok && a.request.size).toBe('Large')
  })

  // Order-independence matters because the token is typed by a human reading a
  // label off a screen, not produced by a parser.
  it('does not care what order the tokens come in', () => {
    const a = parseSeedEntry('KELP-0007 Large Deep wedge hints', prefs)
    const b = parseSeedEntry('KELP-0007 wedge hints Deep Large', prefs)
    expect(a).toEqual(b)
  })

  it('drops a shore the named size cannot carry rather than refusing the seed', () => {
    const r = parseSeedEntry('KELP-0007 Small wedge', prefs)
    expect(r.ok).toBe(true)
    expect(r.ok && r.request.shape).toBeUndefined()
  })

  it('accepts the separators the board label uses, so it can be pasted', () => {
    const r = parseSeedEntry('KELP-0007 · Large · Deep · Atoll', prefs)
    expect(r.ok && r.request.shape).toBe('atoll')
    expect(r.ok && r.request.size).toBe('Large')
  })
})

describe('parseSeedEntry — edge hints', () => {
  it('reads a hints token at Deep', () => {
    const r = parseSeedEntry('KELP-0007 Large Deep hints', prefs)
    expect(r.ok && r.request.clues).toEqual({
      connectivity: true,
      lineTotals: true,
      lineConnectivity: true,
    })
  })

  it('ignores a hints token below Deep — the annotations would not survive', () => {
    for (const tier of ['Calm', 'Tricky']) {
      const r = parseSeedEntry(`KELP-0007 Large ${tier} hints`, prefs)
      expect(r.ok && r.request.clues).toBeUndefined()
    }
  })

  it('lets `nohints` turn off a pref that is on', () => {
    const on = { ...prefs, edgeHints: true }
    const inherited = parseSeedEntry('KELP-0007 Large Deep', on)
    expect(inherited.ok && inherited.request.clues?.lineConnectivity).toBe(true)
    const off = parseSeedEntry('KELP-0007 Large Deep nohints', on)
    expect(off.ok && off.request.clues).toBeUndefined()
  })

  it('inherits the current prefs when the token is silent', () => {
    const r = parseSeedEntry('KELP-0007 Large Deep', { ...prefs, shore: ANY_SHORE, edgeHints: true })
    expect(r.ok && r.request.shape).toBeDefined()
    expect(r.ok && r.request.clues?.lineConnectivity).toBe(true)
  })

  it('still ignores genuinely unknown trailing tokens', () => {
    const r = parseSeedEntry('KELP-0007 Large Deep banana', prefs)
    expect(r.ok).toBe(true)
    expect(r.ok && r.request.seed).toBe('KELP-0007')
  })
})

// Guard against the grammar silently swallowing something meaningful.
describe('token grammar is unambiguous', () => {
  it('never reads a shore name as a size or difficulty', () => {
    const r = parseSeedEntry('KELP-0007 shoal', prefs)
    expect(r.ok && r.request.size).toBe('Small')
    expect(r.ok && r.request.difficulty).toBe('Calm')
  })
})
