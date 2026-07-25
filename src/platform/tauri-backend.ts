// tauri-backend.ts — the desktop SaveStore. Same `SaveStore` interface as the
// web backend, so no consumer changes (009 FR-003).
//
// Why one file instead of a file per key: Steam Auto-Cloud syncs *file patterns*,
// and a player's save has to move between machines as one consistent unit. Split
// across files, a partial sync could land a journal that disagrees with its stats
// — a corruption a player would notice and couldn't fix. One document is one
// atomic unit, on disk and in the cloud. The whole save is a few KB, so
// rewriting it on every change costs nothing worth optimising.
//
// The transport is injected so the logic here is testable without a Tauri
// runtime; the default one talks to the Rust commands in src-tauri/src/save.rs.
import { exportAll, importAll } from './blob'
import type { ImportResult, SaveStore } from './save-store'
import type { SaveBlob } from './schemas'

/** The whole save, as persisted: raw store keys → their values. */
type SaveDocument = Record<string, unknown>

/** Reads/writes the save document. Swapped for a fake in tests. */
export interface SaveFileTransport {
  /** The stored document text, or null when nothing has been saved yet. */
  load(): Promise<string | null>
  store(text: string): Promise<void>
}

export interface TauriBackendOptions {
  transport?: SaveFileTransport
  /** Surfaced on graceful-degradation events (e.g. the disk is unwritable). */
  onNotice?: (message: string) => void
}

/** Talks to the Rust side. Imported lazily so the web build never pulls it in. */
function invokeTransport(): SaveFileTransport {
  const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    const { invoke: call } = await import('@tauri-apps/api/core')
    return call<T>(cmd, args)
  }
  return {
    load: () => invoke<string | null>('save_load'),
    store: (contents) => invoke<void>('save_store', { contents }),
  }
}

export class TauriBackend implements SaveStore {
  private cache: SaveDocument = {}
  private hydrated: Promise<void> | null = null
  private pending: Promise<void> | null = null
  private transport: SaveFileTransport
  private onNotice?: (message: string) => void

  constructor(opts: TauriBackendOptions = {}) {
    this.transport = opts.transport ?? invokeTransport()
    this.onNotice = opts.onNotice
  }

  /** Read the document from disk once; every later read is served from cache. */
  private hydrate(): Promise<void> {
    if (!this.hydrated) {
      this.hydrated = (async () => {
        let text: string | null = null
        try {
          text = await this.transport.load()
        } catch {
          // Unreadable save: start empty rather than refusing to launch. A
          // player with a damaged file gets a fresh shore, not a dead game.
          this.onNotice?.('Your saved progress could not be read — starting fresh.')
          return
        }
        if (text === null) return
        try {
          const parsed: unknown = JSON.parse(text)
          // A non-object (or null) is not a save document; treat as absent.
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            this.cache = parsed as SaveDocument
          }
        } catch {
          this.onNotice?.('Your saved progress could not be read — starting fresh.')
        }
      })()
    }
    return this.hydrated
  }

  async get<T>(key: string): Promise<T | null> {
    await this.hydrate()
    const value = this.cache[key]
    return value === undefined ? null : (value as T)
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.hydrate()
    this.cache[key] = value
    return this.schedule()
  }

  async remove(key: string): Promise<void> {
    await this.hydrate()
    delete this.cache[key]
    return this.schedule()
  }

  exportAll(): Promise<SaveBlob> {
    return exportAll(this)
  }

  importAll(blob: unknown): Promise<ImportResult> {
    return importAll(this, blob)
  }

  /**
   * Coalesce a burst of writes into a single file write. Unlike the web backend
   * this is per-*document* rather than per-key: marking a cell touches the board
   * and the stats, and those should be one write, not two.
   */
  private schedule(): Promise<void> {
    if (!this.pending) {
      this.pending = Promise.resolve().then(() => this.flush())
    }
    return this.pending
  }

  private async flush(): Promise<void> {
    this.pending = null
    // Snapshot before awaiting: a write landing mid-flush must not be lost, and
    // it schedules its own flush anyway.
    const text = JSON.stringify(this.cache)
    try {
      await this.transport.store(text)
    } catch {
      // Disk full, permissions, antivirus lock: keep playing with the in-memory
      // value and say so, rather than throwing into the game loop.
      this.onNotice?.('Progress could not be written to disk — recent changes may be lost.')
    }
  }
}

export function createTauriBackend(opts?: TauriBackendOptions): SaveStore {
  return new TauriBackend(opts)
}
