# Implementation Plan: Puzzle Engine — Deterministic Board Generation & Solving

**Branch**: `001-puzzle-engine` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-puzzle-engine/spec.md`

## Summary

The engine is the pure, deterministic core (`src/core/`) that turns a seed + size + difficulty into a hexagonal tide-pool board that is provably solvable by logic alone, with no guessing (Constitution XI). Approach: a seeded PRNG drives a candidate water/rock layout on a sparse hex grid; clues are computed (adjacency numbers with local `{}`/`--` connectivity, and line/edge totals); a human-technique logic solver both verifies unique guess-free solvability and rates difficulty by the techniques/depth required; a reduction step strips clues to a minimal set the solver can still complete. The solver doubles as difficulty rater and CI test oracle. No DOM, storage, or network — those live in other features.

## Technical Context

**Language/Version**: TypeScript (strict), ES2022 target.

**Primary Dependencies**: None at runtime — `core/` is dependency-free pure TS. Dev/test: Vitest.

**Storage**: N/A (the engine is pure; persistence belongs to feature 008).

**Testing**: Vitest unit tests, co-located as `src/core/*.test.ts`. The solver is its own test oracle.

**Target Platform**: Runs in a browser main thread and (for on-demand generation) a Web Worker; also runs under Node for CI. Later runs unchanged inside the Tauri webview.

**Project Type**: Internal library module within the single web app (`src/core/`).

**Performance Goals**: Generate + fully verify a ~250-cell board in under ~2s on a typical desktop (SC-005); the solver must be fast enough to run many times inside the reduction loop.

**Constraints**: Purely deterministic — no `Math.random`, `Date.now`, or ambient entropy anywhere in `core/`. No DOM/React/I/O. Must be safe to run off the main thread.

**Scale/Scope**: Boards ~30–250 cells; 3 size tiers × 3 difficulty tiers; two clue families (adjacency w/ connectivity, line totals).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **XI. Determinism & Solvability (NON-NEGOTIABLE)** — The entire design is built to satisfy it: seeded PRNG only; every board solver-verified unique + guess-free before serving; reduction preserves uniqueness. ✅ PASS
- **III. Match conventions** — Follows `stacks/tidepools.md`: `core/` pure, no DOM/React, no randomness/wall-clock, `@/` alias. ✅ PASS
- **IV. Scope discipline** — v1 bounded: filled field (sparse-cell model), no irregular shapes, no water-number clues, adjacency-connectivity only (line totals plain). Deferrals recorded. ✅ PASS
- **VIII. Test at the right level** — Engine logic is the highest-signal unit-test target; Vitest coverage of RNG determinism, clue computation, solver techniques, reduction, and difficulty rating. Solver-as-oracle enables property/regression tests. ✅ PASS
- **VI. Narrate / VII. Plan-first** — This artifact set is the plan; produced before any engine code. ✅ PASS

No violations → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-puzzle-engine/
├── plan.md              # This file
├── research.md          # Phase 0 — key technical decisions
├── data-model.md        # Phase 1 — entities/types
├── contracts/
│   └── engine-api.md    # Phase 1 — the public API core/ exposes
├── quickstart.md        # Phase 1 — how to validate the engine
└── checklists/
    └── requirements.md  # from /speckit-specify
```

### Source Code (repository root)

```text
src/core/
├── rng.ts            # seeded PRNG (sfc32/xoshiro) + string→seed hash; NO Math.random
├── hex.ts            # axial coords, neighbor rings, line traversal (pointy-top)
├── board.ts          # Board / Cell / Clue types + construction over a present-cell set
├── clues.ts          # clue computation: adjacency counts, {}/-- connectivity, line totals
├── techniques.ts     # the human-deduction technique catalog
├── solver.ts         # technique solver to fixpoint + independent uniqueness check
├── difficulty.ts     # rating from techniques used + deduction depth
├── reduce.ts         # greedy, seeded clue reduction preserving uniqueness
├── generate.ts       # top-level pipeline: params → verified minimal board
├── serialize.ts      # canonical board serialization + human-friendly seed codes
├── index.ts          # public API barrel (see contracts/engine-api.md)
└── *.test.ts         # co-located Vitest unit tests + regression fixtures
```

**Structure Decision**: Single-project layout; the engine is a self-contained pure module under `src/core/`. A thin Web Worker wrapper that calls `generate()` off the main thread is introduced by the Gameplay feature (002), not here — `core/` itself stays pure and worker-agnostic. Tests are co-located per the repo's Vitest convention.

## Complexity Tracking

*No constitution violations — section intentionally empty.*
