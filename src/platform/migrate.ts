// migrate.ts — forward schema migration. Each namespace has ordered steps keyed
// by the FROM version (`vN → vN+1`); on read a record is migrated up to the
// current version, or refused (newer than this app) / treated as invalid. Pure.
import {
  CURRENT_VERSION,
  DEFAULTS,
  type Migration,
  type Namespace,
  type SchemaFor,
  VALIDATORS,
} from './schemas'

/** Legacy (unversioned / v0) → v1: overlay present fields onto the v1 default. */
function legacyTo1(ns: Namespace): Migration {
  return (old) => ({ ...(DEFAULTS[ns]() as unknown as Record<string, unknown>), ...old, v: 1 })
}

/**
 * Per-namespace ordered migrations, keyed by the source version. v1 is current
 * for every namespace; the only steps are legacy(0)→1, which also demonstrates a
 * real field transform for stats (`solved` → `boardsSolved`).
 */
export const MIGRATIONS: Record<Namespace, Record<number, Migration>> = {
  inProgressBoard: { 0: legacyTo1('inProgressBoard') },
  settings: { 0: legacyTo1('settings') },
  journal: { 0: legacyTo1('journal') },
  stats: {
    0: (old) => ({
      v: 1,
      boardsSolved:
        typeof old.boardsSolved === 'number'
          ? old.boardsSolved
          : typeof old.solved === 'number'
            ? old.solved
            : 0,
      poolsFilled: typeof old.poolsFilled === 'number' ? old.poolsFilled : 0,
      creaturesFound: typeof old.creaturesFound === 'number' ? old.creaturesFound : 0,
    }),
  },
  curatedProgress: { 0: legacyTo1('curatedProgress') },
  onboarding: { 0: legacyTo1('onboarding') },
  shellPrefs: { 0: legacyTo1('shellPrefs') },
}

export type MigrateResult<N extends Namespace> =
  | { status: 'ok'; value: SchemaFor<N> }
  | { status: 'refused' } // record is from a newer app version — preserve, don't overwrite
  | { status: 'invalid' } // wrong shape / no migration path

/** Migrate a raw stored record up to the current version for its namespace. */
export function migrateRecord<N extends Namespace>(ns: N, raw: unknown): MigrateResult<N> {
  if (typeof raw !== 'object' || raw === null) return { status: 'invalid' }
  let rec = raw as Record<string, unknown>
  const current = CURRENT_VERSION[ns]
  let v = typeof rec.v === 'number' ? rec.v : 0
  if (v > current) return { status: 'refused' }
  const steps = MIGRATIONS[ns]
  while (v < current) {
    const step = steps[v]
    if (!step) return { status: 'invalid' }
    rec = step(rec)
    const next = typeof rec.v === 'number' ? rec.v : v + 1
    if (next <= v) return { status: 'invalid' } // guard against a non-advancing step
    v = next
  }
  return VALIDATORS[ns](rec)
    ? { status: 'ok', value: rec as unknown as SchemaFor<N> }
    : { status: 'invalid' }
}

/**
 * Read-path helper: migrate, else fall back to that namespace's default (never
 * throws). `refused` signals a newer-version record the caller must not overwrite.
 */
export function migrateOrDefault<N extends Namespace>(
  ns: N,
  raw: unknown,
): { value: SchemaFor<N>; refused: boolean } {
  const r = migrateRecord(ns, raw)
  if (r.status === 'ok') return { value: r.value, refused: false }
  return { value: DEFAULTS[ns]() as SchemaFor<N>, refused: r.status === 'refused' }
}
