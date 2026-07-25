import { describe, expect, it } from 'vitest'
import type { CuratedProgressRecord } from '@/platform'
import {
  getCuratedRows,
  loadCuratedPack,
  manifestRows,
  markCuratedSolved,
} from './curated'
import { makeFakeStore, sampleManifest } from './test-helpers'

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
    expect(saved?.solved['first-cove']).toEqual({ earnedCreatureId: 'limpet' })

    const rows = await getCuratedRows(store)
    const firstCove = rows.find((r) => r.entry.id === 'first-cove')
    expect(firstCove?.solved).toBe(true)
    expect(firstCove?.earnedCreature).toBe('Limpet')
  })
})
