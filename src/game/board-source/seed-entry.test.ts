import { describe, expect, it } from 'vitest'
import { boardLabel } from '@/ui/gameplay/board-label'
import { boardRequest } from '@/ui/shell/board-request'
import { parseSeedEntry } from './seed-entry'
import { toBoardParams } from './request'

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

  it('reads the evenodd token, and its off-switch (018)', () => {
    const on = parseSeedEntry('KELP-0007 Large Deep evenodd', prefs)
    expect(on.ok && on.request.clues?.evenOdd).toBe(true)
    // `even-odd` too, the way `no-hints` accompanies `nohints`.
    const dashed = parseSeedEntry('KELP-0007 Large Deep even-odd', prefs)
    expect(dashed.ok && dashed.request.clues?.evenOdd).toBe(true)
    // ...and a token can turn OFF a preference that is currently on, which
    // silence alone cannot express.
    const off = parseSeedEntry('KELP-0007 Large Deep noevenodd', {
      ...prefs,
      evenOdd: true,
    })
    expect(off.ok && off.request.clues?.evenOdd).toBeUndefined()
  })

  it('round-trips a board label back to the same board (018 FR-009)', () => {
    // The label is the shareable token, so anything that changes which board a
    // seed makes has to survive the trip out and back.
    for (const opts of [
      { edgeHints: false, evenOdd: true },
      { edgeHints: true, evenOdd: true },
      { edgeHints: true, evenOdd: false },
    ]) {
      const params = boardRequest('KELP-0007', 'Large', 'Deep', opts)
      const label = boardLabel(params)
      const parsed = parseSeedEntry(label, prefs)
      expect(parsed.ok, label).toBe(true)
      expect(parsed.ok && toBoardParams(parsed.request), label).toEqual(params)
    }
  })

  it('leaves the evenodd token out of a label that does not need it', () => {
    const params = boardRequest('KELP-0007', 'Large', 'Deep')
    expect(boardLabel(params)).not.toMatch(/evenodd/)
  })

  it('never throws (total function)', () => {
    for (const input of ['', '###', 'CORAL-', '-4417', 'CORAL-99999', 'a b c d e']) {
      expect(() => parseSeedEntry(input, prefs)).not.toThrow()
    }
  })
})
