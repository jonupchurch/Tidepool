// board-source — the pure layer turning each mode (Endless / Curated / Seed
// entry) into a single BoardRequest {seed,size,difficulty} for Gameplay (002).
// Determinism comes entirely from the engine (001); progress/prefs persist
// through the SaveStore seam (008). No DOM, no ambient randomness.
export type { BoardRequest } from './request'
export {
  DEFAULT_CLUES,
  isBoardRequest,
  launchBoard,
  toBoardParams,
  toDifficultyTier,
  toSizeTier,
} from './request'
export {
  nextSeed,
  createEndlessStream,
  seedAtIndex,
  shapeField,
  loadEndlessPrefs,
  saveEndlessPrefs,
} from './endless'
export type { EndlessPrefs, EndlessStream } from './endless'
export { parseSeedEntry } from './seed-entry'
export type { SeedEntryPrefs, SeedEntryResult } from './seed-entry'
export {
  ANY_SHORE,
  DEFAULT_SHORE,
  edgeHintsApply,
  endlessClues,
  isShoreChoice,
  resolveShore,
  shoreName,
  shoresFor,
} from './shore'
export type { ShoreChoice } from './shore'
export {
  loadCuratedPack,
  manifestRows,
  markCuratedSolved,
  getCuratedRows,
  nextCuratedEntry,
  groupRows,
  pagesOf,
  pageOf,
  tally,
  resolveLocks,
  OPEN_GATING,
} from './curated'
export type {
  CuratedEntry,
  CuratedGroup,
  CuratedGroupRows,
  CuratedManifest,
  CuratedPage,
  CuratedRow,
  GatingConfig,
} from './curated'
