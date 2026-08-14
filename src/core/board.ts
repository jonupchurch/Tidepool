// board.ts — the board data model: parameters, cells, clues, and the assembled
// Board. Types are the contract with the rest of the engine (data-model.md).
// Pure: no DOM, no randomness, no wall-clock.
import type { Axial } from './hex'
import { key, boundsOf } from './hex'
import type { ShapeId } from './shapes'

export type SizeTier = 'Small' | 'Medium' | 'Large'
export type DifficultyTier = 'Calm' | 'Tricky' | 'Deep'

export const SIZE_TIERS: readonly SizeTier[] = ['Small', 'Medium', 'Large']
export const DIFFICULTY_TIERS: readonly DifficultyTier[] = ['Calm', 'Tricky', 'Deep']

/** Which optional clue mechanics are enabled. Adjacency counts are always on. */
export interface ClueToggles {
  connectivity: boolean
  lineTotals: boolean
  /**
   * `{n}` / `-n-` on row totals (010). Optional and default-off: it contributes
   * to the RNG seed string ONLY when enabled, so every board that predates it
   * generates byte-identically. See `rngSeedString` and `fingerprints.test.ts`.
   */
  lineConnectivity?: boolean
}

/** Human-friendly seed, `WORD-NNNN` (e.g. `CORAL-4417`). */
export type SeedCode = string

/** The complete, reproducible key for a board. */
export interface BoardParams {
  seed: SeedCode
  size: SizeTier
  difficulty: DifficultyTier
  clues: ClueToggles
  /**
   * Which silhouette the board is played on (012). Optional and defaulting to
   * the filled hexagon, and — like `clues.lineConnectivity` — it contributes to
   * the RNG seed string ONLY when it is something other than the default, so
   * every board that predates shapes generates byte-identically.
   */
  shape?: ShapeId
}

/** The hidden solution value of a present cell. */
export type CellState = 'water' | 'rock'

/** Local (Hexcells-style) connectivity of the water neighbours around a clue. */
export type Connectivity = 'connected' | 'split'

/** An adjacency clue shown on a given rock cell. */
export interface AdjacencyClue {
  /** water among the up-to-6 present neighbours */
  count: number
  /** `{}` (consecutive around the ring) / `--` (not all consecutive); absent = plain number */
  connectivity?: Connectivity
}

export interface Cell {
  coord: Axial
  /** ground-truth solution, hidden from the player */
  state: CellState
  /** whether this cell is pre-revealed as a clue */
  given: boolean
  /** present only on given rock cells */
  clue?: AdjacencyClue
}

export type Axis = 0 | 1 | 2

/** A line/edge total: water cells along one axis line. */
export interface LineClue {
  axis: Axis
  index: number
  total: number
  from: 'start' | 'end'
  /**
   * `{}` (the row's water is one unbroken run) / `--` (two or more runs);
   * absent = plain number. A stone OR a missing cell ends a run, so this reads
   * the way the row looks (010 FR-002/FR-003).
   */
  connectivity?: Connectivity
}

export interface Board {
  params: BoardParams
  /** the set of present coord keys — topology as data */
  present: Set<string>
  /** every present coord → its Cell, keyed by `"q,r"` */
  cells: Map<string, Cell>
  /** the given line clues (after reduction) */
  lines: LineClue[]
  bounds: { minQ: number; maxQ: number; minR: number; maxR: number }
}

export type Technique =
  | 'forced-count'
  | 'line-total'
  | 'connectivity'
  | 'subset-overlap'
  | 'line-connectivity'

export interface SolverResult {
  /** technique solver reached a complete assignment, guess-free */
  solved: boolean
  /** independent counter confirmed exactly one satisfying assignment */
  unique: boolean
  techniquesUsed: Technique[]
  /** longest deduction chain (fixpoint rounds that made progress) */
  maxDepth: number
  rating: DifficultyTier
  /** set if the clue set is unsatisfiable (never for a generated board) */
  contradiction?: boolean
}

export function isSizeTier(x: unknown): x is SizeTier {
  return typeof x === 'string' && (SIZE_TIERS as readonly string[]).includes(x)
}

export function isDifficultyTier(x: unknown): x is DifficultyTier {
  return typeof x === 'string' && (DIFFICULTY_TIERS as readonly string[]).includes(x)
}

/**
 * Assemble a Board from a present set and a full solution layout. `given` cells
 * (with clues) and `lines` are supplied by the generator/reducer; this only
 * wires the structure. Callers own correctness of clue values.
 */
export function makeBoard(args: {
  params: BoardParams
  present: Set<string>
  cells: Map<string, Cell>
  lines: LineClue[]
}): Board {
  const coords: Axial[] = []
  for (const k of args.present) {
    const cell = args.cells.get(k)
    if (cell) coords.push(cell.coord)
  }
  return {
    params: args.params,
    present: args.present,
    cells: args.cells,
    lines: args.lines,
    bounds: boundsOf(coords),
  }
}

/** Convenience: the ground-truth state lookup for a present coord. */
export function stateAt(board: Board, k: string): CellState | undefined {
  return board.cells.get(k)?.state
}

export { key }
