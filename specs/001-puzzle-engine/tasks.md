---
description: "Task list for the Puzzle Engine feature"
---

# Tasks: Puzzle Engine — Deterministic Board Generation & Solving

**Input**: Design documents from `specs/001-puzzle-engine/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/engine-api.md, quickstart.md

**Tests**: INCLUDED (test-first). The engine is the highest-signal test target and the spec/plan/quickstart require contract tests + solver-as-oracle (Constitution VIII, Principle XI). Tests are co-located as `src/core/*.test.ts` (Vitest), per `stacks/tidepools.md`.

**Organization**: Grouped by the spec's user stories. Note: for a pure engine the stories share one pipeline, so the solver and shared model live in Foundational (they are hard prerequisites for verified generation).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5 from spec.md
- Paths are exact; all engine code lives under `src/core/`

---

## Phase 1: Setup

**Purpose**: Module skeleton + guardrails

- [x] T001 Create the `src/core/` file skeleton with typed stubs + exports (`rng.ts`, `hex.ts`, `board.ts`, `clues.ts`, `techniques.ts`, `solver.ts`, `difficulty.ts`, `reduce.ts`, `generate.ts`, `serialize.ts`, `index.ts`) per plan.md
- [x] T002 [P] Add a purity-guard test asserting no `Math.random`, `Date.now`, `new Date`, or DOM globals appear anywhere under `src/core/` in `src/core/purity.test.ts`
- [x] T003 [P] Add an ASCII board-dump + fixture helpers for tests in `src/core/test-helpers.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared building blocks every story needs — RNG, geometry, board/clue model, the solver, and serialization.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 [P] Implement seeded PRNG (`sfc32`) + `cyrb128` string→seed hash (integer-stable, `>>>0`/`Math.imul`) in `src/core/rng.ts`
- [x] T005 [P] Unit tests for RNG: same seed → identical sequence; integer stability in `src/core/rng.test.ts`
- [x] T006 [P] Implement axial hex geometry — coords, fixed neighbor-ring order, the 3 line axes + traversal, pointy-top — in `src/core/hex.ts`
- [x] T007 [P] Unit tests for hex geometry: neighbor set/order, line enumeration, present-set membership in `src/core/hex.test.ts`
- [x] T008 Define `BoardParams` / `Board` / `Cell` / `Clue` / `SizeTier` / `DifficultyTier` types + present-cell-set board construction (filled field) in `src/core/board.ts` (depends on T006)
- [x] T009 Implement clue computation — adjacency counts, local `{}`/`--` connectivity from the neighbor ring, and line/edge totals — in `src/core/clues.ts` (depends on T006, T008)
- [x] T010 [P] Unit tests for clues: adjacency counts, connected vs split classification, line totals on known layouts in `src/core/clues.test.ts`
- [x] T011 Implement the technique catalog (forced-count, line-total, connectivity, subset-overlap) in `src/core/techniques.ts` (depends on T008, T009)
- [x] T012 Implement the fixpoint logic solver + independent bounded-backtracking uniqueness counter, returning `SolverResult {solved, unique, techniquesUsed, maxDepth}`, in `src/core/solver.ts` (depends on T011)
- [x] T013 [P] Unit tests for the solver on hand-authored fixtures: solvable→`solved`, ambiguous→`!unique`, guess-required→`!solved` in `src/core/solver.test.ts`
- [x] T014 [P] Implement canonical board serialization + human seed codes (`WORD-NNNN` parse/format) in `src/core/serialize.ts` (depends on T008)
- [x] T015 [P] Unit tests for serialization: canonical round-trip deep-equal; seed parse/format in `src/core/serialize.test.ts`

**Checkpoint**: geometry, model, clues, solver, and serialization all green — verified generation can begin.

---

## Phase 3: User Story 1 — Generate a fair, solvable board (Priority: P1) 🎯 MVP

**Goal**: `generateBoard(params)` returns a board that is verified `solved && unique` (guess-free), deterministically from the seed.

**Independent Test**: Generate from a fixed seed; assert `solve(board).solved && .unique`; regenerate → identical.

- [x] T016 [P] [US1] Contract test (write first, expect fail): for a sampled size×difficulty matrix, `generateBoard` results satisfy `solve().solved && .unique` in `src/core/generate.contract.test.ts`
- [x] T017 [US1] Implement seeded candidate layout generation (water/rock over the present-cell field) in `src/core/generate.ts` (depends on T004, T008)
- [x] T018 [US1] Wire the pipeline in `src/core/generate.ts`: layout → `computeClues` → `solve`-verify; on failure, advance deterministically to the next seed-derived candidate (depends on T009, T012)
- [x] T019 [US1] Export the public `generateBoard` + `solve` from `src/core/index.ts` per contracts/engine-api.md
- [x] T020 [US1] Make T016 pass; add edge-case tests (degenerate all-water/all-rock rejected; smallest ~30 and largest ~250 sizes) in `src/core/generate.test.ts`

**Checkpoint**: MVP — deterministic, verified, uniquely-solvable boards from a seed.

---

## Phase 4: User Story 2 — Reproduce the identical board anywhere (Priority: P1)

**Goal**: identical `params` → byte-identical board on any run/machine.

**Independent Test**: generate twice from the same params, compare `serializeBoard` strings — equal.

- [x] T021 [P] [US2] Contract test: same params → identical `serializeBoard` across two runs and a fresh module/RNG instance in `src/core/determinism.test.ts`
- [x] T022 [US2] Ensure `generate` threads the RNG explicitly with zero global/shared state; fix any nondeterminism T021 surfaces in `src/core/generate.ts`

**Checkpoint**: reproduction is byte-exact (SC-001).

---

## Phase 5: User Story 3 — Tune difficulty predictably (Priority: P2)

**Goal**: boards are rated by technique+depth and generation targets the requested tier.

**Independent Test**: request each tier; ≥95% rate at the requested tier; harder tiers need deeper deduction.

- [x] T023 [P] [US3] Implement difficulty rating (hardest technique + max depth → Calm/Tricky/Deep) in `src/core/difficulty.ts` (depends on T012)
- [x] T024 [P] [US3] Unit tests for rating: technique/depth → expected tier boundaries in `src/core/difficulty.test.ts`
- [x] T025 [US3] Extend `generate` to target the requested tier — advance candidates until the rating matches, else return the honestly-rated best — in `src/core/generate.ts`
- [x] T026 [US3] Contract test: ≥95% of a sampled batch per tier rate at the requested tier in `src/core/rating.test.ts`

**Checkpoint**: difficulty is honest and tunable (SC-004).

---

## Phase 6: User Story 4 — Solver / oracle / rater exposed (Priority: P2)

**Goal**: `solve()` is a trustworthy public oracle for any board.

**Independent Test**: feed known unique / ambiguous / guess-requiring fixtures; assert verdicts.

- [x] T027 [P] [US4] Author fixture boards (known-unique, known-ambiguous, guess-requiring) in `src/core/fixtures/`
- [x] T028 [US4] Contract test: `solve()` classifies each fixture correctly in `src/core/oracle.test.ts`
- [x] T029 [US4] Finalize the public `solve` / `rateDifficulty` surface + `SolverResult` shape in `src/core/index.ts`

**Checkpoint**: solver trustworthy as oracle + CI use (SC-006).

---

## Phase 7: User Story 5 — Minimal clue reduction (Priority: P3)

**Goal**: served boards show the fewest clues that still force a unique guess-free solution.

**Independent Test**: removing any present clue breaks `solved && unique`.

- [x] T030 [P] [US5] Contract test (write first): after reduction, removing any present clue breaks `solved && unique` in `src/core/reduce.test.ts`
- [x] T031 [US5] Implement seeded greedy clue reduction preserving unique guess-free solvability in `src/core/reduce.ts` (depends on T012, T018)
- [x] T032 [US5] Integrate reduction into `generateBoard` (served boards are minimal; re-verify unique after reduction) in `src/core/generate.ts`
- [x] T033 [US5] Make T030 pass; add minimality tests across the size×difficulty matrix in `src/core/reduce.test.ts`

**Checkpoint**: boards are minimal, elegant puzzles (SC-003).

---

## Phase 8: Polish & Cross-Cutting

- [x] T034 [P] Performance test: ~250-cell generate+verify under the ~2s budget in `src/core/perf.test.ts` (SC-005)
- [x] T035 [P] Cover every contract test listed in `contracts/engine-api.md` and run the `quickstart.md` matrix
- [x] T036 `npm run typecheck` + `npm run build` + full `npm run test` green; add the engine's first `CHANGELOG.md` entry

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2, blocking)** → **User Stories (Phase 3–7)** → **Polish (Phase 8)**.
- Within Foundational, the hard chain is: `rng`/`hex` → `board` → `clues` → `techniques` → `solver`; `serialize` is parallel to that chain.
- **US1** depends on all of Foundational (esp. `solver` for verification). **US2** builds on US1 + `serialize`. **US3** depends on `solver` + US1's generate loop. **US4** depends on `solver`. **US5** depends on `solver` + US1's generate.
- Tests for a task are written before/with its implementation and must fail first.

## Parallel Opportunities

- Phase 1: T002, T003 in parallel.
- Phase 2: T004+T005 (rng), T006+T007 (hex), and T014+T015 (serialize) are three independent parallel tracks; `board → clues → techniques → solver` is the serial spine.
- Later phases: the [P] contract tests and the fixture authoring (T027) can be written ahead of their implementations.

## Implementation Strategy

- **MVP = Phases 1–3 (through US1)**: a deterministic engine that yields verified, uniquely-solvable boards. Stop and validate here — it unblocks features 002/004/008.
- Then add US2 (reproducibility property), US3 (difficulty), US4 (oracle polish), US5 (reduction — what makes boards *good* puzzles) incrementally.
- Commit after each task or logical group; the first `CHANGELOG.md` entry lands with this feature (T036).

## Notes

- All paths under `src/core/`; tests co-located as `*.test.ts` (Vitest).
- Reduction (US5) is prioritized P3 but is what turns a trivially-unique fully-clued board into a real puzzle — schedule it before shipping playable boards to feature 002.
- Keep `src/core/` pure: no `Math.random`/`Date.now`/DOM (enforced by T002).
