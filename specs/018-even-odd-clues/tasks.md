---
description: "Task list for the Even/Odd Clues feature"
---

# Tasks: Even and Odd Clues in the Deep (`E` / `O` on stones)

**Input**: Design documents from `specs/018-even-odd-clues/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md). Cross-feature: builds
directly on **010 line-annotations** (the `Technique` gating, the append-only seed
segment, the `Deep`-only technique set) and **016 varied-shores** (the
`edgeHints` / `edgeHintsApply` toggle pattern this one copies line for line).
Nothing in the curated pack changes.

**Tests**: INCLUDED. Constitution VIII requires them on this project — the generic
template's "tests optional" default does **not** apply. Vitest for the engine,
Playwright for the rendered glyph. Two tests are load-bearing rather than
supporting: the widened fingerprint table (FR-005) and the parity-pass inertness
test (FR-003).

**Organization**: Phases 1–2 are shared spine, then one phase per user story in
priority order.

> **Note on phase shape.** Phase 2 is unusually large for a Spec-Kit feature, and
> that is honest rather than sloppy: US1 is "solve a board using an E/O clue",
> which cannot exist until the engine can *produce, verify and serialize* one. The
> type change in T004 also breaks compilation at five sites simultaneously, and
> Principle IX requires every commit to build and pass — so those sites land
> together in T006 rather than being split into per-story tasks that could never
> be committed independently. The story labels below still mark which requirement
> each task serves.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md (only on user-story-phase tasks)
- Paths are exact. Engine work lands in `src/core/`, reach in
  `src/game/board-source/` + `src/ui/`

---

## Phase 1: Setup — write the guards before touching anything

**Purpose**: Put the determinism net in place *first*. Every later task in this
feature can regenerate every board in existence if it goes wrong, and 010's own
first commit was "freeze board fingerprints before touching the generator".

- [X] T001 Record the baseline: run `npm test`, `npm run typecheck` and `npm run validate:curated`, and note the passing test count in the commit message. Confirm `src/core/fingerprints.test.ts` is green before any edit.
- [X] T002 Widen the `FROZEN` table in `src/core/fingerprints.test.ts` so each row carries its own clue set and optional shape — its `fingerprint()` helper currently hardcodes `{ connectivity: true, lineTotals: true }`. All 36 existing rows MUST keep their existing expected hashes unchanged; this is a pure refactor of the harness, not of the data.
- [X] T003 Add the missing seed-string order assertion in `src/core/generate.test.ts`. `rngSeedString` is module-private in `src/core/generate.ts`, so export it for test use. Assert the composed string for: no optional segments, `lineConnectivity` only, shape only, and `lineConnectivity` + shape. Then correct the comment at `src/core/generate.ts:50-51`, which currently claims this order is "pinned … See `generate.test.ts`" — no such assertion exists anywhere in `src/` today.

**Checkpoint**: guards green, no behaviour changed. Commit here.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Teach the engine a second clue form and prove it stays sound and
deterministic. No user story can begin until this is complete.

**⚠️ CRITICAL**: T004 and T006 are a single commit — see the note above.

### Types and clue computation

- [X] T004 In `src/core/board.ts`: add `export type Parity = 'even' | 'odd'` (mirroring `Connectivity`); change `AdjacencyClue` to the union `{ count: number; connectivity?: Connectivity } | { parity: Parity }`; add `ClueToggles.evenOdd?: boolean` with a comment stating it reaches the RNG seed string only when enabled; add `'parity'` to the `Technique` union. Export `Parity` from `src/core/index.ts`.
- [X] T005 [P] In `src/core/clues.ts`: add `parityOf(count: number): Parity` and `parityInformative(presentNeighbors: number): boolean` (true iff `>= 2` — FR-006, mirroring `connectivityInformative`). Unit tests in `src/core/clues.test.ts` covering the 0-, 1- and 2-neighbour boundaries.
- [X] T006 Make the tree compile again by narrowing all five `AdjacencyClue` read sites the compiler flags, in one commit: `encodeCell`/`decodeCell` in `src/core/serialize.ts` (widen `CellTuple` slot 3 to `(number | 'e' | 'o')?` and discriminate on `typeof t[3] === 'number'`; slot 4 stays exclusive to count clues), `clueText` in `src/render/board-renderer.ts` (return `'E'` / `'O'`), `setup` in `src/core/techniques.ts` (build a parity constraint), and the `cell.clue?.count` read at `src/core/test-helpers.ts:90`.
- [X] T007 [P] Extend the serialization round-trip test in `src/core/serialize.test.ts` to cover a parity clue, and assert that every tuple shape written before this feature still decodes identically (FR-008).

### The solver

- [X] T008 In `src/core/techniques.ts`: make `Constraint` a discriminated union (`kind: 'exact' | 'parity'`) so reading `water` on a parity constraint is a type error. Add the explicit guards the compiler now demands in `applyForcedCount`, `subsetPass`, `applyConnectivity` and `applyLineConnectivity` — note that without a guard `c.water - known` silently yields `NaN` and every comparison quietly returns false, which would look like it worked.
- [X] T009 Add `parityPass` to `src/core/techniques.ts`, iterating **only** parity constraints: 0 unknowns → contradiction if `knownWater % 2` disagrees with the clue; 1 unknown → force it; otherwise no deduction. The zero-unknown check is mandatory, not an optimisation — `applyLineConnectivity`'s existing comment explains why the uniqueness counter needs it.
- [X] T010 [P] Differential test for `parityPass` in `src/core/parity.test.ts`: against brute-force enumeration of all 2⁶ ring arrangements, for every water count and both parities, assert the pass forces exactly the cells every valid arrangement agrees on.
- [X] T011 [P] Inertness test for FR-003 in `src/core/parity.test.ts`: across a spread of ordinary Deep boards (no `evenOdd`), assert `parityPass` reports no progress and makes no assignment. This pins the property the whole feature rests on — a pass that also read *exact* constraints' parities would strengthen the solver for every board and rewrite every seed.
- [X] T012 In `src/core/solver.ts`: add `'parity'` to `TECHNIQUE_ORDER` (after `'line-connectivity'`) and run `parityPass` inside `propagate()` (FR-007), for the step-budget reason its existing comment already gives.
- [X] T013 [P] In `src/core/difficulty.ts`: add `'parity'` to `allowedTechniquesFor('Deep')` only, and treat it like `'connectivity'` in `rateDifficulty`. Extend `src/core/difficulty.test.ts` to assert Calm and Tricky do **not** include it.

### Generation

- [X] T014 In `src/core/generate.ts`: add the `|eo1` segment to `rngSeedString` in the pinned clue-toggle position — after `|lc1`, before `|s:` — and extend T003's assertion to cover `eo1` alone, `lc1`+`eo1`, and both plus a shape.
- [X] T015 In `src/core/reduce.ts`: add the weakening pass **after** the existing removal loop, gated on `params.clues.evenOdd`, walking surviving given clue cells in a fresh order from the same rng; skip any cell failing `parityInformative(presentNeighborCount(...))`; weaken count → parity and restore the count if `techniqueSolves(work, allowed)` fails. The existing item list and its seeded shuffle MUST NOT be touched — a non-parity board never enters this branch, which is what makes it provably inert.
- [X] T016 Confirm the shipped implementation reproduces the spec's measurements: across the 5 seeds × 3 sizes at Deep, ~98 of 284 clues weaken (34.5%), and deleting those same clues instead succeeds 0 times. A throwaway probe with this logic is in the session scratchpad as `_probe-parity.ts`; re-derive rather than trust it.
- [X] T017 Add fingerprint rows to `src/core/fingerprints.test.ts` for the new combinations (`evenOdd` alone, `lineConnectivity`+`evenOdd`, and both plus a shape), captured from the now-shipping generator.

**Checkpoint**: a Deep board with `evenOdd` on carries E/O clues, passes the oracle, round-trips, and every pre-existing board is byte-identical.

---

## Phase 3: User Story 1 — Solve using an even/odd clue (P1)

**Goal**: The mechanic is visible and playable on a real board.

**Independent test**: Load a Deep board generated with even/odd on; confirm at
least one `E` and one `O` tile render, and that the board completes guess-free.

- [X] T018 [US1] Give parity glyphs a distinct visual treatment where the clue face is drawn in `src/render/board-renderer.ts` — it hardcodes `palette.deepPool` and `700 ${size * 0.9}px DISPLAY_FONT` for every clue. A stone with no water neighbours already renders `0`, so `O` must not read as a zero. Add a palette token in `src/render/palette.ts` if a colour is the answer. This is **not** a `cell-style.ts` change; that module styles the tile, never the numeral.
- [X] T019 [P] [US1] Unit-test the clue-face text for all five forms (`n`, `{n}`, `-n-`, `E`, `O`). `clueText` is module-private and `src/render/` has no `board-renderer.test.ts` — only `board-renderer.perf.test.ts` — so export `clueText` and add a new `src/render/board-renderer.test.ts`, following how `line-labels.ts` exposes its pure helpers for `line-labels.test.ts`.
- [X] T020 [US1] Verify by looking, not reasoning: render a Large Deep even/odd board at the smallest cell size in both themes and confirm `O` is unambiguous against `0`. If letter forms cannot be made to read, fall back to a glyph pair sharing no shape with a digit and record the change in the plan.
- [X] T021 [P] [US1] Playwright e2e in `e2e/even-odd.spec.ts`: launch a Deep even/odd board via the existing dev hook, assert both glyph forms appear, and complete the board.
- [X] T022 [P] [US1] Confirm FR-011 by test rather than assumption: marking, locking, mistake handling and perfect-solve tracking read the hidden solution and not the clues, so add a `src/game/session.test.ts` case on an even/odd board asserting identical behaviour.

**Checkpoint**: US1 delivers independently — the mechanic works for anyone who can reach a board with the toggle on.

---

## Phase 4: User Story 2 — Turn even/odd on without disturbing anything else (P1)

**Goal**: A player can switch it on for the Endless tide, and nothing else in the
game moves.

**Independent test**: With the switch off, generate across every seed/size/tier
and confirm byte-identical boards; with it forced on below Deep, the same.

- [X] T023 [US2] In `src/game/board-source/shore.ts`: add `evenOddApply(difficulty)` (true iff `Deep`) and carry `evenOdd` through `endlessClues`, gated on it. Mirror the existing comment explaining why the gate cannot live only in the UI — a stale `true` would change which board a Calm seed produces in exchange for clues reduction then strips.
- [X] T024 [P] [US2] In `src/game/board-source/request.ts`: validate `clues.evenOdd` in `isBoardRequest` alongside `lineConnectivity` (Principle II — the manifest and persisted state are untrusted input).
- [X] T025 [P] [US2] In `src/game/settings.ts`: add `play.evenOdd: boolean` defaulting to `false`, validated with `bool()` exactly as `edgeHints` is; extend `src/game/settings-store.test.ts` to cover an absent and a garbage value.
- [X] T026 [US2] In `src/ui/shell/HomeScreen.tsx`: add the switch beside the edge-hints control, gated on `evenOddApply(difficulty)`, threaded through `LastPlay` and the summary chips — following the `edgeHints` pattern at lines 68, 76, 88, 94 and 102.
- [X] T027 [US2] Determinism test in `src/ui/shell/board-request.test.ts`: with `evenOdd` forced on at Calm and Tricky, the resulting `BoardParams` MUST NOT carry the flag and the board MUST be byte-identical to today's (FR-004).
- [X] T028 [P] [US2] Save/restore round trip on an even/odd board in `src/platform/in-progress-board.test.ts` — the params travel with the save, so it must resume as the even/odd board it was (FR-008).

**Checkpoint**: the feature is reachable, opt-in, and provably inert everywhere else.

---

## Phase 5: User Story 3 — Learn what E and O mean (P2)

**Goal**: A player meeting an `E` tile finds it explained where the other clue
forms are.

**Independent test**: Open How to play; the E/O forms appear beside `n`, `{n}`
and `-n-`.

- [X] T029 [US3] Add the two forms to `CLUE_FORMS` in `src/ui/gameplay/how-to-play-content.tsx`, in the existing voice (the neighbours read "water tiles touching this hex", "that water is all in one run").
- [X] T030 [P] [US3] Update `e2e/how-to-play.spec.ts` for the new entries — 010 touched this same file when it added the `{n}`/`-n-` row.

---

## Phase 6: User Story 4 — Share the exact board (P3)

**Goal**: The board label stays a complete description of the board.

**Independent test**: Paste an even/odd board's label into seed entry and get the
same board.

- [X] T031 [US4] In `src/ui/gameplay/board-label.ts`: print `evenodd` when the toggle is on, following the `hints` line. It must be one word — `parseSeedEntry` splits on `/`, so `even/odd` would arrive as two tokens and could never round-trip.
- [X] T032 [US4] In `src/game/board-source/seed-entry.ts`: add a `matchEvenOdd` token reader accepting `evenodd` / `even-odd` and `noevenodd` / `no-even-odd`, mirroring `matchHints`, and thread it into `parseSeedEntry`'s loop and its `endlessClues` call.
- [X] T033 [P] [US4] Round-trip test in `src/game/board-source/seed-entry.test.ts`: every board label parses back to the same `BoardParams`, including combinations with a shore and edge hints (SC-005).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T034 [P] Extend `src/core/perf.test.ts` to cover Large/Deep with `evenOdd` on, inside the existing 2000 ms budget (SC-006).
- [X] T035 Review density by eye on a real Large Deep board: ~⅓ of clues showing E/O may read as mush. The spec names tuning as a non-goal, so the outcome here is a recorded judgement (and a follow-up feature if needed), not a code change smuggled into this slice.
- [X] T036 [P] Update `CHANGELOG.md` (dated entry, newest first, with a "part worth explaining" section) and `STATUS.md` test counts.
- [X] T037 Full verification per Principle V: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, `npm run validate:curated` — and confirm the curated pack revalidates **unchanged**.
- [X] T038 Read back the whole diff for scope creep and leftovers; confirm no probe script or debug logging survives.

---

## Dependencies

```text
Phase 1 (T001-T003)  ── guards first, blocks everything
        ↓
Phase 2 (T004-T017)  ── T004+T006 one commit; T008 before T009; T009 before T010/T011/T012
        ↓                T014 before T015; T015 before T016/T017
   ┌────┴─────┬──────────┬──────────┐
Phase 3     Phase 4    Phase 5    Phase 6
(US1)       (US2)      (US3)      (US4)
   └────┬─────┴──────────┴──────────┘
        ↓
Phase 7 (T034-T038)
```

Phases 3–6 are independent of each other once Phase 2 lands. Phase 4 is what makes
the feature *reachable by a player*, so despite US1 being the mechanic, US2 is what
turns it into something shippable.

## Parallel opportunities

- **Phase 2**: T005 and T007 run alongside the solver work; T010, T011 and T013 are independent files once T009 exists.
- **Phase 3**: T019, T021 and T022 are three different files.
- **Phase 4**: T024, T025 and T028 touch unrelated modules.
- **Across phases**: once Phase 2 is committed, Phases 3, 5 and 6 can proceed concurrently — different files, no shared state.

## Implementation strategy

**MVP scope is Phases 1–3.** That is a bigger MVP than Spec-Kit's usual "just
US1", and deliberately so: US1 is the mechanic itself, and an engine cannot show a
clue form it cannot generate, verify or serialize. Phases 1–3 produce a Deep board
that renders E/O and completes guess-free, reachable via a seed token or dev hook.

**Then Phase 4** to make it reachable from Home, which is the point at which it is
worth shipping to players. Phases 5 and 6 are polish on a working mechanic and can
land in either order.

**Stop-and-reassess trigger**: if T016 fails to reproduce the measured 34.5%, do
not tune the generator to chase it. The number came from a probe against the real
solver, so a large gap means the implementation diverges from what was measured —
find out where before building anything on top of it.
