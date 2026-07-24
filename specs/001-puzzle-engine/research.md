# Research — Puzzle Engine

Phase 0 decisions. Each resolves a technical unknown from the plan's Technical Context.

## R1. Seeded PRNG

- **Decision**: A small, fast 32-bit PRNG (`sfc32`) seeded from the human-friendly seed code via a string hash (`cyrb128` → four 32-bit words). All arithmetic uses `>>> 0` / `Math.imul` so results are identical across JS engines and platforms.
- **Rationale**: Deterministic and portable (Constitution XI), dependency-free, well-distributed, trivially fast. No global state — an RNG is an explicit object threaded through generation.
- **Alternatives considered**: `Math.random` (rejected — non-deterministic, forbidden by XI); `xoshiro128**` (fine, marginally more code); crypto RNG (rejected — non-reproducible).

## R2. Hex coordinate system & topology

- **Decision**: Axial coordinates `(q, r)`, pointy-top orientation, with cube conversion for neighbor/line math (per Red Blob Games). The board is a **set of present cells** keyed by `"q,r"`; a filled rectangular/parallelogram region is just one such set.
- **Rationale**: Clean neighbor and line traversal; representing topology as a membership set makes irregular/holed boards a later data change, not an engine change (spec FR-016). Neighbor ring order is fixed and deterministic — required for connectivity clue semantics.
- **Alternatives considered**: Offset (row/col) coordinates (rejected — awkward neighbor math, orientation-specific); dense 2D array (rejected — can't represent holes cleanly).

## R3. Clue model & connectivity semantics

- **Decision**: Two clue families in v1:
  - **Adjacency clue** on a rock cell: the count of water among its ≤6 neighbors, optionally annotated with **local** connectivity — `{n}` = the water neighbors are consecutive around the cell's ring; `-n-` = they are not all consecutive.
  - **Line/edge total**: total water along one of the three axis directions from the border. Plain count in v1 (no connectivity annotation on lines yet).
- **Rationale**: Matches the locked local/Hexcells semantics and the four mechanics the owner named. "Consecutive around the ring" is well-defined and cheaply computable from the fixed neighbor order.
- **Alternatives considered**: Global connected-components semantics (rejected in clarify — heavier + off-spec); connectivity annotations on line clues (deferred — possible v2 richness).

## R4. Solver technique catalog

- **Decision**: A fixpoint solver applying an ordered, extensible catalog of human techniques until no new cell can be determined:
  1. **Forced-by-count** (single clue): remaining unknowns around a clue are all-water or all-rock when the count forces it.
  2. **Line-total forcing**: same logic across a line's cells vs. its total.
  3. **Connectivity forcing**: use `{}`/`--` to eliminate arrangements (e.g., `{2}` forces the two waters adjacent; `-2-` forbids adjacency), determining cells where only one arrangement survives.
  4. **Subset/overlap**: compare overlapping clue regions to deduce forced cells (region subtraction).
  Depth = length of the deduction chain; a board is guess-free iff the catalog reaches a full assignment with no stall.
- **Rationale**: These are the human-legible techniques the difficulty tiers are defined against; keeping them as discrete, ordered rules makes both solving and rating explainable and testable. Extensible catalog lets v2 add techniques without redesign.
- **Alternatives considered**: Pure SAT/CSP solver (rejected as the primary solver — solves boards a human couldn't, so it can't rate human difficulty or guarantee guess-free); used only as the independent uniqueness oracle (see R5).

## R5. Uniqueness guarantee

- **Decision**: Two-part check. (a) The technique solver must reach a **complete** assignment using only allowed techniques → proves guess-free logic-solvability. (b) An independent bounded **backtracking counter** confirms the clue set admits **exactly one** satisfying assignment → proves uniqueness even against techniques the catalog lacks.
- **Rationale**: (a) alone guarantees "our human techniques finish"; (b) guards against a board that is technically ambiguous. Both together satisfy "exactly one solution reachable by pure logic" (spec FR-002, SC-002).
- **Alternatives considered**: Trusting the technique solver alone (rejected — could pass a board with a second solution the catalog can't see).

## R6. Clue reduction (minimal set)

- **Decision**: Start fully-clued (every rock cell + candidate line totals revealed), then iterate clues in a **seeded** order, removing each tentatively and keeping it only if the board is still uniquely solvable + guess-free without it. Result is a minimal, guess-free board.
- **Rationale**: Standard, proven reduction; seeded order keeps it deterministic and reproducible. Minimality is spec SC-003.
- **Alternatives considered**: Random removal (rejected — non-deterministic); exhaustive minimal-set search (rejected — exponential, unnecessary for "a" minimal set).

## R7. Difficulty rating & tiers

- **Decision**: Rate by the **hardest technique** and **max deduction depth** the unique solution required (from the solver): Calm = techniques 1–2 only, shallow; Tricky = requires subset/overlap (4) and/or line-total chains; Deep = requires connectivity forcing (3) or long chains. Size and clue density are generation inputs, not the rating (spec FR-010). The generator advances deterministically to the next seed-derived candidate until it produces a board at the requested tier.
- **Rationale**: Honest, testable, and reuses the solver. Never mislabels (SC-004).
- **Alternatives considered**: Size/density-based rating (rejected in clarify).

## R8. Serialization & seed codes

- **Decision**: The shareable/reproducible key is `{ seedCode, size, difficulty }`. `seedCode` is a human-friendly `WORD-NNNN` (curated word list + number) hashed into the PRNG. A separate **canonical board serialization** (cells ordered by `(q,r)`, states + clues encoded) exists for test-oracle equality and save/replay.
- **Rationale**: Human-friendly sharing (FR-015) while the canonical form gives byte-exact equality for determinism tests (SC-001).
- **Alternatives considered**: Serializing the whole board as the share token (rejected — long, opaque; the seed already reconstructs it).

## R9. Off-main-thread execution

- **Decision**: `core/` exposes only pure functions and is worker-agnostic. On-demand generation runs inside a Web Worker introduced by feature 002; the worker imports `core/generate` and posts results back. Node/CI calls the same pure functions directly.
- **Rationale**: Keeps the UI responsive (FR-017) without polluting `core/` with platform concerns; the same pure code is testable in Node and runnable in the browser/Tauri webview.
- **Alternatives considered**: Generation on the main thread (rejected — large boards would jank the UI).
