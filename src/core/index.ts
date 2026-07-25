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
  ClueToggles,
  Connectivity,
  DifficultyTier,
  LineClue,
  SeedCode,
  SizeTier,
  SolverResult,
  Technique,
} from './board'
export { DIFFICULTY_TIERS, SIZE_TIERS } from './board'
export type { Axial, Line } from './hex'

// Hex geometry (public — consumed by render layout, pool enumeration, clue
// highlighting; downstream features reuse this rather than re-deriving geometry)
export {
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
