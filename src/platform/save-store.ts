// save-store.ts — the seam contract. `SaveStore` is the raw async key-value +
// whole-save port that every backend (memory, web, later Tauri) implements.
// Namespace-typed accessors layer defaults, shape-validation, and migration on
// top, so consumers read/write typed records and never touch a raw key.
import { migrateOrDefault } from './migrate'
import { DEFAULTS, NAMESPACES, type Namespace, type SaveBlob, type SchemaFor, STORE_VERSION } from './schemas'

export type ImportResult = { ok: true } | { ok: false; reason: string }

/** The single interface consumers depend on; backends implement it. */
export interface SaveStore {
  get<T>(key: string): Promise<T | null>
  /** Debounced for autosave; last-write-wins per key. */
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  exportAll(): Promise<SaveBlob>
  importAll(blob: unknown): Promise<ImportResult>
}

/** Namespaced, versioned key: `tp:v{STORE_VERSION}:{namespace}`. */
export function keyFor(ns: Namespace): string {
  return `tp:v${STORE_VERSION}:${ns}`
}

/** Recover the namespace from a key (or null if it isn't one of ours). */
export function namespaceOfKey(key: string): Namespace | null {
  const ns = key.slice(key.lastIndexOf(':') + 1)
  return (NAMESPACES as readonly string[]).includes(ns) ? (ns as Namespace) : null
}

// ── Typed per-namespace accessors (defaults + validation + migration) ─────────

/** Load a namespace's record: migrated to current, or its default if absent /
 *  corrupt / from a newer version (the stored value is never mutated on read). */
export async function loadRecord<N extends Namespace>(
  store: SaveStore,
  ns: N,
): Promise<SchemaFor<N>> {
  const raw = await store.get<unknown>(keyFor(ns))
  if (raw == null) return DEFAULTS[ns]() as SchemaFor<N>
  return migrateOrDefault(ns, raw).value
}

export async function saveRecord<N extends Namespace>(
  store: SaveStore,
  ns: N,
  value: SchemaFor<N>,
): Promise<void> {
  await store.set(keyFor(ns), value)
}

export async function removeRecord(store: SaveStore, ns: Namespace): Promise<void> {
  await store.remove(keyFor(ns))
}
