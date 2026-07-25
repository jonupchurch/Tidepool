import { describe, expect, it } from 'vitest'
import { resolveLocks } from './curated'
import { sampleManifest } from './test-helpers'

const entries = sampleManifest.entries // cove-1, reef-2, kelp-3 (order 1..3)
const locksOf = (solved: string[], config: Parameters<typeof resolveLocks>[2]) =>
  resolveLocks(entries, new Set(solved), config)

describe('resolveLocks (US4 gentle gating)', () => {
  it('opens everything when gating is disabled', () => {
    const locks = locksOf([], { enabled: false })
    expect([...locks.values()].every((v) => v === false)).toBe(true)
  })

  it('locks entries beyond the lookahead when nothing is solved', () => {
    const locks = locksOf([], { enabled: true, unlockAfter: 1 })
    expect(locks.get('cove-1')).toBe(false)
    expect(locks.get('reef-2')).toBe(false)
    expect(locks.get('kelp-3')).toBe(true)
  })

  it('unlocks the next entry once its prerequisite is solved', () => {
    const locks = locksOf(['cove-1'], { enabled: true, unlockAfter: 1 })
    expect(locks.get('kelp-3')).toBe(false)
  })

  it('a stricter lookahead (0) gates the very next entry', () => {
    const locks = locksOf([], { enabled: true, unlockAfter: 0 })
    expect(locks.get('cove-1')).toBe(false)
    expect(locks.get('reef-2')).toBe(true)
  })
})
