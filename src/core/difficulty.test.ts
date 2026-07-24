// Difficulty rating tests (T024): technique → tier mapping, depth bumps, and
// the reduction gate per tier.
import { CALM_DEPTH_MAX, TRICKY_DEPTH_MAX, allowedTechniquesFor, rateDifficulty } from './difficulty'

describe('rateDifficulty', () => {
  it('rates pure forced-count as Calm', () => {
    expect(rateDifficulty(['forced-count'], 3)).toBe('Calm')
  })

  it('rates line-total or subset-overlap as Tricky', () => {
    expect(rateDifficulty(['forced-count', 'line-total'], 3)).toBe('Tricky')
    expect(rateDifficulty(['forced-count', 'subset-overlap'], 3)).toBe('Tricky')
  })

  it('rates connectivity as Deep', () => {
    expect(rateDifficulty(['forced-count', 'connectivity'], 3)).toBe('Deep')
    expect(rateDifficulty(['forced-count', 'line-total', 'connectivity'], 3)).toBe('Deep')
  })

  it('bumps very long chains up a tier', () => {
    expect(rateDifficulty(['forced-count'], CALM_DEPTH_MAX + 1)).toBe('Tricky')
    expect(rateDifficulty(['forced-count', 'line-total'], TRICKY_DEPTH_MAX + 1)).toBe('Deep')
  })

  it('does not bump within-threshold chains', () => {
    expect(rateDifficulty(['forced-count'], CALM_DEPTH_MAX)).toBe('Calm')
    expect(rateDifficulty(['forced-count', 'line-total'], TRICKY_DEPTH_MAX)).toBe('Tricky')
  })
})

describe('allowedTechniquesFor', () => {
  it('Calm allows only forced-count', () => {
    expect([...allowedTechniquesFor('Calm')].sort()).toEqual(['forced-count'])
  })

  it('Tricky adds line-total and subset-overlap but not connectivity', () => {
    const t = allowedTechniquesFor('Tricky')
    expect(t.has('line-total')).toBe(true)
    expect(t.has('subset-overlap')).toBe(true)
    expect(t.has('connectivity')).toBe(false)
  })

  it('Deep allows connectivity (and line-total) but not subset', () => {
    const d = allowedTechniquesFor('Deep')
    expect(d.has('connectivity')).toBe(true)
    expect(d.has('line-total')).toBe(true)
    expect(d.has('subset-overlap')).toBe(false)
  })
})
