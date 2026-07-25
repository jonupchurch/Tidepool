// game — play session over the engine: marks, undo/redo, pool completion,
// creature assignment, save/restore shape. No DOM/React; portable + testable.
export { PlaySession } from './session'
export type { Mark, MarkKind, MarkDelta } from './session'
export { waterPools } from './pools'
export type { Pool } from './pools'
export { CREATURES, creatureDef, creatureForPool } from './creatures'
export type { CreatureDef } from './creatures'
export { cellInforms, lineInforms } from './highlight'
export { loadBoard } from './board-loader'
