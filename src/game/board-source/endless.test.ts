import { describe, expect, it } from 'vitest'
import { generateBoard, parseSeed, rateDifficulty, solve } from '@/core'
import { createEndlessStream, loadEndlessPrefs, nextSeed, saveEndlessPrefs, seedAtIndex } from './endless'
import { toBoardParams } from './request'
import { makeFakeStore } from './test-helpers'

describe('nextSeed', () => {
  it('is a pure, deterministic derivation', () => {
    expect(nextSeed('CORAL-4417')).toBe(nextSeed('CORAL-4417'))
  })

  it('produces a valid WORD-NNNN seed', () => {
    for (const s of ['CORAL-4417', 'KELP-0001', 'TIDE-9999']) {
      expect(parseSeed(nextSeed(s))).not.toBeNull()
    }
  })

  it('advances (does not return the same seed)', () => {
    expect(nextSeed('CORAL-4417')).not.toBe('CORAL-4417')
  })
})

describe('createEndlessStream (SC-001)', () => {
  it('reproduces the identical sequence from the same start', () => {
    const opts = { startSeed: 'CORAL-4417', size: 'Small', difficulty: 'Calm' } as const
    const a = createEndlessStream(opts)
    const b = createEndlessStream(opts)
    const seqA = [a.current().seed, a.next().seed, a.next().seed, a.next().seed]
    const seqB = [b.current().seed, b.next().seed, b.next().seed, b.next().seed]
    expect(seqA).toEqual(seqB)
    // …and all distinct steps (a real stream, not a stuck value).
    expect(new Set(seqA).size).toBe(seqA.length)
  })

  it('carries the chosen size/difficulty on every request', () => {
    const s = createEndlessStream({ startSeed: 'KELP-0001', size: 'Medium', difficulty: 'Tricky' })
    for (const r of [s.current(), s.next(), s.next()]) {
      expect(r).toMatchObject({ size: 'Medium', difficulty: 'Tricky' })
    }
  })

  it('seedAtIndex matches stepping the stream', () => {
    const s = createEndlessStream({ startSeed: 'TIDE-0001', size: 'Small', difficulty: 'Calm' })
    s.next() // index 1
    s.next() // index 2
    expect(s.current().seed).toBe(seedAtIndex('TIDE-0001', 2))
  })
})

describe('endless boards (T011)', () => {
  it('every stream step generates a uniquely-solvable board at the requested tier', () => {
    const stream = createEndlessStream({ startSeed: 'COVE-0007', size: 'Small', difficulty: 'Calm' })
    for (let i = 0; i < 3; i++) {
      const req = i === 0 ? stream.current() : stream.next()
      const board = generateBoard(toBoardParams(req))
      const result = solve(board)
      expect(result.solved).toBe(true)
      expect(result.unique).toBe(true)
      expect(rateDifficulty(result.techniquesUsed, result.maxDepth)).toBe('Calm')
    }
  })
})

describe('endless prefs', () => {
  it('defaults to Small / Calm on a cold store', async () => {
    expect(await loadEndlessPrefs(makeFakeStore())).toEqual({ size: 'Small', difficulty: 'Calm' })
  })

  it('round-trips the last size/difficulty', async () => {
    const store = makeFakeStore()
    await saveEndlessPrefs(store, { size: 'Large', difficulty: 'Deep' })
    expect(await loadEndlessPrefs(store)).toEqual({ size: 'Large', difficulty: 'Deep' })
  })
})
