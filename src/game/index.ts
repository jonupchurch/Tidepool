// game — play session over the engine: marks, undo/redo, pool completion,
// creature assignment, save/restore shape. No DOM/React; portable + testable.
export { PlaySession } from './session'
export type { Mark, MarkKind, MarkDelta } from './session'
export { waterPools } from './pools'
export type { Pool } from './pools'
export {
  CREATURES,
  RARITIES,
  creatureArtUrl,
  creatureDef,
  creatureForPool,
  creatureUnlock,
} from './creatures'
export type { CreatureDef, Rarity } from './creatures'
export {
  applyDiscovery,
  buildJournalView,
  filterCards,
  isNewDiscovery,
  recordBoardSolved,
  recordDiscovery,
} from './journal'
export type {
  CreatureView,
  DiscoveryMap,
  DiscoveryRecord,
  JournalFilter,
  JournalStats,
  JournalView,
} from './journal'
export { loadDiscoveries, loadStats, saveDiscoveries, saveStats } from './journal-store'
export { cellInforms, lineInforms } from './highlight'
export { loadBoard } from './board-loader'
