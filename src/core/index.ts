// core — the pure deterministic engine: seeded RNG -> generator -> solver ->
// reducer -> difficulty. No DOM, no React, no I/O. Never use Math.random() or
// Date.now() here; determinism is the load-bearing invariant.

// Types (data-model.md)
export type {
  Axis,
  AdjacencyClue,
  Board,
  BoardParams,
  Cell,
  CellState,
  ClueFace,
  ClueFraming,
  ClueToggles,
  Connectivity,
  CountClue,
  DifficultyTier,
  LineClue,
  LineSite,
  Parity,
  ParityClue,
  SeedCode,
  SizeTier,
  SolverResult,
  Technique,
} from './board'
export { DIFFICULTY_TIERS, SIZE_TIERS, hasParityFace } from './board'
export type { Axial, Line } from './hex'

// Board silhouettes (012) — the catalog + its guards. `present` is still the
// engine's notion of topology; a shape is just a way of producing one.
export type { ShapeId } from './shapes'
export {
  DEFAULT_SHAPE,
  SHAPE_IDS,
  checkSilhouette,
  isShapeId,
  shapeName,
  shapePresent,
  shapeRegion,
  shapeSupportsSize,
} from './shapes'

// Hex geometry (public — consumed by render layout, pool enumeration, clue
// highlighting; downstream features reuse this rather than re-deriving geometry)
export {
  AXIS_STEP,
  DIRECTIONS,
  key,
  lineIndex,
  linesOf,
  neighbors,
  parseKey,
  presentNeighbors,
} from './hex'

// Generation
export { generateBoard } from './generate'

// Solving / oracle / rating
export { countSolutions, solve } from './solver'
export { allowedTechniquesFor, rateDifficulty } from './difficulty'

// RNG (exposed for testing / advanced use)
export { type Rng, nextInt, seedToRng } from './rng'

// Serialization
export {
  deserializeBoard,
  formatSeed,
  parseSeed,
  serializeBoard,
} from './serialize'
