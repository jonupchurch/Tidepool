# Feature Specification: Puzzle Engine — Deterministic Board Generation & Solving

**Feature Branch**: `001-puzzle-engine`

**Created**: 2026-07-24

**Status**: Draft

**Input**: User description: "The deterministic puzzle engine — the core that produces and validates every Tidepools board. Given a seed plus size and difficulty parameters, it generates a hexagonal tide-pool board where each cell is water or rock, computes the board's clues, and guarantees the board has exactly one solution reachable by pure logic with no guessing… (local/Hexcells-style connectivity; governed by Constitution Principle XI)."

## Clarifications

### Session 2026-07-24

- Q: Board topology for v1? → A: A filled hex field (rectangular/parallelogram), but represented as a **set of present cells** so irregular/holed shapes are a later content change, not an engine rewrite.
- Q: How is difficulty defined and rated? → A: By the **hardest solving technique + deduction depth** the solution requires (size and clue density are inputs, not the rating); the solver doubles as the rater.
- Q: Are water-number clue cells in scope for v1? → A: **No — out of scope**; clues live on rock cells, edges, and lines only. The clue model stays open to adding them later.
- Q: When/how are boards generated? → A: **On-demand** at play time, verified before serving, **off the main thread** so the UI never blocks; pre-generation/caching is a later optional optimization.

## User Scenarios & Testing *(mandatory)*

The "users" of the engine are the game's other features (Gameplay, Curated, Endless, Journal) and, indirectly, the player who receives fair, solvable, reproducible boards. Stories are the capabilities those consumers depend on.

### User Story 1 - Generate a fair, solvable board from a seed (Priority: P1)

Given a seed plus size and difficulty parameters, the engine produces a hexagonal board of water and rock cells with a set of pre-revealed clues, such that the board has **exactly one** solution reachable by logical deduction alone — the player never has to guess.

**Why this priority**: This is the entire reason the engine exists and the foundation every game mode sits on. Without it there is no game.

**Independent Test**: Generate a board from a fixed seed; run the solver and confirm it reaches exactly one solution using only allowed logic techniques and never needs to guess.

**Acceptance Scenarios**:

1. **Given** a seed + size + difficulty, **When** a board is generated, **Then** every cell is exactly one of {water, rock} and a set of clues is present.
2. **Given** a generated board, **When** the solver runs, **Then** it finds exactly one solution with no guessing step required.
3. **Given** a generated board, **When** the solver runs, **Then** the solution it derives matches the hidden layout the generator produced.

### User Story 2 - Reproduce the identical board anywhere (Priority: P1)

The same seed and parameters yield the byte-identical board — same layout, same clues — on any machine, any run, forever. This is what makes curated packs, endless mode, shareable seeds, and reproducible bug reports possible.

**Why this priority**: Reproducibility is a non-negotiable invariant (Constitution XI); curated packs and seed-sharing are impossible without it, and it underpins the test oracle.

**Independent Test**: Generate a board from the same seed twice (and on two environments); serialize both and assert they are identical.

**Acceptance Scenarios**:

1. **Given** the same seed + parameters, **When** a board is generated twice, **Then** the two boards are identical in layout and clues.
2. **Given** the same seed + parameters, **When** generated on different machines/platforms, **Then** the boards are identical.
3. **Given** generation runs, **When** inspected, **Then** no wall-clock time, ambient randomness, or platform entropy influenced the result.

### User Story 3 - Tune difficulty predictably (Priority: P2)

Consumers request a difficulty (and size); the engine produces boards actually rated at that difficulty, using the difficulty levers (size, clue density, enabled clue types, required deduction depth).

**Why this priority**: The difficulty curve drives onboarding (curated) and the "one more pool" loop (endless). It must be dependable, not random.

**Independent Test**: Request each difficulty tier repeatedly; confirm the engine's own rating of each output matches the requested tier, and that harder tiers require deeper deduction than easier ones.

**Acceptance Scenarios**:

1. **Given** a requested difficulty tier, **When** a board is generated, **Then** the engine's rating of that board equals the requested tier.
2. **Given** two boards at adjacent tiers, **When** compared, **Then** the harder board requires strictly deeper or more advanced deduction to solve.
3. **Given** a difficulty lever that disables a clue type, **When** a board is generated, **Then** no clue of that type appears.

### User Story 4 - Serve as solver, difficulty rater, and test oracle (Priority: P2)

Given any board (generated or hand-supplied), the engine can determine whether it is uniquely solvable by logic and report which techniques and how much deduction depth its solution requires — the same mechanism used to rate difficulty and to validate boards in CI.

**Why this priority**: The solver is reused as the difficulty rater and as the CI oracle that regenerates and re-validates every curated seed, so one correct component covers three needs.

**Independent Test**: Feed a curated set of known-solvable, known-ambiguous, and known-unsolvable boards; assert the solver's verdict and technique/depth report on each.

**Acceptance Scenarios**:

1. **Given** a uniquely-solvable board, **When** the solver runs, **Then** it reports "uniquely solvable" plus the techniques and depth used.
2. **Given** a board with multiple solutions, **When** the solver runs, **Then** it reports the solution is not unique.
3. **Given** a board requiring a guess, **When** the solver runs, **Then** it reports that no guess-free logical solution exists.

### User Story 5 - Present the minimal set of clues (Priority: P3)

The board shows the fewest pre-revealed clues that still force a unique, guess-free solution — no redundant hand-holding, no missing information.

**Why this priority**: Minimal clue sets make boards feel elegant and correctly-tuned; over-clued boards feel trivial, under-clued boards require guessing.

**Independent Test**: For a generated board, confirm that removing any single present clue makes the solution non-unique, and that every removed clue was genuinely redundant.

**Acceptance Scenarios**:

1. **Given** a generated board, **When** any single present clue is removed, **Then** the board no longer has a unique guess-free solution.
2. **Given** a generated board, **When** the reduction step runs, **Then** no clue remains that could be removed while preserving uniqueness.

### Edge Cases

- **Unmeetable request**: a seed/params combo that cannot yield a uniquely-solvable board at the requested difficulty → the engine advances deterministically to the next candidate derived from the base seed (still fully reproducible) rather than failing or guessing.
- **Degenerate layouts**: near-all-water or near-all-rock candidates that yield trivial or unsolvable boards are rejected deterministically during generation.
- **Difficulty ceiling for size**: a difficulty higher than a given small board can support → engine either enlarges within the size tier's range or returns the hardest achievable board and rates it honestly (never fakes the rating).
- **Clue types disabled**: with connectivity and/or line-total clues turned off, the board must still be uniquely solvable using only the enabled clue types (or be rejected).
- **Extremes of size**: smallest (~30 cells) and largest (~250 cells) boards both generate and verify successfully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Given a seed and size + difficulty parameters, the engine MUST generate a hexagonal board in which every cell is exactly one of {water, rock}.
- **FR-002**: The engine MUST guarantee every generated board has exactly one solution reachable by logical deduction alone, with no point at which a solver must guess.
- **FR-003**: The same seed + parameters MUST always produce the identical board (layout and clues) on any machine, run, or platform; generation and solving MUST NOT use wall-clock time, ambient randomness, or platform entropy.
- **FR-004**: The engine MUST compute **adjacency-number** clues — a clue cell displaying the count of water cells among its up-to-six neighbors.
- **FR-005**: The engine MUST support **connectivity** annotations on adjacency clues using local / Hexcells-style semantics: `{n}` means the counted water cells are consecutive among themselves; `-n-` means they are not all consecutive. (NOT global connected-components.)
- **FR-006**: The engine MUST support **line/edge total** clues — the total number of water cells along a given row or diagonal, projected from the board edge.
- **FR-007**: Water-number clue cells (a water cell showing its own water-neighbor count) are **out of scope for v1** — clues appear only on rock cells, board edges, and lines. The clue model MUST remain open to adding this clue type later without redesign.
- **FR-008**: The engine MUST reduce the pre-revealed clue set to a **minimal** set such that removing any remaining clue would break uniqueness or force guessing.
- **FR-009**: The engine MUST expose difficulty levers: board **size**, **clue density**, **which clue types are enabled**, and **required deduction depth**.
- **FR-010**: The engine MUST **rate** each generated board's difficulty from the hardest solving technique and the deduction depth its unique solution requires — board size and clue density are generation *inputs*, not the rating itself.
- **FR-011**: The engine MUST provide a **solver** that, given any board, determines whether it is uniquely solvable by logic and reports the techniques and depth used — reusable as the difficulty rater and CI test oracle.
- **FR-012**: The engine MUST be pure — free of user interface, storage, network, and other platform side effects — so it is fully deterministic and testable in isolation.
- **FR-013**: A board MUST be representable in a stable serialized form so that identical seeds can be asserted equal and boards can be shared/reconstructed.
- **FR-014**: When a seed cannot yield a board meeting the requested difficulty, the engine MUST advance to subsequent candidate boards in a fixed, reproducible order derived from the base seed, never introducing non-determinism.
- **FR-015**: A seed SHOULD be expressible as a short human-friendly code that, together with the size and difficulty parameters, fully and unambiguously determines the board.
- **FR-016**: A board MUST be represented as a set of *present* cells (each with a position), so that board topology is data — a filled field in v1, with irregular/holed shapes addable later without engine changes.
- **FR-017**: Boards MUST be generatable and verifiable **on-demand** at play time, fast enough to feel instant (see SC-005) and **without blocking the interface** (i.e., off the main thread). Pre-generation/caching is an optional later optimization, not a v1 requirement.

### Key Entities *(include if feature involves data)*

- **Board**: the puzzle grid — the set of *present* cells (topology as data; a filled field in v1), plus the seed + parameters that produced it.
- **Cell**: a present position that is water or rock, may carry a clue, and knows its neighbors.
- **Clue**: revealed information attached to a rock cell or a line — an adjacency number (optionally with `{}`/`--` connectivity) or a line/edge total. (Water-number clues are out of scope for v1; the model stays open to them.)
- **Seed & Parameters**: the human-friendly seed plus size and difficulty settings that together fully determine a board.
- **Solver Result**: the verdict for a board — uniquely solvable or not — with the set of techniques used and the deduction depth reached.
- **Difficulty Rating**: the tier (e.g., Calm / Tricky / Deep) derived from the solver's technique set and depth.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Regenerating a board from the same seed + parameters yields an identical board **100%** of the time, across machines, runs, and platforms.
- **SC-002**: **100%** of generated boards are solvable by pure logic with no guessing, as verified by the solver on every board before it is served.
- **SC-003**: Every present clue on a generated board is necessary — removing any single clue breaks uniqueness — for **100%** of generated boards.
- **SC-004**: For each difficulty tier, at least **95%** of generated boards are rated at the requested tier (the remainder are rated honestly, never mislabeled).
- **SC-005**: A large board (~250 cells) is generated and fully verified within a time budget suitable for background generation (target: **under ~2 seconds** on a typical desktop).
- **SC-006**: The solver correctly classifies a curated test set of known solvable, ambiguous, and unsolvable boards with **100%** accuracy.

## Assumptions

- **Board shape (v1)**: a filled hexagonal grid region (rectangular / parallelogram), represented as a set of present cells so irregular/holed shapes can be added later without engine changes. *(Resolved in Clarifications.)*
- **Hex orientation & line axes**: pointy-top hexes; line/edge totals along the three hex-axis directions. *(Retained default — not raised as a question; revisit at render time if needed.)*
- **Difficulty & size tiers**: difficulty tiers are Calm / Tricky / Deep, rated by solver technique + depth (Calm = forced counts; Tricky = line-total / subset reasoning; Deep = connectivity contradictions / longer chains). Size tiers Small / Medium / Large map to ~30 / ~80 / ~150+ cells, max ~250. *(Resolved in Clarifications.)*
- **Water-number clues**: out of scope for v1 — clues appear only on rock cells, edges, and lines. *(Resolved in Clarifications.)*
- **Seeds**: short human-friendly codes; a board is fully reconstructable from seed + size + difficulty, stored together.
- **Unmet-difficulty handling**: the engine derives subsequent candidate boards deterministically from the base seed until one qualifies.
- **Generation timing**: boards are generated on-demand and verified before serving, off the main thread; pre-generation/caching is a later optimization. *(Resolved in Clarifications.)*
- **Solver technique catalog** (e.g., forced-by-count, line-total constraints, connectivity contradictions, subset/overlap reasoning) is defined and extensible; the exact catalog and the technique→tier mapping are finalized during planning.
- **Boundaries**: this engine has no UI, storage, or network responsibilities — those belong to the render, ui, and platform features.

## Dependencies

- Governed by **Constitution Principle XI** (Determinism & Solvability, non-negotiable).
- Downstream features — Gameplay/board, Curated shores, Endless tide, Shore Journal — depend on this engine's board model, clue types, and guarantees. This feature is planned and built first.
