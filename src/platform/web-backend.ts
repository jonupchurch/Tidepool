// web-backend.ts — the browser SaveStore. Small records live in localStorage;
// the in-progress board (a blob namespace) lives in IndexedDB via idb-keyval.
// Writes are coalesced per key on a microtask (autosave debounce, last-write-
// wins) and served from an in-memory cache for instant, consistent reads. Quota
// failures degrade gracefully (gentle notice, in-memory value kept, no throw).
import { type UseStore, del as idbDel, get as idbGet, set as idbSet, createStore } from 'idb-keyval'
import { exportAll, importAll } from './blob'
import { type ImportResult, type SaveStore, namespaceOfKey } from './save-store'
import { BLOB_NAMESPACES, type SaveBlob } from './schemas'

export interface WebBackendOptions {
  /** Surfaced on graceful-degradation events (e.g. storage full). */
  onNotice?: (message: string) => void
}

export class WebBackend implements SaveStore {
  private cache = new Map<string, unknown>()
  private pending = new Map<string, Promise<void>>()
  private idb: UseStore
  private onNotice?: (message: string) => void

  constructor(opts: WebBackendOptions = {}) {
    this.idb = createStore('tidepools', 'saves')
    this.onNotice = opts.onNotice
  }

  private isBlobKey(key: string): boolean {
    const ns = namespaceOfKey(key)
    return ns !== null && BLOB_NAMESPACES.has(ns)
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.cache.has(key)) return this.cache.get(key) as T
    const value = await this.readBacking(key)
    if (value !== null) this.cache.set(key, value)
    return value as T | null
  }

  set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value)
    let p = this.pending.get(key)
    if (!p) {
      // Coalesce a synchronous burst of writes to this key into one flush that
      // persists the latest cached value (last-write-wins).
      p = Promise.resolve().then(() => this.flush(key))
      this.pending.set(key, p)
    }
    return p
  }

  async remove(key: string): Promise<void> {
    this.cache.delete(key)
    await this.removeBacking(key)
  }

  exportAll(): Promise<SaveBlob> {
    return exportAll(this)
  }

  importAll(blob: unknown): Promise<ImportResult> {
    return importAll(this, blob)
  }

  private async flush(key: string): Promise<void> {
    this.pending.delete(key)
    if (this.cache.has(key)) await this.writeBacking(key, this.cache.get(key))
    else await this.removeBacking(key)
  }

  private async writeBacking(key: string, value: unknown): Promise<void> {
    if (this.isBlobKey(key)) {
      await idbSet(key, value, this.idb)
      return
    }
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Quota / disabled storage: keep the in-memory value, notify, never throw.
      this.onNotice?.('Storage is full — recent changes may not be saved to disk.')
    }
  }

  private async readBacking(key: string): Promise<unknown | null> {
    if (this.isBlobKey(key)) {
      const v = await idbGet(key, this.idb)
      return v === undefined ? null : v
    }
    const s = localStorage.getItem(key)
    if (s === null) return null
    try {
      return JSON.parse(s)
    } catch {
      // Corrupt record: treat as absent so only this key resets (isolation).
      return null
    }
  }

  private async removeBacking(key: string): Promise<void> {
    if (this.isBlobKey(key)) await idbDel(key, this.idb)
    else localStorage.removeItem(key)
  }
}

export function createWebBackend(opts?: WebBackendOptions): SaveStore {
  return new WebBackend(opts)
}
