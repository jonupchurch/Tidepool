// blob.ts — whole-save export/import. Export gathers every stored namespace
// (migrated to current) into a versioned SaveBlob; import validates the envelope
// and every record BEFORE writing anything, so a malformed/incompatible blob is
// rejected with current data left intact. Pure over a raw key-value store.
import { migrateRecord } from './migrate'
import { type ImportResult, type SaveStore, keyFor } from './save-store'
import { APP_VERSION, BLOB_SCHEMA_VERSION, NAMESPACES, type Namespace, type SaveBlob } from './schemas'

type RawKV = Pick<SaveStore, 'get' | 'set' | 'remove'>

export async function exportAll(store: RawKV): Promise<SaveBlob> {
  const records: SaveBlob['records'] = {}
  for (const ns of NAMESPACES) {
    const raw = await store.get<unknown>(keyFor(ns))
    if (raw == null) continue
    const r = migrateRecord(ns, raw)
    if (r.status === 'ok') {
      // biome-ignore lint: index write over a validated namespace is sound
      ;(records as Record<string, unknown>)[ns] = r.value
    }
  }
  return { appVersion: APP_VERSION, schemaVersion: BLOB_SCHEMA_VERSION, records }
}

export async function importAll(store: RawKV, blob: unknown): Promise<ImportResult> {
  if (typeof blob !== 'object' || blob === null) return { ok: false, reason: 'malformed save blob' }
  const b = blob as Record<string, unknown>
  if (typeof b.schemaVersion !== 'number') return { ok: false, reason: 'missing schema version' }
  if (b.schemaVersion > BLOB_SCHEMA_VERSION) return { ok: false, reason: 'save is from a newer version' }
  if (typeof b.records !== 'object' || b.records === null) return { ok: false, reason: 'malformed records' }
  const records = b.records as Record<string, unknown>

  // Validate + migrate every present namespace FIRST — no partial writes.
  const normalized: Array<{ ns: Namespace; value: unknown }> = []
  for (const ns of NAMESPACES) {
    if (!(ns in records)) continue
    const r = migrateRecord(ns, records[ns])
    if (r.status === 'refused') return { ok: false, reason: `${ns} is from a newer version` }
    if (r.status === 'invalid') return { ok: false, reason: `invalid ${ns} record` }
    normalized.push({ ns, value: r.value })
  }
  for (const { ns, value } of normalized) await store.set(keyFor(ns), value)
  return { ok: true }
}
