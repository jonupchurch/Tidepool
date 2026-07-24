// memory-backend.ts — an in-memory SaveStore. Used by tests and as the
// private-browsing / disabled-storage fallback. Values are JSON round-tripped on
// write to mirror the serialization boundary of real storage (no aliasing, drops
// undefined) so behaviour matches the web backend.
import { exportAll, importAll } from './blob'
import type { ImportResult, SaveStore } from './save-store'
import type { SaveBlob } from './schemas'

export class MemoryBackend implements SaveStore {
  private map = new Map<string, string>()

  async get<T>(key: string): Promise<T | null> {
    const s = this.map.get(key)
    return s === undefined ? null : (JSON.parse(s) as T)
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.map.set(key, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    this.map.delete(key)
  }

  exportAll(): Promise<SaveBlob> {
    return exportAll(this)
  }

  importAll(blob: unknown): Promise<ImportResult> {
    return importAll(this, blob)
  }
}

export function createMemoryBackend(): SaveStore {
  return new MemoryBackend()
}
