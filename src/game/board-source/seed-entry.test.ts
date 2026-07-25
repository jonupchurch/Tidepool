import { describe, expect, it } from 'vitest'
import { parseSeedEntry } from './seed-entry'

const prefs = { size: 'Small', difficulty: 'Calm' } as const

describe('parseSeedEntry (total, SC-003 / SC-005)', () => {
  it('accepts a bare seed and applies the current prefs', () => {
    const r = parseSeedEntry('CORAL-4417', prefs)
    expect(r).toEqual({ ok: true, request: { seed: 'CORAL-4417', size: 'Small', difficulty: 'Calm' } })
  })

  it('normalizes case + whitespace', () => {
    const r = parseSeedEntry('  coral-4417 ', prefs)
    expect(r.ok && r.request.seed).toBe('CORAL-4417')
  })

  it('lets a full token override size + difficulty', () => {
    const r = parseSeedEntry('CORAL-4417 Large Deep', prefs)
    expect(r).toEqual({ ok: true, request: { seed: 'CORAL-4417', size: 'Large', difficulty: 'Deep' } })
  })

  it('accepts a partial override (size only)', () => {
    const r = parseSeedEntry('kelp-12 medium', prefs)
    expect(r).toEqual({ ok: true, request: { seed: 'KELP-12', size: 'Medium', difficulty: 'Calm' } })
  })

  it('is case-insensitive for size/difficulty tokens', () => {
    const r = parseSeedEntry('TIDE-1/large/tricky', prefs)
    expect(r).toEqual({ ok: true, request: { seed: 'TIDE-1', size: 'Large', difficulty: 'Tricky' } })
  })

  it('rejects a garbled seed with a gentle reason (no board)', () => {
    const r = parseSeedEntry('hello there', prefs)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason.length).toBeGreaterThan(0)
  })

  it('rejects empty input with a gentle reason', () => {
    for (const input of ['', '   ']) {
      const r = parseSeedEntry(input, prefs)
      expect(r.ok).toBe(false)
    }
  })

  it('never throws (total function)', () => {
    for (const input of ['', '###', 'CORAL-', '-4417', 'CORAL-99999', 'a b c d e']) {
      expect(() => parseSeedEntry(input, prefs)).not.toThrow()
    }
  })
})
