---
description: "Task list for the Gameplay & Board feature"
---

# Tasks: Gameplay & Board — The Playable Screen

**Input**: Design documents from `specs/002-gameplay-board/`

**Prerequisites**: plan.md, spec.md. Cross-feature: **001 puzzle-engine** (DONE — `generateBoard`, `solve`, `serializeBoard`, seed codes, the `Board`/`Cell` model) and **008 persistence** (the `SaveStore` seam for autosave/resume — treat its interface as available). Board source on "Next board" comes from **004 board-modes**; control/comfort defaults from **006 settings** (both consumed as seams).

**Tests**: INCLUDED (Constitution VIII — this project requires tests; the generic template's "tests optional" default does **not** apply). Vitest unit tests co-located as `src/game/*.test.ts` / `src/render/*.test.ts` cover the pure logic (marks, undo/redo, pool/board completion, save round-trip) — write-first where practical. Playwright e2e under `e2e/` covers the critical play-a-board path (repo already uses `e2e/` + `playwright.config.ts`).

**Organization**: Grouped by the spec's user stories in priority order. All three P1 stories (US1–US3) form the core loop; US1 is the minimal playable MVP. Gameplay consumes **only** the engine's public API and never re-implements solving.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US5 from spec.md (only on user-story-phase tasks)
- Paths are exact. New code lands under `src/game/` (pure session logic), `src/render/` (Canvas 2D), `src/ui/gameplay/` (React chrome), `src/workers/` (off-thread generation)

---

## Phase 1: Setup

**Purpose**: Module skeletons + guardrails for the new `game` / `render` / `ui.gameplay` / `workers` surfaces

- [ ] T001 Create the file skeletons with typed stubs + exports per plan.md: `src/game/{session,pools,creatures}.ts`, `src/render/{board-renderer,hit-test,animations}.ts`, `src/ui/gameplay/{GameplayScreen.tsx,TopBar.tsx,CompletePanel.tsx,PoolToast.tsx}`, `src/workers/generate.worker.ts`, and re-export from the existing `src/game/index.ts` + `src/render/index.ts` + `src/ui/index.ts`
- [ ] T002 [P] Add a portability guard test asserting `src/game/` is DOM-free and React-free (no `window`/`document`/`React` imports) in `src/game/purity.test.ts` (mirrors the engine's `core/purity.test.ts`)
- [ ] T003 [P] Add a shared test fixture: a fixed-seed small solved board (via `generateBoard`) plus a `makeSession(board)` helper, in `src/game/test-helpers.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared spine every story builds on — load a board off-thread, the pure `PlaySession` skeleton, the Canvas renderer + hit-test, and the screen host that wires them together.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [ ] T004 [P] Off-main-thread generation: a `generateBoard` wrapper in `src/workers/generate.worker.ts` plus a promise-based client (`loadBoard(params): Promise<Board>`) that posts `BoardParams` and resolves the engine `Board`, in `src/game/board-loader.ts` (engine research note R9)
- [ ] T005 [P] `PlaySession` skeleton in `src/game/session.ts`: build from a `Board`; hold `marks: Map<string, Mark>` where `Mark = 'water' | 'rock' | 'unknown'`; expose read-only state accessors + a `Mark` type export; no mutation logic yet
- [ ] T006 [P] Canvas 2D renderer scaffold in `src/render/board-renderer.ts`: a `BoardRenderer` interface + impl doing pointy-top axial→pixel layout, fit-to-viewport scaling (up to ~250 cells) with pan/zoom, and drawing each present cell by state (unknown / water / rock / clue) using Tailwind `@theme` design tokens (no hardcoded hex)
- [ ] T007 [P] Pointer hit-testing in `src/render/hit-test.ts`: canvas coords → cell key + hovered cell (inverse of the layout math), with a unit test on a known layout in `src/render/hit-test.test.ts`
- [ ] T008 `GameplayScreen` host in `src/ui/gameplay/GameplayScreen.tsx`: mount a `<canvas>`, load a board via `board-loader` (loading state), construct the `PlaySession`, and drive an initial render through `BoardRenderer` (depends on T004–T007)

**Checkpoint**: a board generates off-thread and renders to the canvas; pointer→cell mapping works — story work can begin.

---

## Phase 3: User Story 1 — Deduce and mark a board (Priority: P1) 🎯 MVP

**Goal**: The player marks unknown cells water/rock via clicks (cycle/clear), clues render with `{}` / `--` framing and line totals in the margin.

**Independent Test**: Load a known board, click cells, confirm the visible state updates and clues render correctly.

- [ ] T009 [P] [US1] Unit tests (write first): left-click cycles unknown→water→unknown, right-click sets rock (type swaps), clear works, and marking a `given`/clue cell is a no-op — in `src/game/session.test.ts`
- [ ] T010 [US1] Implement mark mutation on `PlaySession`: `applyMark(key, kind)` with toggle/cycle/clear semantics + the `given`-cell guard, returning updated immutable state, in `src/game/session.ts` (makes T009 pass) — FR-002, FR-003
- [ ] T011 [P] [US1] Clue rendering in `src/render/board-renderer.ts`: draw adjacency numbers with `{}` / `--` connectivity framing and render line/edge totals just outside their row/diagonal — FR-004
- [ ] T012 [US1] Wire pointer input in `src/ui/gameplay/GameplayScreen.tsx`: left-click→water, right-click→rock via `hit-test` → `applyMark` → redraw; suppress the context menu; read the control mapping from the settings seam (006) defaulting to left=water/right=rock — FR-002 (depends on T007, T010, T011)
- [ ] T013 [P] [US1] `TopBar` in `src/ui/gameplay/TopBar.tsx`: board label/seed, a progress indicator (pools found / waterline), and a pause/menu control; no timer unless enabled in settings — FR-009

**Checkpoint**: MVP — a real board renders and is fully markable with correctly-framed clues. Playable end of the P1 core loop begins here.

---

## Phase 4: User Story 2 — Reward for a solved pool (Priority: P1)

**Goal**: When a connected water pool is fully and correctly marked, it animates once and a creature appears with a soft sound.

**Independent Test**: Correctly mark all cells of one pool; the pool-complete animation + creature appears exactly once, never before the pool is fully correct, and reverts on unmark.

- [ ] T014 [P] [US2] Connected-water-pool enumeration in `src/game/pools.ts`: flood-fill over the board's `present` topology using the engine's public hex-adjacency, returning the pools of the hidden solution, with a unit test in `src/game/pools.test.ts`
- [ ] T015 [P] [US2] Creature mapping in `src/game/creatures.ts`: pool size/rarity → `creatureId` (the table shared with Journal 005), with a unit test in `src/game/creatures.test.ts`
- [ ] T016 [P] [US2] Unit tests (write first) for pool-completion on `PlaySession`: fires once when every pool cell is correctly water (and no bounding cell is mis-marked water), does not fire early, reverts cleanly on unmark, and never duplicates on re-completion — in `src/game/session.test.ts` — SC-001
- [ ] T017 [US2] Implement pool-completion tracking on `PlaySession`: after each mark, compute newly-completed pools, maintain a `revealed` set, emit each reveal once, and revert it when the pool is broken, in `src/game/session.ts` (makes T016 pass) — FR-005 (depends on T014, T015)
- [ ] T018 [P] [US2] Pool-complete animation in `src/render/animations.ts`: shimmer + creature-hop, `requestAnimationFrame`-driven and gated by reduced-motion, plus drawing the creature (crab sprite; styled placeholder for others) via `board-renderer`
- [ ] T019 [US2] `PoolToast` ("A crab joins your journal") + soft SFX trigger in `src/ui/gameplay/PoolToast.tsx`, wired to `PlaySession` reveal events in `GameplayScreen`; degrades silently when muted/absent (depends on T017, T018)

**Checkpoint**: the reward loop fires — creatures bloom on solved pools, exactly once, reversibly (SC-001).

---

## Phase 5: User Story 3 — Complete the board (Priority: P1)

**Goal**: When every cell is correctly resolved, the shore settles and a calm panel offers Next board / Journal / Home.

**Independent Test**: Correctly solve an entire small board; the completion panel appears with the three actions.

- [ ] T020 [P] [US3] Unit tests (write first): board-complete is true iff every present cell's mark equals the solution, never before, in `src/game/session.test.ts` — SC-002
- [ ] T021 [US3] Implement board-completion detection + a completion status flag on `PlaySession` in `src/game/session.ts` (makes T020 pass) — FR-006
- [ ] T022 [P] [US3] `CompletePanel` ("The tide's in.") with Next board / Journal / Home actions in `src/ui/gameplay/CompletePanel.tsx`
- [ ] T023 [US3] Wire completion in `src/ui/gameplay/GameplayScreen.tsx`: on board-complete play the settle then show `CompletePanel`; "Next board" requests a fresh board of the same size/difficulty from the board source seam (004) via `board-loader` — FR-013 (depends on T021, T022)

**Checkpoint**: the P1 core loop is closed — solve → panel → next board (SC-002).

---

## Phase 6: User Story 4 — Undo, redo, and never lose progress (Priority: P2)

**Goal**: Every mark is undoable/redoable; leaving and returning restores the exact board state via continuous autosave.

**Independent Test**: Make several marks, undo/redo them; reload the screen and confirm the identical marks, progress, and revealed creatures return.

- [ ] T024 [P] [US4] Unit tests (write first): undo reverts one mark at a time, redo re-applies, a new mark clears the redo stack, undo past the start is a no-op, and `revealed` stays consistent across undo/redo — in `src/game/session.test.ts` — FR-007
- [ ] T025 [US4] Implement the undo/redo history on `PlaySession` (mark stack + pointer, revealed-set kept consistent) in `src/game/session.ts` (makes T024 pass)
- [ ] T026 [US4] Unit tests (write first): session serialize → `InProgressBoard` shape `{ v, request, marks, revealed }` and restore round-trips to an identical resumed session (fresh undo stack per plan) — in `src/game/session.test.ts` — SC-003
- [ ] T027 [US4] Implement `serialize()` / `restore()` on `PlaySession` to the `InProgressBoard` record (board regenerated from `request`; only player state stored) in `src/game/session.ts` (makes T026 pass) — FR-008
- [ ] T028 [US4] Autosave + resume wiring in `src/ui/gameplay/GameplayScreen.tsx`: debounced `SaveStore.set` on every change and restore-on-mount via `SaveStore.get`, strictly through the platform seam (008) — never `localStorage` directly (depends on T027)
- [ ] T029 [P] [US4] Undo/redo controls in `src/ui/gameplay/TopBar.tsx`: buttons + keyboard (Ctrl+Z / Ctrl+Shift+Z), disabled at the ends of the stack (depends on T025)

**Checkpoint**: no progress is ever lost — undo/redo and exact restore across reloads (SC-003).

---

## Phase 7: User Story 5 — Optional teaching + comfort aids (Priority: P3)

**Goal**: Hovering a cell can softly highlight the cells/line it informs (toggleable); an optional gentle nudge gives a faint ripple on an incorrect mark — never punishing.

**Independent Test**: Enable hover-highlight and nudge; hover a clue (related cells highlight); make a wrong mark (faint ripple, no penalty, mark still applied).

- [ ] T030 [P] [US5] Hover-informs computation in `src/game/highlight.ts`: given a hovered cell, return the cells/line it informs (the neighbor ring for an adjacency clue, the axis line for a line total), pure, with a unit test in `src/game/highlight.test.ts` — FR-010
- [ ] T031 [US5] Render the soft hover-highlight overlay in `src/render/board-renderer.ts` + toggle wiring in `GameplayScreen` (default per settings 006, reduced-motion aware) (depends on T030)
- [ ] T032 [US5] Mis-mark nudge in `src/render/animations.ts` + `GameplayScreen` wiring: when nudge is enabled and a mark ≠ the solution, play a faint ripple; the mark is still applied with no counter or lockout — FR-011, SC-005

**Checkpoint**: comfort aids widen accessibility without adding pressure.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T033 [P] Performance: dirty-region redraw (not a full repaint per frame) verified to hold ~60fps interaction on a ~250-cell board, in `src/render/board-renderer.perf.test.ts` — SC-004
- [ ] T034 [P] Accessibility: colorblind-safe water/rock distinction (shape/pattern beyond color) and reduced-motion honored across every animation, asserted in `src/render/animations.test.ts` — FR-012
- [ ] T035 Edge-case tests in `src/game/session.test.ts`: marking a `given` cell is a no-op, rapid click/drag toggles each cell predictably (no accidental double-toggle), and completing the board mid pool-animation still resolves the panel — edge cases from spec
- [ ] T036 [P] Playwright e2e in `e2e/gameplay.spec.ts`: load a fixed small board, mark it to completion, assert a creature appears and the "The tide's in." panel shows Next / Journal / Home — SC-001, SC-002
- [ ] T037 `npm run typecheck` + `npm run build` + full `npm run test` + `npm run test:e2e` green; add the `CHANGELOG.md` entry for the gameplay screen

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2, blocking)** → **User Stories (Phase 3–7)** → **Polish (Phase 8)**.
- Within Foundational, T004 (loader), T005 (session skeleton), T006 (renderer), T007 (hit-test) are independent files; T008 (screen host) integrates all four.
- **US1** needs Foundational (session skeleton + renderer + hit-test + screen host). **US2** needs US1 (marks drive completion) + pools/creatures. **US3** needs the session marks from US1. **US4** extends the US1–US3 `PlaySession` (undo/redo + serialize) and consumes the 008 seam. **US5** layers on the renderer/hit-test + session.
- The three P1 stories (US1→US2→US3) are the core loop and should land in that order; US4 (P2) and US5 (P3) follow.
- Test tasks for a story are written before/with their implementation and must fail first.

## Parallel Opportunities

- Phase 1: T002 + T003 in parallel after T001.
- Phase 2: T004, T005, T006, T007 are four independent tracks; T008 waits on all.
- US1: T009 (tests) and T011 (clue draw) and T013 (TopBar) touch different files from T010; T012 integrates.
- US2: T014 (pools), T015 (creatures), T016 (tests), and T018 (animations) are independent files; T017 then T019 integrate.
- US3: T020 (tests) + T022 (panel) parallel; T021 then T023 integrate.
- US4: T029 (TopBar controls) parallels the session work once T025 lands.
- Polish: T033, T034, T036 are independent files.

## Implementation Strategy (MVP first)

- **MVP = Phases 1–3 (through US1)**: a board generated off-thread, rendered on the wet-sand canvas, fully markable with correctly-framed clues. Stop and validate — this is the smallest playable slice.
- **P1 core loop = Phases 4–5 (US2 + US3)**: add the pool→creature reward and the board-complete panel. Together with US1 this is the complete "one more pool" loop and the shippable heart of the feature.
- **Then** US4 (P2 — undo/redo + never-lose-progress) and US5 (P3 — comfort aids) incrementally.
- Work on the `002-gameplay-board` branch; commit after each task or logical group; land the `CHANGELOG.md` entry with T037.

## Notes

- Paths: pure session logic under `src/game/` (DOM/React-free, enforced by T002); Canvas + input under `src/render/`; React chrome under `src/ui/gameplay/`; the off-thread generator under `src/workers/`.
- `src/game/` and `src/render/` never touch `localStorage`/Tauri — persistence goes through the 008 `SaveStore` seam (T028); the next board comes from the 004 board source seam (T023).
- Gameplay uses only the engine's **public** API (`generateBoard`, `solve`, the `Board`/`Cell` model, `serializeBoard`); it never re-implements solving. Pool enumeration (T014) is a topology walk over `board.present` via the engine's public hex-adjacency — if that helper isn't exported from `core` yet, expose it there rather than re-deriving geometry in `game`.
- Only the crab art exists today; other creatures render as styled placeholders (T018) until art lands.
- Determinism (Principle XI) is inherited from the engine; the session adds no randomness.
