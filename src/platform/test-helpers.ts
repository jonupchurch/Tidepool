// test-helpers.ts — sample records + legacy/newer fixtures for the persistence
// tests. Not part of the public surface; imported only by *.test.ts.
import type {
  CuratedProgressRecord,
  JournalRecord,
  OnboardingRecord,
  SaveBlob,
  SettingsRecord,
  ShellPrefsRecord,
  StatsRecord,
} from './schemas'
import { APP_VERSION, BLOB_SCHEMA_VERSION } from './schemas'

/** A filled (non-default) sample record per small namespace, for round-trips. */
export const samples = {
  settings: (): SettingsRecord => ({
    v: 1,
    sound: { muted: true, volume: 0.5 },
    visuals: { theme: 'Night Tide', reducedMotion: true, textScale: 1.25, colorblind: true },
    controls: { swapMarkButtons: true },
    play: { defaultSize: 'Medium', defaultDifficulty: 'Deep' },
  }),
  journal: (): JournalRecord => ({
    v: 1,
    discoveries: { anemone: { firstFoundSeed: 'CORAL-4417', count: 3 } },
  }),
  stats: (): StatsRecord => ({ v: 1, boardsSolved: 12, poolsFilled: 40, creaturesFound: 5 }),
  curatedProgress: (): CuratedProgressRecord => ({
    v: 1,
    solved: { 'shore-1': { earnedCreatureId: 'anemone' } },
  }),
  onboarding: (): OnboardingRecord => ({ v: 1, completed: true, seen: true }),
  shellPrefs: (): ShellPrefsRecord => ({ v: 1, theme: 'Night Tide', muted: true }),
}

/** Legacy (unversioned, old field name) stats — migrates to v1 `boardsSolved`. */
export const legacyStatsV0 = { solved: 7, poolsFilled: 3 }

/** A stats record from a hypothetical newer app version — must be refused. */
export const newerStatsV2 = { v: 2, boardsSolved: 1, poolsFilled: 0, creaturesFound: 0 }

/** Build a valid export blob from a partial set of records. */
export function makeBlob(records: SaveBlob['records']): SaveBlob {
  return { appVersion: APP_VERSION, schemaVersion: BLOB_SCHEMA_VERSION, records }
}
