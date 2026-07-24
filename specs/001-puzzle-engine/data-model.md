# Data Model — Puzzle Engine

Conceptual entities/types the engine defines. Types are illustrative (final signatures live in `src/core/`), not implementation.

## Parameters & seeds

- **SizeTier**: `'Small' | 'Medium' | 'Large'` → cell-count ranges ~30 / ~80 / ~150+ (max ~250).
- **DifficultyTier**: `'Calm' | 'Tricky' | 'Deep'`.
- **ClueToggles**: which optional clue mechanics are enabled — `{ connectivity: boolean; lineTotals: boolean }`. (Adjacency counts are always on.)
- **SeedCode**: human-friendly string, `WORD-NNNN` (e.g., `CORAL-4417`).
- **BoardParams**: `{ seed: SeedCode; size: SizeTier; difficulty: DifficultyTier; clues: ClueToggles }` — the complete, reproducible key for a board.

## Geometry

- **Axial**: `{ q: number; r: number }` — a hex position (pointy-top). Key form `"q,r"`.
- **Direction**: one of the 6 neighbor directions in fixed ring order (0–5); and 3 line **axes** for totals.
- **PresentSet**: the set of `Axial` positions that exist on this board (topology as data).

## Board

- **CellState**: `'water' | 'rock'` — the hidden solution value of a present cell.
- **Cell**:
  - `coord: Axial`
  - `state: CellState` — ground-truth solution (hidden from the player)
  - `given: boolean` — whether this cell is pre-revealed as a clue
  - `clue?: AdjacencyClue` — present only on given rock cells
- **AdjacencyClue**:
  - `count: number` — water among the up-to-6 present neighbors
  - `connectivity?: 'connected' | 'split'` — `{}` (consecutive around the ring) / `--` (not all consecutive); absent = plain number
- **LineClue**:
  - `axis: 0 | 1 | 2` and `index: number` — which line
  - `total: number` — water cells along that line
  - `from: 'start' | 'end'` — which border it projects from
- **Board**:
  - `params: BoardParams`
  - `present: PresentSet`
  - `cells: Map<string, Cell>` (keyed by `"q,r"`)
  - `lines: LineClue[]`
  - `bounds`: min/max q,r for layout
  - **Invariants**: every present coord has a `Cell`; every neighbor referenced is present or omitted; clue values are consistent with `state` (a generated board is internally consistent by construction).

## Solving & rating

- **Technique**: `'forced-count' | 'line-total' | 'connectivity' | 'subset-overlap'` (extensible).
- **SolverResult**:
  - `solved: boolean` — technique solver reached a complete assignment (guess-free)
  - `unique: boolean` — independent counter confirmed exactly one satisfying assignment
  - `techniquesUsed: Technique[]`
  - `maxDepth: number` — longest deduction chain
  - `rating: DifficultyTier` — derived from `techniquesUsed` + `maxDepth`
  - `contradiction?: boolean` — set if the clue set is unsatisfiable (should never occur for a generated board)

## Relationships & lifecycle

- `BoardParams` → (generate) → candidate `Board` → (computeClues) → clued `Board` → (solve/verify) → `SolverResult` → (reduce) → minimal `Board` (re-verified) → (rate) → `rating` stamped on `params`/result.
- A `Board` is fully reconstructable from `BoardParams` alone; `cells`/`lines` are derived, never authored by hand.
- **Validation rules** (from requirements): generated boards MUST be `solved && unique` (FR-002); reduction MUST preserve `solved && unique` (FR-008); regeneration from identical `BoardParams` MUST yield an identical canonical serialization (FR-003/SC-001).
