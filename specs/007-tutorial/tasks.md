---
description: "Task list for the Tutorial / How to Play (Onboarding) feature"
---

# Tasks: Tutorial / How to Play — Interactive Onboarding

**Input**: Design documents from `specs/007-tutorial/`

**Prerequisites**: plan.md, spec.md

**Tests**: INCLUDED (test-first). Constitution VIII requires tests and this feature
overrides the template's "optional" default. Vitest unit tests co-located as
`*.test.ts` cover the step machine (advance-on-correct, skip, restart, completion)
and onboarding-state persistence; Playwright e2e under `e2e/` covers the first-run
guided flow (incl. the `-n-` split step) and the skip/replay paths, per `stacks/tidepools.md`.

**Organization**: Grouped by the spec's user stories (US1 = P1/MVP, US2 = P2). The
pure step machine, the tutorial domain types, the curated boards, and the onboarding
persistence seam are shared by both stories, so they live in Foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US2 from spec.md (Setup / Foundational / Polish carry no story tag)
- Paths are exact. Flow logic lives under `src/game/tutorial/`; UI under `src/ui/tutorial/`;
  curated boards under `src/content/`; onboarding persistence under `src/platform/`.

## Cross-feature dependencies

- **Engine (001, built)** — curated boards are fixed seeds resolved via `generateBoard`/`parseSeed` from `src/core` (deterministic, one mechanic each — Constitution XI).
- **Gameplay (002)** — the tutorial reuses the board renderer/input (constrained to the lesson's allowed cells) and the shared nudge; no parallel board implementation.
- **App Shell (003)** — the menu "How-to-play" entry and the first-run offer surface.
- **Settings (006)** — reduced-motion honored on step/reward animations.
- **Persistence (008)** — onboarding state (`unseen | completed | skipped`) via `SaveStore`; consumed through `src/platform/onboarding.ts`, never `localStorage` directly.

---

## Phase 1: Setup

**Purpose**: Tutorial module skeleton + purity guardrail.

- [ ] T001 Create the tutorial module skeleton with typed stubs + exports — `src/game/tutorial/steps.ts`, `src/game/tutorial/flow.ts`, `src/content/tutorial-boards.ts`, `src/ui/tutorial/TutorialScreen.tsx` — and wire the barrels in `src/game/index.ts` and `src/ui/index.ts`, per plan.md
- [ ] T002 [P] Add a purity-guard test asserting no React/DOM imports appear anywhere under `src/game/tutorial/` (flow logic stays portable + testable) in `src/game/tutorial/purity.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared building blocks both stories need — domain types, the deterministic curated boards, the pure step machine, and the onboarding-state seam.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 [P] Define the tutorial domain types — `TutorialStep` (concept, coaching copy, board ref, required cells/actions, highlighted clues), `TutorialFlowState` (steps, current index, status), `OnboardingState` (`unseen | completed | skipped`) — in `src/game/tutorial/steps.ts`
- [ ] T004 [P] Author the fixed curated tutorial boards as fixed seeds (one mechanic each: adjacency count, `{n}` connected, `-n-` split, line/edge total) resolved via `generateBoard`/`parseSeed` from `src/core` in `src/content/tutorial-boards.ts`
- [ ] T005 [P] Unit tests: each curated board is deterministic (same seed → identical `serializeBoard` string) and `solve().solved && .unique`, and its target clue is present/forcing (isolates one mechanic) in `src/content/tutorial-boards.test.ts` (depends on T004)
- [ ] T006 Implement the pure step-machine reducer — `createFlow`, `currentStep`, `advance` (only when the step's required-action predicate is satisfied), `skip`, `reset`, `isComplete` — in `src/game/tutorial/flow.ts` (depends on T003)
- [ ] T007 [P] Unit tests for the generic step machine: `advance` gates on the predicate (rejects otherwise), `skip` → terminal without completion, `reset` → first step, `isComplete` at end in `src/game/tutorial/flow.test.ts` (depends on T006)
- [ ] T008 [P] Implement the onboarding-state seam consuming feature 008 `SaveStore` (read/write `unseen | completed | skipped`; never call `localStorage`/Tauri APIs directly) in `src/platform/onboarding.ts`
- [ ] T009 [P] Unit tests for onboarding persistence: round-trip `completed`/`skipped` and first-run (`unseen`) read via an in-memory fake `SaveStore` in `src/platform/onboarding.test.ts` (depends on T008)

**Checkpoint**: types, deterministic boards, the step machine, and the onboarding seam all green — story work can begin.

---

## Phase 3: User Story 1 — Learn by doing, one concept at a time (Priority: P1) 🎯 MVP

**Goal**: A guided flow over the curated boards teaches each of the four mechanics in sequence — adjacency numbers, mark water/rock, `{n}` connected vs `-n-` split, line/edge totals — gating advance on the correct action with a gentle nudge on a wrong one, and ends with the creature reward + a "play a real board" hand-off.

**Independent Test**: Run the flow start to finish; confirm each step introduces exactly one concept, advances only on the correct action, and completion shows the creature and offers a real board.

### Tests for User Story 1 (write FIRST, ensure they FAIL) ⚠️

- [ ] T010 [P] [US1] Unit test (expect fail): each of the four concept steps advances only on its correct action and rejects a wrong action with a nudge, reaching completion in order, in `src/game/tutorial/steps.test.ts`
- [ ] T011 [P] [US1] Playwright e2e (expect fail): the full guided flow teaches each mechanic in order, the `-n-` split step requires a non-adjacent water placement, and completion reveals the creature + the "play a real board" offer, in `e2e/tutorial-flow.spec.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Author the ordered concept steps with per-step required-action predicates + warm coaching copy (adjacency → mark water/rock → `{n}` connected vs `-n-` split → line/edge total), referencing the curated boards, in `src/game/tutorial/steps.ts` (depends on T004, T006)
- [ ] T013 [US1] Render the coaching card + progress dots and drive the flow machine, reusing feature 002's board renderer/input constrained to the step's allowed cells/actions (Tailwind design tokens, no hardcoded hex), in `src/ui/tutorial/TutorialScreen.tsx` (depends on T012)
- [ ] T014 [US1] Wire wrong-action feedback to feature 002's shared nudge — gentle, non-punishing, no advance until the correct action — in `src/ui/tutorial/TutorialScreen.tsx`
- [ ] T015 [P] [US1] Implement the completion payoff — creature-reward reveal + "play a real board" hand-off — in `src/ui/tutorial/TutorialReward.tsx`
- [ ] T016 [US1] On completion, persist `completed` through `src/platform/onboarding.ts` from the tutorial UI in `src/ui/tutorial/TutorialScreen.tsx`
- [ ] T017 [US1] Honor reduced-motion (feature 006) — minimize step/reward animations — in `src/ui/tutorial/TutorialReward.tsx`
- [ ] T018 [US1] Make T010/T011 pass; add the split-step edge case (non-adjacent placement required to advance; an adjacent placement is nudged, not accepted) in `src/game/tutorial/steps.test.ts`

**Checkpoint**: MVP — a first-time player can complete the interactive tutorial (all four mechanics, incl. `-n-`) and reach the creature reward + real-board hand-off.

---

## Phase 4: User Story 2 — Skip and revisit (Priority: P2)

**Goal**: The player can skip the tutorial at any step (never blocked from reaching the game), it is auto-offered once on first run, and it can be reopened from the menu (How-to-play) to rerun cleanly from the start.

**Independent Test**: Skip mid-flow → land in the game; later open How-to-play from the menu → the tutorial reruns from step 1; first run offers once, completed/skipped runs do not.

### Tests for User Story 2 (write FIRST, ensure they FAIL) ⚠️

- [ ] T019 [P] [US2] Playwright e2e (expect fail): Skip mid-flow closes the tutorial and reaches the game; opening How-to-play from the menu reruns the tutorial from the start, in `e2e/tutorial-skip-revisit.spec.ts`
- [ ] T020 [P] [US2] Unit test (expect fail): first-run offer logic — offer when onboarding is `unseen`, suppress when `completed` or `skipped` — in `src/game/tutorial/first-run.test.ts`

### Implementation for User Story 2

- [ ] T021 [US2] Implement the `useTutorial` hook — `open` (reset to the first step for a clean rerun), `skip` (persist `skipped` via the onboarding seam), `close`, and a derived `firstRunOffer` flag (true only when onboarding is `unseen`) — in `src/ui/tutorial/useTutorial.ts` (depends on T006, T008)
- [ ] T022 [US2] Add the always-available Skip control wired to `useTutorial().skip` (present on every step, never hard-blocks) in `src/ui/tutorial/TutorialScreen.tsx` (depends on T021)
- [ ] T023 [P] [US2] Add the first-run auto-offer surface (shown once when `unseen`, always skippable, never blocks reaching the game) driven by `useTutorial().firstRunOffer`, mounted by the app shell (003), in `src/ui/tutorial/FirstRunOffer.tsx` (depends on T021)
- [ ] T024 [P] [US2] Add the menu "How-to-play" entry that reruns the tutorial from the start via `useTutorial().open` (consumed by the app shell 003 menu) in `src/ui/tutorial/HowToPlayMenuItem.tsx` (depends on T021)
- [ ] T025 [US2] Make T019/T020 pass; add a revisit-cleanliness test (reopening after completion resets to the first step with fresh state) in `src/game/tutorial/first-run.test.ts`

**Checkpoint**: US1 + US2 both work — the tutorial teaches, is always skippable, offers once, and reruns cleanly from the menu.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T026 [P] Accessibility pass on the tutorial overlay — focus trap, keyboard advance/skip, aria labels for the coaching card + progress dots, respects reduced-motion — in `src/ui/tutorial/TutorialScreen.tsx`
- [ ] T027 [P] Verify the single consolidated flow (FR-007): the tutorial reuses feature 002's renderer/input with no parallel board impl and no leftover card-only path — assertion test in `src/ui/tutorial/TutorialScreen.test.tsx`
- [ ] T028 [P] Full verification — `npm run typecheck`, `npm run build`, `npm run test`, `npm run test:e2e` all green — and add the tutorial feature entry to `CHANGELOG.md`
- [ ] T029 Update `STATUS.md` (007-tutorial status) and run the plan's `quickstart.md` validation steps

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2, blocking)** → **User Stories (Phase 3–4)** → **Polish (Phase 5)**.
- Within Foundational, `steps.ts` types (T003) gate the step machine (T006); the curated-boards track (T004→T005) and the onboarding-seam track (T008→T009) are independent of each other and of the types/machine track.
- **US1** depends on all of Foundational (curated boards T004, step machine T006, onboarding seam T008) plus feature 002's renderer/nudge. **US2** depends on Foundational + US1's `TutorialScreen.tsx`; its crux (skip UI, first-run offer, menu revisit) is additive and independently testable.
- Cross-feature: 001 engine (boards) and 008 persistence (`SaveStore`) are hard prerequisites reflected in Foundational; 002 gameplay (renderer/input/nudge) is required from US1's UI onward; 003 app shell mounts the first-run offer + menu entry (US2); 006 settings supplies reduced-motion (US1 T017 + Polish T026).
- Tests for a task are written before/with its implementation and must fail first (Constitution VIII).

## Parallel Opportunities

- Phase 1: T002 (purity guard) is independent of T001's other concerns.
- Phase 2: three independent parallel tracks — the boards track (T004 + T005), the onboarding-seam track (T008 + T009), and the types→machine track (T003 → T006 → T007). Kick off T003/T004/T008 together.
- US1: the two test-first tasks T010 + T011 run in parallel; T015 (`TutorialReward.tsx`) is parallel to the `TutorialScreen.tsx` work (T013/T014/T016).
- US2: test-first T019 + T020 in parallel; after T021, the offer surface (T023) and the menu entry (T024) are parallel (different files).
- Polish: T026, T027, T028 are independent files.

## Implementation Strategy

- **MVP = Phases 1–3 (through US1)**: the interactive tutorial that teaches all four mechanics (incl. the previously-untaught `-n-` split) and pays off with the creature reward + real-board hand-off. Stop and validate here — it satisfies SC-001/SC-003/SC-005.
- Then add **US2** (skip + first-run offer + menu revisit) incrementally — it layers onto the same `TutorialScreen` without changing the teaching flow, satisfying SC-002/SC-004.
- Finish with Polish (accessibility, single-flow verification, full green + CHANGELOG/STATUS).
- Commit after each task or logical group; the tutorial's `CHANGELOG.md` entry lands with T028.

## Notes

- Flow logic under `src/game/tutorial/` stays pure (no React/DOM — enforced by T002); UI under `src/ui/tutorial/`; curated boards under `src/content/`; persistence only through `src/platform/onboarding.ts` (never raw `localStorage`).
- Curated tutorial boards are fixed seeds resolved by the built engine (Constitution XI) so guided steps never drift; T005 pins their determinism + solvability.
- The `-n-` split step is the gap the mockups left static — it is taught interactively (T012) and verified by both a unit edge case (T018) and e2e (T011).
- [P] tasks = different files, no dependency on an incomplete task; [US#] labels map tasks to stories for traceability; Setup/Foundational/Polish carry no story tag.
