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
  /**
   * `E` / `O` in place of an adjacency count (018). Same discipline as
   * `lineConnectivity`: optional, default-off, and it reaches the RNG seed
   * string ONLY when enabled.
   *
   * Deep-tier only. The gate lives in `endlessClues`, not just in the UI — a
   * stale `true` at Calm would change which board that seed produces in
   * exchange for clues reduction then strips anyway (the trap 016 documented
   * for `lineConnectivity`).
   */
  evenOdd?: boolean
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

/** Whether a count of water neighbours is even or odd (018). */
export type Parity = 'even' | 'odd'

/**
 * What a clue says about QUANTITY: an exact number, or only its parity (019).
 *
 * This is one half of a clue. The other half is its **framing** — the `{}`/`--`
 * annotation, which says something about *arrangement* instead. The two are
 * orthogonal, and every clue site (a stone, an edge total) carries both. Until
 * 019 the framing could only ever wrap a number and a parity could only ever
 * appear bare; nothing new is invented by letting them meet, and the code gets
 * smaller for it.
 *
 * A parity face carries no `count`, deliberately: reading the number off a clue
 * that withheld it is a *type error*, because a solver that could reach for it
 * anyway would quietly cheat.
 *
 * **The `?: never` arms are load-bearing.** The natural
 * `{ count: number } | { parity: Parity }` does NOT prevent a clue carrying
 * both: excess-property checking against a union permits any property present
 * in *any* member, so `{ count: 4, parity: 'even' }` type-checks against it.
 * `hasParityFace` would then read such an object as a parity clue and silently
 * ignore its count. Pinned by `clue-face.test.ts`; the same hole existed
 * latently in 018's `CountClue | ParityClue`.
 */
export type ClueFace = { count: number; parity?: never } | { parity: Parity; count?: never }

/** What a clue says about ARRANGEMENT; absent = the face alone, unframed. */
export interface ClueFraming {
  /** `{}` (one unbroken run) / `--` (two or more); absent = plain */
  connectivity?: Connectivity
}

/**
 * An adjacency clue shown on a given rock cell — a face plus a framing, giving
 * the six forms `4`, `{4}`, `-4-`, `+`, `{+}`, `-+-`.
 *
 * TypeScript distributes the intersection over the face union, so both faces get
 * the framing without either being spelled out twice.
 */
export type AdjacencyClue = ClueFace & ClueFraming

/** The count form specifically — what generation always computes. */
export type CountClue = Extract<AdjacencyClue, { count: number }>
/** The parity form specifically — what reduction may weaken a clue to. */
export type ParityClue = Extract<AdjacencyClue, { parity: Parity }>

/**
 * Narrow any face-carrying clue — a cell's or a line's — to its parity form.
 *
 * Named for the *face* rather than the clue because both clue sites are now the
 * same idea; 018's `isParityClue` only ever applied to cells.
 */
export function hasParityFace<T extends ClueFace>(clue: T): clue is Extract<T, { parity: Parity }> {
  return clue.parity !== undefined
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

/** Which line a `LineClue` belongs to, and which end its label sits at. */
export interface LineSite {
  axis: Axis
  index: number
  from: 'start' | 'end'
}

/**
 * A line/edge total: what is known about the water along one axis line.
 *
 * The same face × framing pair a stone carries (019). `count` is the row's water
 * total; a parity face withholds it. The framing reads the way the row looks —
 * a stone OR a missing cell ends a run (010 FR-002/FR-003).
 *
 * `count` rather than `total` so the two clue sites share one face vocabulary
 * and one formatter. The rename is invisible to `serializeBoard`, whose line
 * tuples are positional, which is why the fingerprint table proves it changed
 * nothing.
 */
export type LineClue = ClueFace & ClueFraming & LineSite

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
  | 'parity'

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
