// journal-fixtures.ts — shared test doubles for the journal (T002). Not part of
// the shipped surface (imported only by *.test.*). A Map-backed SaveStore double
// keeps the model/adapter tests free of the real web/IndexedDB backends.
import type { SaveBlob, SaveStore } from '@/platform'
import type { DiscoveryMap } from './journal'

/** An in-memory SaveStore backed by a plain Map (seedable with raw records). */
export function memoryStore(seed: Record<string, unknown> = {}): SaveStore {
  const map = new Map<string, unknown>(Object.entries(seed))
  return {
    get: async <T>(k: string): Promise<T | null> => (map.has(k) ? (map.get(k) as T) : null),
    set: async <T>(k: string, v: T): Promise<void> => {
      map.set(k, v)
    },
    remove: async (k: string): Promise<void> => {
      map.delete(k)
    },
    exportAll: async (): Promise<SaveBlob> => ({ appVersion: '0.0.0', schemaVersion: 1, records: {} }),
    importAll: async () => ({ ok: true as const }),
  }
}

/** A sample discoveries map: one common + one rarer creature already found. */
export const sampleDiscoveries: DiscoveryMap = {
  limpet: { firstFoundSeed: 'COVE-0001', count: 4 },
  crab: { firstFoundSeed: 'TIDE-0007', count: 1 },
}
