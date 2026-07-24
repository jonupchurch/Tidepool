---
description: "Task list for the App Shell feature"
---

# Tasks: App Shell — Home, Splash & Pause

**Input**: Design documents from `specs/003-app-shell/`

**Prerequisites**: plan.md, spec.md (this feature has no research.md / data-model.md / contracts/ — the spec's user stories + plan's structure are the organizing inputs)

**Tests**: INCLUDED (required). Per Constitution VIII, tests are mandatory here (this overrides the template's "optional" default). Shell logic that carries real signal — the navigation reducer, resume-visibility, and prefs persistence — is unit-tested (Vitest); shell surfaces are component-tested with `@testing-library`; the critical launch → navigate → resume, Pause → Resume, and theme-persist paths are Playwright e2e. Unit/component tests are co-located as `src/ui/shell/*.test.ts(x)`; e2e specs live under `e2e/`.

**Organization**: Grouped by the spec's user stories (US1–US5) in priority order. The navigation reducer, shell types, and the persistence seam are shared prerequisites, so they live in Foundational. Home accretes features across US1/US2/US5 (it is the aggregating surface) — each story stays independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different file, no dependency on an incomplete task)
- **[Story]**: US1–US5 from spec.md (only on user-story tasks; not on Setup/Foundational/Polish)
- Paths are exact; all shell code lives under `src/ui/shell/`, e2e under `e2e/`

## Cross-feature seams (treated as available)

- **Persistence (008)** — shell prefs + resume snapshot are read/written through `SaveStore` in `src/platform`; the shell consumes this seam and **never** calls `localStorage` directly.
- **Gameplay (002)** — the screen Play/Resume open, and the source of the Pause trigger; the shell launches/resumes a play session via a launch callback.
- **Board Modes (004)** — Play resolves a size/difficulty request; the shell renders the entry controls, 004 owns the board-source behavior.
- **Journal (005)** — Home's light stats (boards solved, recent creature).
- **Settings (006)** — owns the Day / Night Tide theme token values; the shell only stores + applies the choice via `data-theme`.

---

## Phase 1: Setup

**Purpose**: Module skeleton + guardrails

- [ ] T001 Create the `src/ui/shell/` file skeleton with typed stubs + exports (`AppShell.tsx`, `nav.ts`, `types.ts`, `shell-store.ts`, `HomeScreen.tsx`, `SplashScreen.tsx`, `PauseOverlay.tsx`, `ResumeCard.tsx`, `index.ts`) per plan.md
- [ ] T002 [P] Add a React Testing Library render helper + shell test fixtures (fake `SaveStore`, sample `ResumeSnapshot`, sample `ShellPrefs`) in `src/ui/shell/test-helpers.tsx`
- [ ] T003 [P] Add a design-token guard test asserting no hardcoded hex colors appear in `src/ui/shell/*.tsx` (Tailwind theme tokens only — `bg-sand`, `text-deep-pool`, `font-display`) in `src/ui/shell/tokens.guard.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared building blocks every story needs — the shell types, the pure navigation reducer, the persistence seam, and the screen-swapping shell container.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Define shell types — `Screen` union (Home / Gameplay / Curated / Journal / Settings / Tutorial / Splash), `ShellPrefs` (theme, mute), `ResumeSnapshot` (progress, seed, size, difficulty) — in `src/ui/shell/types.ts`
- [ ] T005 [P] Implement the pure navigation reducer — `navReducer(state, action)` for navigate/back over a bounded history, guarding against duplicate/stuck transitions on rapid double-activation — in `src/ui/shell/nav.ts` (depends on T004)
- [ ] T006 [P] Unit tests for the nav reducer: navigate to each screen, back restores prior context, rapid double-activation yields no duplicate/stuck state, in `src/ui/shell/nav.test.ts` (depends on T005)
- [ ] T007 [P] Implement the shell persistence adapter over `SaveStore` (008) — `loadShellPrefs`/`saveShellPrefs` + `getResumeSnapshot()`; consume `SaveStore`, never `localStorage` directly — in `src/ui/shell/shell-store.ts` (depends on T004)
- [ ] T008 [P] Unit tests for the shell-store adapter against a fake `SaveStore`: prefs round-trip, resume snapshot present vs absent on cold start, in `src/ui/shell/shell-store.test.ts` (depends on T007)
- [ ] T009 Implement the `AppShell` container — host nav state via the reducer, swap the active screen, and apply the persisted theme via a `data-theme` attribute on boot — in `src/ui/shell/AppShell.tsx` (depends on T005, T007)
- [ ] T010 Mount `AppShell` as the app root, replacing the scaffold, in `src/App.tsx` (depends on T009)

**Checkpoint**: navigation reducer, prefs/resume seam, and the screen-swapping shell are green — individual screens can now be built.

---

## Phase 3: User Story 1 — Land on Home and start playing (Priority: P1) 🎯 MVP

**Goal**: A warm shoreline Home renders the primary Play action plus all secondary entries; Play drops the player into Gameplay at their last-used size/difficulty (defaults if none).

**Independent Test**: Open the app, land on Home, click Play, arrive in Gameplay with the expected size/difficulty.

- [ ] T011 [P] [US1] Component tests (write first, expect fail): Home renders Play + all secondary entries (Curated, Endless picker, Seed entry, Journal, Settings, How-to-play) and each is reachable; Play navigates to Gameplay requesting the last-used size/difficulty (defaults when none) — in `src/ui/shell/HomeScreen.test.tsx`
- [ ] T012 [US1] Implement `HomeScreen` — warm shoreline layout with a primary Play button + the secondary entry controls, using Tailwind theme tokens per the `resources/` style guide — in `src/ui/shell/HomeScreen.tsx`
- [ ] T013 [US1] Implement the Play action — resolve last-used size/difficulty from `shell-store` (default when none), hand off to board-modes (004) and open Gameplay (002) via the shell launch callback, then navigate to Gameplay — in `src/ui/shell/HomeScreen.tsx` (depends on T007, T012)
- [ ] T014 [US1] Register Home as the shell's default screen and wire the Gameplay launch/navigation handoff in `AppShell` — in `src/ui/shell/AppShell.tsx` (depends on T009, T012)
- [ ] T015 [US1] Make T011 pass; add the cold-start test — Home renders warm defaults with zero saved data (no crash, no empty grey void, SC-005) — in `src/ui/shell/HomeScreen.test.tsx` (depends on T012, T013)
- [ ] T016 [US1] E2E: cold open → Home → click Play reaches a board in ≤2 clicks (SC-001), in `e2e/home-play.spec.ts` (depends on T014)

**Checkpoint**: MVP — the player lands on Home and reaches a playable board. Stop and validate here.

---

## Phase 4: User Story 2 — Resume an in-progress board (Priority: P2)

**Goal**: When a board is in progress, Home shows a "Continue your pool" card (mini preview, progress, seed) that returns the player to the exact saved state; Home also surfaces light stats. Both omit gracefully with no saved data.

**Independent Test**: Leave a board mid-solve, return to Home, use the resume card, land on the exact saved board.

- [ ] T017 [P] [US2] Component tests (write first, expect fail): `ResumeCard` renders progress + seed and its activation restores the saved board; the card is absent when no in-progress board exists — in `src/ui/shell/ResumeCard.test.tsx`
- [ ] T018 [US2] Implement `ResumeCard` — mini board preview, progress, and seed from `getResumeSnapshot()`, using theme tokens — in `src/ui/shell/ResumeCard.tsx` (depends on T007)
- [ ] T019 [US2] Render the resume card on Home iff an in-progress snapshot exists, wiring its activation to launch Gameplay restoring that exact saved state — in `src/ui/shell/HomeScreen.tsx` (depends on T012, T018)
- [ ] T020 [US2] Make T017 pass; add Home's light-stats block (boards solved, most-recent creature) sourced from persistence/journal (008 / 005) with a warm zero-state (FR-004) — in `src/ui/shell/HomeScreen.tsx` (depends on T019)
- [ ] T021 [US2] E2E: leave a board mid-solve → return to Home → resume card restores the exact saved board (the launch → navigate → resume path, SC-002) — in `e2e/resume.spec.ts` (depends on T019)

**Checkpoint**: resume + stats appear iff there is data to show, and resume restores the exact board.

---

## Phase 5: User Story 3 — Splash / loading (Priority: P2)

**Goal**: A calm splash shows the wordmark + crab, a themed loader, and a rotating flavor tip; it sets the unhurried tone and dismisses as soon as the target screen is ready.

**Independent Test**: Trigger the splash; confirm wordmark, loader animation, and a rotating tip appear; it dismisses when ready.

- [ ] T022 [P] [US3] Component tests (write first, expect fail): Splash shows the wordmark, crab, a themed loader, and a rotating tip that cycles; it fires `onReady`/dismisses when the target is ready — in `src/ui/shell/SplashScreen.test.tsx`
- [ ] T023 [P] [US3] Add the rotating flavor-tips constant + interval cycling (cleared on unmount) in `src/ui/shell/tips.ts`
- [ ] T024 [US3] Implement `SplashScreen` — wordmark + crab asset + themed loader + rotating tip, reduced-motion gated, no progress percentage — in `src/ui/shell/SplashScreen.tsx` (depends on T023)
- [ ] T025 [US3] Wire Splash into `AppShell` as the initial view, dismissing to Home/Gameplay when ready — in `src/ui/shell/AppShell.tsx` (depends on T009, T024)
- [ ] T026 [US3] Make T022 pass; add the reduced-motion assertion (splash animation minimized, FR-009) — in `src/ui/shell/SplashScreen.test.tsx` (depends on T024)

**Checkpoint**: the splash covers load gracefully and never blocks longer than needed.

---

## Phase 6: User Story 4 — Pause from a board (Priority: P2)

**Goal**: From Gameplay, a soft Pause overlay freezes the board under a scrim and offers Resume, New board, Restart this board, Settings, and Home, with a "Your board is saved." reassurance; Resume returns to the exact board.

**Independent Test**: Open Pause from Gameplay; confirm the five actions + reassurance; Resume returns to the exact board.

- [ ] T027 [P] [US4] Component tests (write first, expect fail): `PauseOverlay` shows Resume, New board, Restart this board, Settings, Home + the "Your board is saved." line; Resume fires resume-to-board, Home navigates Home leaving the board saved — in `src/ui/shell/PauseOverlay.test.tsx`
- [ ] T028 [US4] Implement `PauseOverlay` — a scrim over the frozen board with the five actions + reassurance line, theme tokens, reduced-motion gated — in `src/ui/shell/PauseOverlay.tsx`
- [ ] T029 [US4] Wire Pause open/close into the shell — open from the Gameplay top-bar trigger, freeze the board under the scrim, and route each action (Resume / New board / Restart / Settings / Home) — in `src/ui/shell/AppShell.tsx` (depends on T009, T028)
- [ ] T030 [US4] Make T027 pass; add the close/reopen safe-state test (Pause open → reopen returns to Home or the saved board, progress intact — SC-003) — in `src/ui/shell/PauseOverlay.test.tsx` (depends on T028, T029)
- [ ] T031 [US4] E2E: open Pause from Gameplay → Resume returns to the exact board; Home leaves the board saved — in `e2e/pause.spec.ts` (depends on T029)

**Checkpoint**: pausing feels safe — Resume always returns the exact board, Home never loses it.

---

## Phase 7: User Story 5 — Global toggles + navigation (Priority: P3)

**Goal**: A mute toggle and a Day/Night (theme) toggle are reachable from Home and persist; navigation between all screens is consistent and calm (soft, reduced-motion-aware transitions), and back-navigation preserves prior context.

**Independent Test**: Toggle mute and theme from Home; navigate across screens and back; state persists.

- [ ] T032 [P] [US5] Component tests (write first, expect fail): the mute + Day/Night toggles on Home flip state and persist via `shell-store`; toggling Night sets `data-theme` app-wide — in `src/ui/shell/toggles.test.tsx`
- [ ] T033 [US5] Implement the mute + Day/Night theme toggles on Home, persisting via `saveShellPrefs` and applying the theme through `AppShell`'s `data-theme` (token values owned by Settings/006, FR-008) — in `src/ui/shell/HomeScreen.tsx` (depends on T007, T009)
- [ ] T034 [US5] Implement calm screen transitions in `AppShell` (CSS opacity/cross-fade) gated by `prefers-reduced-motion`, ensuring back-navigation preserves prior context (FR-007) — in `src/ui/shell/AppShell.tsx` (depends on T009)
- [ ] T035 [US5] Make T032 pass; add E2E — toggle Night on Home persists across reload (SC-004) — in `e2e/theme-persist.spec.ts` (depends on T033)

**Checkpoint**: toggles persist across restarts and every transition is calm + reduced-motion-aware.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T036 [P] Accessibility + reduced-motion sweep across all shell surfaces — keyboard reachability of Home's entries, focus order on Pause/Splash, `prefers-reduced-motion` honored on splash + transitions (FR-009) — in `src/ui/shell/a11y.test.tsx`
- [ ] T037 `npm run typecheck` + `npm run build` + full `npm run test` + `npm run test:e2e` green; confirm the token guard (T003) covers every shell component and Home/Splash/Pause match the `resources/` style guide; add the shell's `CHANGELOG.md` entry

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2, blocking)** → **User Stories (Phase 3–7)** → **Polish (Phase 8)**.
- Within Foundational, `types.ts` (T004) is the shared root; the **nav track** (T005→T006) and the **shell-store track** (T007→T008) run in parallel off it; `AppShell` (T009) is the join and gates `App.tsx` mount (T010).
- **US1 (P1)** depends only on Foundational (esp. nav + shell-store). **US2** builds on US1's Home + the shell-store resume read. **US3** (Splash) depends on `AppShell` and is otherwise independent. **US4** (Pause) depends on `AppShell` and the Gameplay trigger seam. **US5** builds on US1's Home + `AppShell` theme application.
- Cross-feature: all stories consume **008** (`SaveStore`) via `shell-store`; Play/Resume/Pause launch **002** via the shell launch callback; Play resolves **004**; stats read **005**; theme tokens come from **006**. These seams are treated as available.
- Tests for a task are written before/with its implementation and must fail first.

## Parallel Opportunities

- Phase 1: T002, T003 in parallel.
- Phase 2: the nav track (T005+T006) and the shell-store track (T007+T008) are two independent parallel tracks off T004; `AppShell` (T009) joins them.
- Each story's write-first component test (T011, T017, T022, T027, T032) and the standalone `tips.ts` (T023) can be authored ahead of their implementations.
- Once Foundational is green, US3 (Splash) and US4 (Pause) are the most independent of the others and can proceed in parallel with US1/US2 if staffed.
- Note: US1/US2/US5 all edit `src/ui/shell/HomeScreen.tsx` (Home is the aggregating surface), so their Home-touching tasks serialize against each other even though the stories are independently testable.

## Implementation Strategy

- **MVP = Phases 1–3 (through US1)**: land on a warm Home and reach a playable board in ≤2 clicks. Stop and validate — this is the shippable front door and unblocks demoing 002/004.
- Then add US2 (resume + stats — the "walk away and come back" pull), US3 (splash tone-setter), US4 (safe Pause), and US5 (toggles + calm transitions) incrementally; each adds value without breaking prior stories.
- Commit after each task or logical group; the shell's `CHANGELOG.md` entry lands with Polish (T037).

## Notes

- All shell code under `src/ui/shell/`; unit/component tests co-located (`*.test.ts` for pure logic, `*.test.tsx` for component tests, matching `src/App.test.tsx`); e2e specs under `e2e/` (`*.spec.ts`, matching `e2e/smoke.spec.ts`).
- Design-system fidelity is a first-class requirement here: use Tailwind theme tokens from `src/index.css` `@theme` (never hardcoded hex — enforced by T003) and match the `resources/` style guide.
- The shell owns none of its data: prefs/resume/stats are read through the `SaveStore` seam (008) and journal (005); theme token values live in Settings (006). Keep components thin — wiring, not business logic.
- Every screen must render correctly with zero saved data (warm defaults, no crashes) and respect `prefers-reduced-motion`.
