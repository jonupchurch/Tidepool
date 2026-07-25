// test-helpers.ts — board-source test utilities: an in-memory fake SaveStore
// (pre-seedable per namespace) and a sample curated manifest fixture for the
// merge/gating logic tests (independent of the real shipped manifest).
import { type Namespace, type SaveStore, keyFor } from '@/platform'
import type { CuratedManifest } from './curated'

/** A minimal in-memory SaveStore; `seed` pre-populates namespace records. */
export function makeFakeStore(seed: Partial<Record<Namespace, unknown>> = {}): SaveStore {
  const map = new Map<string, unknown>()
  for (const [ns, value] of Object.entries(seed)) map.set(keyFor(ns as Namespace), value)
  return {
    async get<T>(key: string): Promise<T | null> {
      return map.has(key) ? (map.get(key) as T) : null
    },
    async set<T>(key: string, value: T): Promise<void> {
      map.set(key, value)
    },
    async remove(key: string): Promise<void> {
      map.delete(key)
    },
    async exportAll() {
      return { appVersion: '0.0.0', schemaVersion: 1, records: {} }
    },
    async importAll() {
      return { ok: true as const }
    },
  }
}

/** A small curated manifest for logic tests (not the shipped pack). */
export const sampleManifest: CuratedManifest = {
  version: 1,
  entries: [
    { id: 'cove-1', name: 'First Cove', seed: 'COVE-0001', size: 'Small', difficulty: 'Calm', order: 1 },
    { id: 'reef-2', name: 'Quiet Reef', seed: 'REEF-0002', size: 'Small', difficulty: 'Tricky', order: 2 },
    { id: 'kelp-3', name: 'Kelp Forest', seed: 'KELP-0003', size: 'Medium', difficulty: 'Tricky', order: 3 },
  ],
}

/** The same, in grouped (v2) shape: two groups of two, plus ordering noise. */
export const groupedManifest: CuratedManifest = {
  version: 2,
  groups: [
    { id: 'shallows', name: 'Shallows', blurb: 'Warm water.', order: 1 },
    { id: 'deeps', name: 'Deeps', blurb: 'Cold water.', order: 2 },
  ],
  entries: [
    { id: 'b-2', name: 'Two', seed: 'COVE-0002', size: 'Medium', difficulty: 'Calm', group: 'shallows', order: 2 },
    { id: 'd-4', name: 'Four', seed: 'TRENCH-0002', size: 'Large', difficulty: 'Deep', group: 'deeps', order: 4 },
    { id: 'a-1', name: 'One', seed: 'COVE-0001', size: 'Medium', difficulty: 'Calm', group: 'shallows', order: 1 },
    { id: 'c-3', name: 'Three', seed: 'TRENCH-0001', size: 'Large', difficulty: 'Deep', group: 'deeps', order: 3 },
  ],
}
