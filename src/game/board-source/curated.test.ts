import { describe, expect, it } from 'vitest'
import type { CuratedProgressRecord } from '@/platform'
import {
  getCuratedRows,
  groupRows,
  loadCuratedPack,
  manifestRows,
  markCuratedSolved,
  nextCuratedEntry,
} from './curated'
import { groupedManifest, makeFakeStore, sampleManifest } from './test-helpers'

describe('loadCuratedPack', () => {
  it('loads the shipped manifest, ordered', () => {
    const pack = loadCuratedPack()
    expect(pack.entries.length).toBeGreaterThan(0)
    const orders = pack.entries.map((e) => e.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    for (const e of pack.entries) {
      expect(e).toMatchObject({ id: expect.any(String), name: expect.any(String), seed: expect.any(String) })
    }
  })
})

describe('the shipped pack is a complete ladder', () => {
  const pack = loadCuratedPack()

  it('ships 6 groups of 6, each group one size/difficulty band', () => {
    expect(pack.groups).toHaveLength(6)
    const grouped = groupRows(pack, manifestRows(pack, {}))
    expect(grouped).toHaveLength(6)
    for (const g of grouped) {
      expect(g.rows, `${g.group.id}`).toHaveLength(6)
      const bands = new Set(g.rows.map((r) => `${r.entry.size}/${r.entry.difficulty}`))
      expect(bands.size, `${g.group.id} mixes bands`).toBe(1)
    }
  })

  it('never gets easier as you go, and every board has a distinct seed', () => {
    const rank = { Calm: 0, Tricky: 1, Deep: 2 }
    const sizeRank = { Small: 0, Medium: 1, Large: 2 }
    const entries = pack.entries
    expect(entries).toHaveLength(36)
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1]
      const cur = entries[i]
      const step = rank[cur.difficulty] + sizeRank[cur.size] - (rank[prev.difficulty] + sizeRank[prev.size])
      expect(step, `${prev.id} → ${cur.id} steps backwards`).toBeGreaterThanOrEqual(0)
    }
    expect(new Set(entries.map((e) => e.seed)).size).toBe(entries.length)
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length)
  })
})

describe('nextCuratedEntry (the "Next board" chain)', () => {
  it('walks the ladder in order', () => {
    expect(nextCuratedEntry(sampleManifest, 'cove-1')?.id).toBe('reef-2')
    expect(nextCuratedEntry(sampleManifest, 'reef-2')?.id).toBe('kelp-3')
  })

  it('returns null at the end, and for an unknown id', () => {
    expect(nextCuratedEntry(sampleManifest, 'kelp-3')).toBeNull()
    expect(nextCuratedEntry(sampleManifest, 'nope')).toBeNull()
  })

  it('crosses a group boundary rather than stopping at it', () => {
    expect(nextCuratedEntry(groupedManifest, 'b-2')?.id).toBe('c-3')
  })

  it('chains the whole shipped pack end to end, hitting all 36 exactly once', () => {
    const pack = loadCuratedPack()
    const seen = [pack.entries[0].id]
    for (let i = 0; i < 100; i++) {
      const next = nextCuratedEntry(pack, seen[seen.length - 1])
      if (!next) break
      seen.push(next.id)
    }
    expect(seen).toEqual(pack.entries.map((e) => e.id))
  })
})

describe('groupRows', () => {
  it('buckets rows into groups, both in manifest order', () => {
    const grouped = groupRows(groupedManifest, manifestRows(groupedManifest, {}))
    expect(grouped.map((g) => g.group.id)).toEqual(['shallows', 'deeps'])
    expect(grouped[0].rows.map((r) => r.entry.id)).toEqual(['a-1', 'b-2'])
    expect(grouped[1].rows.map((r) => r.entry.id)).toEqual(['c-3', 'd-4'])
  })

  it('falls back to a single run for an ungrouped (v1) manifest', () => {
    const grouped = groupRows(sampleManifest, manifestRows(sampleManifest, {}))
    expect(grouped).toHaveLength(1)
    expect(grouped[0].rows).toHaveLength(3)
  })

  it('keeps rows whose group is missing from the manifest', () => {
    const odd = {
      ...groupedManifest,
      entries: [...groupedManifest.entries, {
        id: 'x-9', name: 'Nine', seed: 'COVE-0009', size: 'Medium' as const,
        difficulty: 'Calm' as const, group: 'ghost', order: 9,
      }],
    }
    const grouped = groupRows(odd, manifestRows(odd, {}))
    expect(grouped.flatMap((g) => g.rows).map((r) => r.entry.id)).toContain('x-9')
  })
})

describe('curated mistake record (best run wins)', () => {
  it('stores the run\'s mistakes against the entry', async () => {
    const store = makeFakeStore()
    await markCuratedSolved(store, 'first-cove', 'limpet', 3)
    const rows = await getCuratedRows(store)
    expect(rows.find((r) => r.entry.id === 'first-cove')?.errors).toBe(3)
  })

  it('a clean replay clears the mistakes for good', async () => {
    const store = makeFakeStore()
    await markCuratedSolved(store, 'first-cove', 'limpet', 4)
    await markCuratedSolved(store, 'first-cove', 'limpet', 0) // replayed clean
    const rows = await getCuratedRows(store)
    expect(rows.find((r) => r.entry.id === 'first-cove')?.errors).toBe(0)
  })

  it('a sloppier replay never adds mistakes back', async () => {
    const store = makeFakeStore()
    await markCuratedSolved(store, 'first-cove', 'limpet', 1)
    await markCuratedSolved(store, 'first-cove', 'limpet', 9)
    const rows = await getCuratedRows(store)
    expect(rows.find((r) => r.entry.id === 'first-cove')?.errors).toBe(1)
  })

  it('reads pre-tracking records as clean, and unsolved as null', () => {
    const rows = manifestRows(sampleManifest, { 'cove-1': { earnedCreatureId: 'crab' } })
    expect(rows.find((r) => r.entry.id === 'cove-1')?.errors).toBe(0)
    expect(rows.find((r) => r.entry.id === 'reef-2')?.errors).toBeNull()
  })
})

describe('manifestRows merge', () => {
  it('exposes ordered entries with name/difficulty/seed → BoardRequest', () => {
    const rows = manifestRows(sampleManifest, {})
    expect(rows.map((r) => r.entry.id)).toEqual(['cove-1', 'reef-2', 'kelp-3'])
    expect(rows[0].request).toEqual({ seed: 'COVE-0001', size: 'Small', difficulty: 'Calm' })
    expect(rows.every((r) => !r.solved)).toBe(true)
  })

  it('marks solved entries and derives the earned creature', () => {
    const rows = manifestRows(sampleManifest, { 'reef-2': { earnedCreatureId: 'crab' } })
    const reef = rows.find((r) => r.entry.id === 'reef-2')!
    expect(reef.solved).toBe(true)
    expect(reef.earnedCreature).toBe('Shore Crab')
    expect(rows.find((r) => r.entry.id === 'cove-1')!.solved).toBe(false)
  })

  it('is open by default (nothing locked)', () => {
    const rows = manifestRows(sampleManifest, {})
    expect(rows.every((r) => !r.locked)).toBe(true)
  })
})

describe('curated progress through the store', () => {
  it('records completion + earned creature and reflects it in the rows', async () => {
    const store = makeFakeStore()
    await markCuratedSolved(store, 'first-cove', 'limpet')
    const saved = await store.get<CuratedProgressRecord>('tp:v1:curatedProgress')
    expect(saved?.solved['first-cove']).toEqual({ earnedCreatureId: 'limpet', errors: 0 })

    const rows = await getCuratedRows(store)
    const firstCove = rows.find((r) => r.entry.id === 'first-cove')
    expect(firstCove?.solved).toBe(true)
    expect(firstCove?.earnedCreature).toBe('Limpet')
  })
})
