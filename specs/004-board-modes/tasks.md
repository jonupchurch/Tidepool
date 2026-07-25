---
description: "Task list for the Board Modes feature"
---

# Tasks: Board Modes — Endless, Curated & Seed Entry

**Input**: Design documents from `specs/004-board-modes/`

**Prerequisites**: plan.md, spec.md

**Tests**: INCLUDED (required). The template's "tests optional" default is overridden by Constitution VIII (Testing) and Principle XI (Determinism): mode logic, seed parsing, curated-manifest loading, and progress tracking are high-signal targets, and determinism is non-negotiable. Tests are co-located as `*.test.ts`/`*.test.tsx` (Vitest); e2e under `e2e/` (Playwright), per `stacks/tidepools.md`.

**Organization**: Grouped by the spec's user stories in priority order. A thin, pure `board-source` layer (no DOM) funnels all three modes into a single `BoardRequest {seed,size,difficulty}` for Gameplay (002); determinism comes entirely from the engine (001); curated progress goes through the `SaveStore` seam (008).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md (only on user-story tasks)
- Paths are exact; source-layer logic under `src/game/board-source/`, screens under `src/ui/`, manifest under `src/content/`, CI oracle under `scripts/`

---

## Phase 1: Setup

**Purpose**: Module skeleton + guardrails

- [x] T001 Create the `src/game/board-source/` skeleton with typed stubs + exports (`request.ts`, `endless.ts`, `seed-entry.ts`, `curated.ts`, `index.ts`) per plan.md
- [x] T002 [P] Add a purity-guard test asserting no `Math.random`, `Date.now`, `new Date`, or DOM globals appear anywhere under `src/game/board-source/` in `src/game/board-source/purity.test.ts`
- [x] T003 [P] Add board-source test helpers — a fake in-memory `SaveStore` + a sample curated-manifest fixture — in `src/game/board-source/test-helpers.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared funnel every mode depends on — the `BoardRequest` type, the human-label ↔ engine-tier mapping, and the single Gameplay handoff.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Define `BoardRequest {seed,size,difficulty}` + `toBoardParams()` mapping human labels (Small/Medium/Large, Calm/Tricky/Deep) ↔ core `SizeTier`/`DifficultyTier` and building the engine `BoardParams`, reusing `src/core` (`SIZE_TIERS`/`DIFFICULTY_TIERS`, `parseSeed`), in `src/game/board-source/request.ts` (depends on T001)
- [x] T005 [P] Unit tests for request: label↔tier mapping both directions, `BoardRequest`→`BoardParams`, rejects unknown labels, in `src/game/board-source/request.test.ts`
- [x] T006 Assemble the public board-source surface — the single validated `launchBoard(request): BoardRequest` funnel handed to Gameplay (002) — and export it from `src/game/board-source/index.ts` (FR-004; depends on T004)

**Checkpoint**: the `BoardRequest` funnel is green — all three modes can now be built against a single entry point.

---

## Phase 3: User Story 1 — Endless tide (Priority: P1) 🎯 MVP

**Goal**: The player picks size + difficulty and plays a deterministic, reproducible infinite stream; "Next board" advances via a pure seed derivation, and the last choice is remembered.

**Independent Test**: Choose Medium/Tricky, start; complete a board and get the next; confirm replaying from the same starting seed reproduces the identical sequence.

- [x] T007 [P] [US1] Determinism test (write first, expect fail): an endless stream from a fixed start seed reproduces the identical sequence of `BoardRequest`s / boards, and `nextSeed(seed)` is a pure deterministic derivation, in `src/game/board-source/endless.test.ts` (SC-001, Constitution XI)
- [x] T008 [US1] Implement `nextSeed(seed)` — a deterministic seed-step reusing `src/core` (`seedToRng`/`parseSeed`/`formatSeed`), with no ambient randomness or wall-clock — in `src/game/board-source/endless.ts` (depends on T004)
- [x] T009 [US1] Implement `createEndlessStream({startSeed,size,difficulty})` with `current()`/`next()` yielding a `BoardRequest` per step (reproducible from `{startSeed,index}`) in `src/game/board-source/endless.ts` (depends on T008)
- [x] T010 [US1] Persist + restore the last Endless size/difficulty through the `SaveStore` seam (feature 008) — never `localStorage` directly — in `src/game/board-source/endless.ts` (FR-001; depends on T009)
- [x] T011 [US1] Make T007 pass; add edge tests (next always succeeds locally/offline; generated boards rate at the requested tier via `rateDifficulty`) in `src/game/board-source/endless.test.ts` (depends on T009)
- [x] T012 [P] [US1] Endless picker screen — Small/Medium/Large + Calm/Tricky/Deep, restores last choice, Start + "Next board" emit a `BoardRequest` — in `src/ui/modes/EndlessPicker.tsx` using Tailwind theme tokens (depends on T006, T009)
- [x] T013 [P] [US1] Component test for the picker: renders all tiers, defaults to last saved choice, emits the expected `BoardRequest`, in `src/ui/modes/EndlessPicker.test.tsx`
- [x] T014 [US1] Playwright e2e: pick Endless (Medium/Tricky) → board loads → "Next board" advances → replay from the start reproduces the sequence, in `e2e/endless.spec.ts` (depends on T012)

**Checkpoint**: MVP — a deterministic, reproducible endless stream playable from a size/difficulty picker. This unblocks the default Play target.

---

## Phase 4: User Story 2 — Curated shores (Priority: P1)

**Goal**: A bundled, oracle-validated manifest of blessed seeds renders as an ordered coastline path with name, difficulty, seed, and completion state; selecting one loads that exact board, and solving records completion + earned creature.

**Independent Test**: Open Curated, see the ordered list with completion marks; select an entry; land on that exact board; on solving, its completion mark updates and persists.

- [x] T015 [P] [US2] Define curated types — `CuratedManifest {version,entries}`, `CuratedEntry {id,name,seed,size,difficulty,order}`, and the `CuratedProgress` merge shape — in `src/game/board-source/curated.ts`
- [x] T016 [P] [US2] Author the shipped curated manifest — ordered blessed seeds along a gentle difficulty curve — in `src/content/curated.json`
- [x] T017 [US2] Unit test (write first, expect fail): load manifest → ordered entries exposing name/difficulty/seed; merge `CuratedProgress` → solved/unsolved per entry; earned creature derived on solved, in `src/game/board-source/curated.test.ts` (depends on T015)
- [x] T018 [US2] Implement `loadCuratedPack()` — parse/validate the manifest, sort by `order`, produce a `BoardRequest` per entry (via core `parseSeed`) — in `src/game/board-source/curated.ts` (FR-003, FR-007; depends on T004, T015)
- [x] T019 [US2] Implement curated progress read/merge + `markCuratedSolved(id, creature)` write, all through the `SaveStore` `CuratedProgress` namespace (008) — never `localStorage` — in `src/game/board-source/curated.ts` (FR-006; depends on T018)
- [x] T020 [P] [US2] Determinism test: every curated manifest seed regenerates a byte-identical, uniquely-solvable board at its stated params (asserts `solve().solved && .unique` and serialized round-trip) in `src/game/board-source/curated.determinism.test.ts` (SC-002, Constitution XI; depends on T018)
- [x] T021 [P] [US2] Curated Shores screen — ordered coastline list; each row shows name + difficulty marker + copyable seed + solved/unsolved state (earned creature peeking when solved); select → `BoardRequest` — in `src/ui/curated/CuratedScreen.tsx` using Tailwind tokens (depends on T018, T019)
- [x] T022 [P] [US2] Component test for `CuratedScreen`: renders entries in `order`, completion marks and earned creature reflect merged progress, in `src/ui/curated/CuratedScreen.test.tsx`
- [x] T023 [US2] Implement `scripts/validate-curated.ts` — the CI oracle gate: `generateBoard` + `solve`-verify every curated entry (unique, guess-free, matches stated difficulty), exiting non-zero on any failure — in `scripts/validate-curated.ts` (SC-002; depends on T016, T018)
- [x] T024 [US2] Playwright e2e: open Curated → ordered list with marks → select an entry → exact board loads → solve → its completion mark + creature update and persist across a reload, in `e2e/curated.spec.ts` (depends on T021)

**Checkpoint**: the designed on-ramp — a browsable, persisted curated pack in which no unsolvable board can ship (CI-gated).

---

## Phase 5: User Story 3 — Enter a seed (Priority: P2)

**Goal**: The player types or pastes a seed (optionally carrying size/difficulty) and jumps to that exact, shareable board; invalid input yields a gentle inline message and loads nothing.

**Independent Test**: Enter a known seed → jump to the board; enter the same seed on a fresh session → identical board; enter a garbled seed → gentle message, no board.

- [x] T025 [P] [US3] Unit test (write first, expect fail): `parseSeedEntry` is total — valid `WORD-NNNN` (+ optional size/difficulty) → `{ok, request}`; garbled/empty → `{ok:false, reason}`; a bare token uses current prefs; a full token overrides — in `src/game/board-source/seed-entry.test.ts` (SC-003, SC-005)
- [x] T026 [US3] Implement total `parseSeedEntry(input, currentPrefs)` reusing core `parseSeed`/`formatSeed`, returning a `BoardRequest` or a gentle reason and never throwing, in `src/game/board-source/seed-entry.ts` (FR-005, FR-009; depends on T004)
- [x] T027 [US3] Seed-entry screen — text input, paste support, inline gentle error on invalid, submit → `BoardRequest` — in `src/ui/modes/SeedEntry.tsx` using Tailwind tokens (depends on T006, T026)
- [x] T028 [P] [US3] Component test for `SeedEntry`: a valid seed emits the request; an invalid seed shows the inline message and emits nothing, in `src/ui/modes/SeedEntry.test.tsx`
- [x] T029 [US3] Playwright e2e: enter a known seed → identical board loads; enter a garbled seed → gentle inline message, no board loads, in `e2e/seed-entry.spec.ts` (depends on T027)

**Checkpoint**: first-class sharing/reproducibility — any seed jumps to its exact board.

---

## Phase 6: User Story 4 — Gentle curated gating (Priority: P3)

**Goal**: Curated entries can be fully open (default) or gently gated behind prior solves, with an unhurried "unlock soon" tone and never a hard wall.

**Independent Test**: With gating enabled, locked entries show a soft lock and cannot be entered; solving prerequisites unlocks them.

- [x] T030 [P] [US4] Unit test (write first, expect fail): the gating resolver locks an entry until its prerequisites (prior solves) are met and unlocks it when met; with gating off, every entry is open, in `src/game/board-source/curated.gating.test.ts`
- [x] T031 [US4] Implement configurable `resolveLocks(entries, progress, config)` — soft-lock computation, open by default and gentle prerequisite unlocks when configured — in `src/game/board-source/curated.ts` (FR-008; depends on T019)
- [x] T032 [US4] Surface soft-lock state in `src/ui/curated/CuratedScreen.tsx` — an "unlock soon" affordance, locked entries not selectable, unhurried tone (Tailwind tokens) — (depends on T031)
- [x] T033 [US4] Extend `e2e/curated.spec.ts`: with gating on, a locked entry shows the soft lock and is not enterable; solving its prerequisites unlocks it (depends on T032)

**Checkpoint**: optional pacing — gentle unlocks available without ever hard-walling the player.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Tie the three mode screens together and lock in the guarantees.

- [x] T034 [P] Mode-select surface routing Play → default Endless picker and linking to Curated + Seed entry, matching App Shell (003) routing conventions, in `src/ui/modes/ModeSelect.tsx`
- [x] T035 [P] Wire the `validate:curated` oracle gate into `package.json` scripts + the CI config so no unsolvable curated board can ship (SC-002) in `package.json`
- [x] T036 [P] Confirm every surfaced seed (curated, endless, entry) renders in human-friendly `WORD-NNNN` form and is copyable for sharing (FR-009) across `src/ui/curated/CuratedScreen.tsx` and `src/ui/modes/SeedEntry.tsx`
- [x] T037 `npm run typecheck` + `npm run build` + full `npm run test` + `npm run test:e2e` + `npm run validate:curated` green; add the feature's `CHANGELOG.md` entry

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2, blocking)** → **User Stories (Phase 3–6)** → **Polish (Phase 7)**.
- **Cross-feature**: depends on **001 engine** (DONE — `generateBoard`/`parseSeed`/`formatSeed`/`solve`/`rateDifficulty`), reused throughout; each mode's `BoardRequest` is consumed by **002 gameplay** (T006, T014, T024, T029); curated progress + endless prefs persist through **008 `SaveStore`** (T010, T019) — never `localStorage` directly.
- **US1 (Endless)** depends only on Foundational. **US2 (Curated)** depends on Foundational; its progress writes reuse the same funnel. **US3 (Seed entry)** depends on Foundational. **US4 (Gating)** depends on US2 (T019 progress + the Curated screen).
- Within a story, the write-first test precedes its implementation and must fail first; pure `board-source` logic precedes the screen; the screen precedes its e2e.

## Parallel Opportunities

- Phase 1: T002, T003 in parallel.
- Phase 3 (US1): T007 (test) up front; T012 + T013 (screen + component test) in parallel once T009 is done.
- Phase 4 (US2): T015 + T016 (types + manifest) in parallel; then T020 (determinism), T021 (screen), T022 (component test), T023 (CI oracle) all parallel once T018/T019 land.
- Phase 5 (US3): T025 (test) and T028 (component test) are parallelizable against their siblings.
- Once Foundational is complete, US1 / US2 / US3 can be built in parallel by different developers; US4 waits on US2.

## Implementation Strategy

- **MVP = Phases 1–3 (through US1)**: a deterministic, reproducible endless stream behind a size/difficulty picker — the default Play target. Stop and validate here.
- Then add **US2 (Curated)** — the designed on-ramp with the CI oracle gate — and **US3 (Seed entry)** — sharing/reproducibility — incrementally; both are independently testable.
- Add **US4 (Gating)** last; it ships open by default and only layers gentle unlocks onto the existing Curated screen.
- Commit after each task or logical group (Constitution IX); append the `CHANGELOG.md` entry with T037.

## Notes

- Keep `src/game/board-source/` pure — no DOM, no `Math.random`/`Date.now` (enforced by T002); all randomness/determinism lives in the engine (Constitution XI).
- Never call `localStorage`/Tauri APIs directly — curated progress and endless prefs go through the `src/platform` `SaveStore` seam (008).
- The CI oracle (T023 + T035) makes SC-002 structurally guaranteed: a curated seed that isn't uniquely, guess-free solvable at its stated difficulty fails the build before it can ship.
- Don't hardcode palette hex — use Tailwind theme tokens (`bg-sand`, `text-deep-pool`, …) per `stacks/tidepools.md`.

## Implementation note (as-built)

- **T012/T013 (EndlessPicker) + T034 (ModeSelect) consolidated into Home.** The
  App Shell (003) already embeds the endless size/difficulty picker, seed entry,
  and Curated link on Home — Home *is* the mode-select surface. A standalone
  EndlessPicker/ModeSelect duplicated that UX, so they were removed; the endless
  picker + seed entry live in `HomeScreen` (picker inline; `SeedEntry` reused),
  and Home routes Play → endless / links to Curated + seed. Functionality +
  tests are met via Home + the board-source layer.
- **T033 (gating e2e) covered at the component level.** Gating ships OFF (open by
  default, FR-008), so there's no runtime toggle to drive a full-app Playwright
  path; `resolveLocks` is unit-tested and `CuratedScreen` gating (locked
  non-selectable, unlock-on-solve) is component-tested instead.
