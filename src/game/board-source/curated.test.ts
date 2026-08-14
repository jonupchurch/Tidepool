import { describe, expect, it } from 'vitest'
import type { CuratedProgressRecord } from '@/platform'
import {
  getCuratedRows,
  pagesOf,
  groupRows,
  loadCuratedPack,
  manifestRows,
  markCuratedSolved,
  nextCuratedEntry,
} from './curated'
import { DEFAULT_CLUES, isBoardRequest, toBoardParams } from './request'
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

  it('ships pages of 6 groups of 6, each group one size/difficulty band', () => {
    const grouped = groupRows(pack, manifestRows(pack, {}))
    const pages = pagesOf(grouped)
    expect(pages.length).toBeGreaterThanOrEqual(2)
    for (const { page, groups } of pages) {
      expect(groups, `page ${page}`).toHaveLength(6)
      for (const g of groups) {
        expect(g.rows, `${g.group.id}`).toHaveLength(6)
        const bands = new Set(g.rows.map((r) => `${r.entry.size}/${r.entry.difficulty}`))
        expect(bands.size, `${g.group.id} mixes bands`).toBe(1)
      }
    }
  })

  it('page one is exactly the coastline it always was', () => {
    // 013 FR-007. Page one carries no `page` field at all, so a v2 pack and a
    // v3 pack describe the same first page — and none of its entries may have
    // grown a clue set or a silhouette.
    const first = pagesOf(groupRows(pack, manifestRows(pack, {})))[0]
    expect(first.page).toBe(1)
    const rows = first.groups.flatMap((g) => g.rows)
    expect(rows).toHaveLength(36)
    for (const r of rows) {
      expect(r.entry.clues, `${r.entry.id} gained a clue set`).toBeUndefined()
      expect(r.entry.shape, `${r.entry.id} gained a shape`).toBeUndefined()
    }
  })

  const RANK = { Calm: 0, Tricky: 1, Deep: 2 }
  const SIZE_RANK = { Small: 0, Medium: 1, Large: 2 }
  const bandRank = (e: { difficulty: keyof typeof RANK; size: keyof typeof SIZE_RANK }) =>
    RANK[e.difficulty] + SIZE_RANK[e.size]

  it('never gets easier as you go WITHIN a page, and every board is distinct', () => {
    // Within a page the climb is monotonic. Across the boundary it deliberately
    // is not: page two opens easier than page one closes, because it is also
    // teaching new mechanics, and meeting `{n}` for the first time on a
    // Large/Deep board would be a wall rather than a step.
    const pages = pagesOf(groupRows(pack, manifestRows(pack, {})))
    for (const { page, groups } of pages) {
      const entries = groups.flatMap((g) => g.rows).map((r) => r.entry)
      for (let i = 1; i < entries.length; i++) {
        expect(
          bandRank(entries[i]) - bandRank(entries[i - 1]),
          `page ${page}: ${entries[i - 1].id} → ${entries[i].id} steps backwards`,
        ).toBeGreaterThanOrEqual(0)
      }
    }
    expect(new Set(pack.entries.map((e) => e.seed)).size).toBe(pack.entries.length)
    expect(new Set(pack.entries.map((e) => e.id)).size).toBe(pack.entries.length)
  })

  it('page two is weighted deeper than page one (FR-010)', () => {
    const pages = pagesOf(groupRows(pack, manifestRows(pack, {})))
    const mean = (i: number) => {
      const entries = pages[i].groups.flatMap((g) => g.rows).map((r) => r.entry)
      return entries.reduce((n, e) => n + bandRank(e), 0) / entries.length
    }
    expect(mean(1)).toBeGreaterThan(mean(0))
  })

  it('order is globally monotonic across pages, not restarted per page', () => {
    // Both the next-board chain and the gating sort this flat list, so they
    // cross the page boundary for free — and both break, only past page one, if
    // a later editor numbers each page from 1.
    const orders = [...pack.entries].map((e) => e.order)
    expect(new Set(orders).size).toBe(orders.length)
    expect([...orders].sort((a, b) => a - b)).toEqual(orders)
  })

  it('carries both new mechanics on page two, across several groups (SC-004)', () => {
    const second = pagesOf(groupRows(pack, manifestRows(pack, {})))[1]
    const entries = second.groups.flatMap((g) => g.rows).map((r) => r.entry)
    const shaped = new Set(entries.filter((e) => e.shape).map((e) => e.group))
    const annotated = new Set(entries.filter((e) => e.clues?.lineConnectivity).map((e) => e.group))
    expect(shaped.size).toBeGreaterThan(1)
    expect(annotated.size).toBeGreaterThan(1)
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

  // Changed by 011. This used to read a pre-tracking record as `0`, which was
  // harmless while zero only meant "don't draw the coral ring". Now zero also
  // earns a clean-solve mark, so reporting it for a board that was never
  // checked would award something the game has no evidence for (FR-008) — and
  // would disagree with the lifetime perfect count, which reads the raw record
  // and excludes them. Both "never solved" and "solved, unknown" are no record.
  it('reads an unknown mistake count as null, whether unsolved or pre-tracking', () => {
    const rows = manifestRows(sampleManifest, { 'cove-1': { earnedCreatureId: 'crab' } })
    expect(rows.find((r) => r.entry.id === 'cove-1')?.errors).toBeNull() // solved, not tracked
    expect(rows.find((r) => r.entry.id === 'reef-2')?.errors).toBeNull() // never solved
  })

  it('still reads an explicitly clean run as zero', () => {
    const rows = manifestRows(sampleManifest, {
      'cove-1': { earnedCreatureId: 'crab', errors: 0 },
    })
    expect(rows.find((r) => r.entry.id === 'cove-1')?.errors).toBe(0)
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

// 013 FR-011/FR-012. Both of these sort the flat entry list, so they cross a
// page boundary for free — and both would look perfectly correct on page one
// while being broken past it. That is exactly why they get their own tests.
describe('the page boundary', () => {
  const pack = loadCuratedPack()
  const sorted = [...pack.entries].sort((a, b) => a.order - b.order)
  const firstPageIds = new Set(
    pagesOf(groupRows(pack, manifestRows(pack, {})))[0]
      .groups.flatMap((g) => g.rows)
      .map((r) => r.entry.id),
  )
  const lastOfPageOne = [...sorted].reverse().find((e) => firstPageIds.has(e.id))!
  const firstOfPageTwo = sorted.find((e) => !firstPageIds.has(e.id))!

  it('the next-board chain walks from the end of one page into the start of the next', () => {
    expect(nextCuratedEntry(pack, lastOfPageOne.id)?.id).toBe(firstOfPageTwo.id)
  })

  it('and stops cleanly at the end of the last page', () => {
    expect(nextCuratedEntry(pack, sorted[sorted.length - 1].id)).toBeNull()
  })

  it('gating treats every page as one ordered coastline', () => {
    // With nothing solved and gating on, the frontier sits at the very start —
    // so page two must be locked, not open because it is "a different page".
    const rows = manifestRows(pack, {}, { enabled: true, unlockAfter: 1 })
    const byId = new Map(rows.map((r) => [r.entry.id, r]))
    expect(byId.get(sorted[0].id)?.locked).toBe(false)
    expect(byId.get(firstOfPageTwo.id)?.locked).toBe(true)
  })

  it('solving all of page one opens the start of page two', () => {
    const solved = Object.fromEntries(
      [...firstPageIds].map((id) => [id, { earnedCreatureId: 'crab', errors: 0 }]),
    )
    const rows = manifestRows(pack, solved, { enabled: true, unlockAfter: 1 })
    expect(rows.find((r) => r.entry.id === firstOfPageTwo.id)?.locked).toBe(false)
  })
})

describe('per-entry clues and shape reach the engine', () => {
  const pack = loadCuratedPack()

  it('a shaped or annotated entry carries that into its BoardRequest', () => {
    const rows = manifestRows(pack, {})
    const shaped = rows.find((r) => r.entry.shape)
    const annotated = rows.find((r) => r.entry.clues?.lineConnectivity)
    expect(shaped?.request.shape).toBe(shaped?.entry.shape)
    expect(annotated?.request.clues?.lineConnectivity).toBe(true)
  })

  it('a plain entry asks for nothing extra, so page one is untouched', () => {
    const plain = manifestRows(pack, {}).find((r) => !r.entry.shape && !r.entry.clues)!
    expect(plain.request.shape).toBeUndefined()
    expect(plain.request.clues).toBeUndefined()
    // ...and that request maps to exactly the defaults it always did.
    expect(toBoardParams(plain.request).clues).toEqual(DEFAULT_CLUES)
    expect(toBoardParams(plain.request).shape).toBeUndefined()
  })

  it('every shipped request is one the launcher will accept', () => {
    for (const row of manifestRows(pack, {})) {
      expect(isBoardRequest(row.request), row.entry.id).toBe(true)
    }
  })
})
