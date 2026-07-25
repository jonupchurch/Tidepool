// schemas.ts — the versioned, namespaced persisted record shapes, their current
// versions, default factories, and shape validators. Each namespace is owned by
// a feature (noted below); 008 defines the initial v1 shapes + the plumbing.
// `SaveBlob` / `Migration` types live here too. No storage/OS access.
import type { BoardParams } from '@/core'

/** App version stamped into export blobs. Informational only — compatibility is
 *  decided by BLOB_SCHEMA_VERSION below, so this is here to tell a human which
 *  build wrote a save. Kept in step with the other version sites by a test in
 *  `ui/about/about.test.ts`. */
export const APP_VERSION = '1.0.1'

/** Storage-layout version used in the key prefix `tp:v{N}:{namespace}`. */
export const STORE_VERSION = 1

/** Current export-blob envelope version. */
export const BLOB_SCHEMA_VERSION = 1

// ── Namespaced record shapes (each carries its own schema version `v`) ────────

/** The resumable session — only player state is stored; the board is regenerated
 *  from `request` via the engine (keeps saves tiny + robust to engine drift). */
export interface InProgressBoardRecord {
  v: number
  request: BoardParams
  marks: Record<string, 'water' | 'rock'>
  revealed: string[]
}

/**
 * Owned/extended by feature 006 (Settings & themes). Every group's fields are
 * optional past the original set so a record written by an earlier build still
 * loads and validates; `loadRecord` fills the gaps from DEFAULTS.
 */
export interface SettingsRecord {
  v: number
  sound: { muted: boolean; volume: number; sfx?: number; ambient?: number }
  visuals: {
    /** 'Day' | 'Night' | 'Auto' — Auto follows the OS preference. */
    theme: string
    reducedMotion: boolean
    textScale: number
    colorblind: boolean
    highContrast?: boolean
    /** Board scale multiplier, 1 = default. */
    cellScale?: number
  }
  controls: { swapMarkButtons: boolean; tapToCycle?: boolean; confirmBeforeClear?: boolean }
  /** Comfort aids — framed as comfort, never "easy mode" (FR-005). */
  comfort?: { hoverHighlight?: boolean; mistakeNudge?: boolean; lineHelper?: boolean }
  play: { defaultSize: string; defaultDifficulty: string; stopwatch?: boolean }
}

/** Owned by feature 005 (Shore journal). */
export interface JournalRecord {
  v: number
  discoveries: Record<string, { firstFoundSeed: string; count: number }>
}

export interface StatsRecord {
  v: number
  boardsSolved: number
  poolsFilled: number
  creaturesFound: number
}

/** Owned by feature 004 (Board modes / curated). */
export interface CuratedProgressRecord {
  v: number
  /** Per solved entry: the creature it earned, and the best (fewest) mistakes
   *  of any run. Absent `errors` = solved before mistakes were tracked. */
  solved: Record<string, { earnedCreatureId: string; errors?: number }>
}

/** Owned by feature 007 (Tutorial). */
export interface OnboardingRecord {
  v: number
  completed: boolean
  seen: boolean
  /** The board's how-to-play rail has been dismissed. Optional so records
   *  written before it existed still load (and still validate). */
  helpDismissed?: boolean
}

/** Owned by feature 003 (App shell). */
export interface ShellPrefsRecord {
  v: number
  theme: string
  muted: boolean
}

/** The full namespace → record-shape map. */
export interface SchemaMap {
  inProgressBoard: InProgressBoardRecord
  settings: SettingsRecord
  journal: JournalRecord
  stats: StatsRecord
  curatedProgress: CuratedProgressRecord
  onboarding: OnboardingRecord
  shellPrefs: ShellPrefsRecord
}

export type Namespace = keyof SchemaMap
export type SchemaFor<N extends Namespace> = SchemaMap[N]

export const NAMESPACES: readonly Namespace[] = [
  'inProgressBoard',
  'settings',
  'journal',
  'stats',
  'curatedProgress',
  'onboarding',
  'shellPrefs',
]

/** Namespaces stored as larger blobs (IndexedDB) rather than small KV (localStorage). */
export const BLOB_NAMESPACES: ReadonlySet<Namespace> = new Set<Namespace>(['inProgressBoard'])

/** Current schema version per namespace (drives read-path migration). */
export const CURRENT_VERSION: Record<Namespace, number> = {
  inProgressBoard: 1,
  settings: 1,
  journal: 1,
  stats: 1,
  curatedProgress: 1,
  onboarding: 1,
  shellPrefs: 1,
}

// ── Default factories (fresh object each call — never share mutable state) ────

export const DEFAULTS: { [N in Namespace]: () => SchemaMap[N] } = {
  inProgressBoard: () => ({
    v: 1,
    request: {
      seed: '',
      size: 'Small',
      difficulty: 'Calm',
      clues: { connectivity: true, lineTotals: true },
    },
    marks: {},
    revealed: [],
  }),
  settings: () => ({
    v: 1,
    sound: { muted: false, volume: 0.8, sfx: 1, ambient: 0.5 },
    visuals: {
      theme: 'Day',
      reducedMotion: false,
      textScale: 1,
      colorblind: false,
      highContrast: false,
      cellScale: 1,
    },
    controls: { swapMarkButtons: false, tapToCycle: false, confirmBeforeClear: false },
    comfort: { hoverHighlight: true, mistakeNudge: true, lineHelper: false },
    play: { defaultSize: 'Small', defaultDifficulty: 'Calm', stopwatch: false },
  }),
  journal: () => ({ v: 1, discoveries: {} }),
  stats: () => ({ v: 1, boardsSolved: 0, poolsFilled: 0, creaturesFound: 0 }),
  curatedProgress: () => ({ v: 1, solved: {} }),
  onboarding: () => ({ v: 1, completed: false, seen: false, helpDismissed: false }),
  shellPrefs: () => ({ v: 1, theme: 'Day', muted: false }),
}

// ── Shape validators (lightweight structural checks, not exhaustive) ──────────

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}
function isRecordOf(x: unknown, valueCheck: (v: unknown) => boolean): boolean {
  return isObj(x) && Object.values(x).every(valueCheck)
}

export const VALIDATORS: { [N in Namespace]: (x: unknown) => boolean } = {
  inProgressBoard: (x) =>
    isObj(x) &&
    typeof x.v === 'number' &&
    isObj(x.request) &&
    typeof (x.request as Record<string, unknown>).seed === 'string' &&
    isObj(x.marks) &&
    Array.isArray(x.revealed),
  settings: (x) =>
    isObj(x) && typeof x.v === 'number' && isObj(x.sound) && isObj(x.visuals) && isObj(x.play),
  journal: (x) =>
    isObj(x) &&
    typeof x.v === 'number' &&
    isRecordOf(x.discoveries, (d) => isObj(d) && typeof (d as Record<string, unknown>).count === 'number'),
  stats: (x) =>
    isObj(x) &&
    typeof x.v === 'number' &&
    typeof x.boardsSolved === 'number' &&
    typeof x.poolsFilled === 'number' &&
    typeof x.creaturesFound === 'number',
  curatedProgress: (x) => isObj(x) && typeof x.v === 'number' && isObj(x.solved),
  onboarding: (x) =>
    isObj(x) && typeof x.v === 'number' && typeof x.completed === 'boolean' && typeof x.seen === 'boolean',
  shellPrefs: (x) =>
    isObj(x) && typeof x.v === 'number' && typeof x.theme === 'string' && typeof x.muted === 'boolean',
}

// ── Export/import + migration types ───────────────────────────────────────────

export interface SaveBlob {
  appVersion: string
  schemaVersion: number
  records: Partial<{ [N in Namespace]: SchemaMap[N] }>
}

/** A single forward step for one namespace: `vN` shape → `vN+1` shape. */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>
