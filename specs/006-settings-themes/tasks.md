---
description: "Task list for the Settings & Themes feature"
---

# Tasks: Settings & Themes — Grouped Settings, Live Apply & Night Tide

**Input**: Design documents from `specs/006-settings-themes/`

**Prerequisites**: plan.md, spec.md, checklists/requirements.md

**Tests**: INCLUDED (required). Per Constitution VIII, tests are required here (overriding the template's "optional" default): Vitest unit tests for the settings schema/merge/validate, the reactive store, accessibility flags, and the save-blob export/import round-trip + reset guard; component tests for the Settings screen; Playwright e2e for the change-setting→persists, Night Tide, and colorblind-cue paths. Tests are co-located as `src/**/*.test.ts(x)` (Vitest); e2e under `e2e/*.spec.ts` (Playwright), per `stacks/tidepools.md`.

**Organization**: Grouped by the spec's user stories in priority order. Both P1 stories (US1 settings live-apply, US2 themes) form the shippable settings slice; US3 (a11y/comfort) and US4 (play defaults + data) are P2 increments.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different file, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md (only on user-story tasks)
- Paths are exact. Settings model/store: `src/game/settings/`; screen + theme: `src/ui/settings/`, `src/ui/theme/`; persistence consumed via `src/platform` (feature 008 `SaveStore`) — never `localStorage` directly.

---

## Phase 1: Setup

**Purpose**: Module skeleton + guardrails

- [ ] T001 Create the settings/theme file skeleton with typed stubs + exports — `src/game/settings/{schema.ts,store.ts,persistence.ts,save-blob.ts,selectors.ts,reset.ts,index.ts}`, `src/ui/settings/{SettingsScreen.tsx,useSettings.ts,controls/index.tsx}`, `src/ui/theme/{tokens.css,useTheme.ts,accessibility.ts}` — per plan.md, wired to the `@/` alias
- [ ] T002 [P] Add settings test fixtures/helpers (partial-settings + full save-blob builders) in `src/game/settings/test-helpers.ts`
- [ ] T003 [P] Add a seam guard test asserting settings/theme code never calls `localStorage` directly (persistence goes only through the platform `SaveStore`) in `src/game/settings/no-direct-storage.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared building blocks every story needs — the versioned settings schema + defaults, merge/validate, the reactive store, the persistence seam (008), and the React binding.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Define the `Settings` type + grouped sub-types (sound, visuals/theme, controls, comfort, play, data), `SCHEMA_VERSION`, and a complete `DEFAULT_SETTINGS` (every field has a first-run default — FR-010) in `src/game/settings/schema.ts`
- [ ] T005 Implement `mergeSettings` + `validateSettings` — deep-merge a partial/older persisted object onto `DEFAULT_SETTINGS`, drop unknown keys, coerce/reject malformed fields, version-aware — in `src/game/settings/schema.ts` (depends on T004)
- [ ] T006 [P] Unit tests for schema: every field defaulted; partial/older object fills from defaults; malformed fields coerced or safely rejected in `src/game/settings/schema.test.ts` (depends on T004, T005)
- [ ] T007 [P] Implement the framework-neutral reactive settings store — `getSettings` / `setSetting(path, value)` / `subscribe`, seeded from `DEFAULT_SETTINGS`, no React/DOM/`localStorage` — in `src/game/settings/store.ts` (depends on T004)
- [ ] T008 [P] Unit tests for the store: `setSetting` updates state and notifies subscribers; reads reflect the latest value live in `src/game/settings/store.test.ts` (depends on T007)
- [ ] T009 Wire settings hydrate/persist through the platform `SaveStore` seam (008): hydrate the store via `mergeSettings` on init, persist on every change; never touch `localStorage` directly in `src/game/settings/persistence.ts` (depends on T005, T007)
- [ ] T010 [P] Unit tests for persistence against a fake `SaveStore`: hydrate merges a persisted-partial onto defaults; a change round-trips out and back in `src/game/settings/persistence.test.ts` (depends on T009)
- [ ] T011 [P] Implement the React binding — `useSettings` (via `useSyncExternalStore`) + a `SettingsProvider` that hydrates on mount — in `src/ui/settings/useSettings.ts` (depends on T007, T009)

**Checkpoint**: schema, store, persistence, and the React binding are green — every story can now read/write live settings.

---

## Phase 3: User Story 1 — Adjust settings, applied live (Priority: P1) 🎯 MVP

**Goal**: The player opens Settings and adjusts grouped options (Sound, Controls, Comfort); each change applies live and survives a restart, and Done closes retaining everything.

**Independent Test**: Change a sound level / control mapping / comfort toggle; confirm each takes effect live and persists across a reload.

- [ ] T012 [P] [US1] Component test (write first, expect fail): changing a sound slider / control-mapping segmented / comfort toggle applies live to the store; Done closes retaining changes in `src/ui/settings/SettingsScreen.test.tsx`
- [ ] T013 [P] [US1] Build the reusable control kit — `Toggle`, `Slider`, `Segmented`, `SettingGroup` — bound to `useSettings`, styled with Tailwind theme tokens only (no hardcoded hex) in `src/ui/settings/controls/index.tsx`
- [ ] T014 [US1] Implement `SettingsScreen` with the Sound / Controls / Comfort groups + a Done button, live-applying via `useSettings`, in a calm grouped layout in `src/ui/settings/SettingsScreen.tsx` (depends on T011, T013)
- [ ] T015 [US1] Make T012 pass; add edge tests (first-run defaults are shown; rapid toggles apply live without a save step) in `src/ui/settings/SettingsScreen.test.tsx`
- [ ] T016 [US1] Playwright e2e: change a control mapping and a comfort toggle → reload → values persisted and reflected in `e2e/settings-persist.spec.ts`

**Checkpoint**: MVP — a working, persistent, live-applying settings surface.

---

## Phase 4: User Story 2 — Switch theme, including Night Tide (Priority: P1)

**Goal**: The player chooses Daylight / Night Tide / Auto; the whole app re-themes live and persists. Night Tide is a *designed* dark palette (moonlit shore), not an inversion; Auto follows the OS.

**Independent Test**: Switch to Night Tide; confirm every screen adopts the dark palette; switch to Auto and confirm it follows the OS preference.

- [ ] T017 [P] [US2] Unit test (write first, expect fail): `useTheme` resolves Daylight/Night Tide/Auto → `data-theme`; Auto follows `matchMedia('(prefers-color-scheme: dark)')`; falls back to Daylight with no OS signal in `src/ui/theme/useTheme.test.ts`
- [ ] T018 [P] [US2] Define the Daylight + Night Tide token sets as CSS variables scoped by `[data-theme]` (Night Tide = designed deep teal-navy ground, glowing water, held coral — not an inversion), imported by `src/index.css`, in `src/ui/theme/tokens.css`
- [ ] T019 [US2] Implement `useTheme`: resolve the theme setting → stamp `data-theme` on the root, subscribe to `matchMedia` for Auto, fall back to Daylight, persist via `useSettings` in `src/ui/theme/useTheme.ts` (depends on T011)
- [ ] T020 [US2] Add the Visuals → Theme segmented control (Daylight / Night Tide / Auto) to the Settings screen, wired live to `useTheme` in `src/ui/settings/SettingsScreen.tsx` (depends on T014, T019)
- [ ] T021 [US2] Make T017 pass; add tests: theme persists across reload; Auto reacts to an emulated OS `prefers-color-scheme` change in `src/ui/theme/useTheme.test.ts`
- [ ] T022 [US2] Playwright e2e: select Night Tide → assert the dark tokens apply on multiple screens; select Auto + emulate OS dark → app follows in `e2e/theme-night-tide.spec.ts`

**Checkpoint**: the P1 slice is complete — settings + a live, persistent, designed theme system (SC-002).

---

## Phase 5: User Story 3 — Accessibility & comfort options (Priority: P2)

**Goal**: The player can enable reduce-motion, high-contrast cells, colorblind-safe water/rock distinction, cell-size scaling, and comfort aids (hover-highlight, mis-mark nudge, line-total helper) — framed as comfort, never "easy mode."

**Independent Test**: Enable each option; confirm the app honors it (motion minimized app-wide, high-contrast + cell-scale applied at the shell, colorblind-safe + comfort flags exposed to consumers).

- [ ] T023 [P] [US3] Unit test (write first, expect fail): reduce-motion / high-contrast / colorblind-safe / cell-size / comfort-aid toggles flow through the store and surface via the consumer selector in `src/game/settings/accessibility.test.ts`
- [ ] T024 [US3] Add the accessibility controls (reduce-motion, high-contrast, colorblind-safe, cell-size) to the Visuals group and the comfort aids (hover-highlight, mis-mark nudge, line-total helper) to the Comfort group, framed as comfort, in `src/ui/settings/SettingsScreen.tsx` (depends on T014)
- [ ] T025 [US3] Implement the shell-level honoring: stamp `data-reduce-motion` / `data-contrast` / `--cell-scale` on the root from `useSettings`, plus reduce-motion + high-contrast CSS rules in `src/ui/theme/accessibility.ts` (depends on T011); add the paired CSS in `src/ui/theme/tokens.css`
- [ ] T026 [US3] Expose `colorblindSafe` + comfort aids as a typed settings selector for consumers (render/Gameplay 002) — a documented non-color cue flag (SC-003) — in `src/game/settings/selectors.ts` (depends on T007)
- [ ] T027 [US3] Make T023 pass; add tests for the root reduce-motion/high-contrast/cell-scale attributes and the selector shape in `src/game/settings/accessibility.test.ts`
- [ ] T028 [US3] Playwright e2e: enable reduce-motion → assert animations minimized app-wide (root attr / no transitions); enable colorblind-safe → assert the non-color cue flag is exposed to the board in `e2e/settings-a11y.spec.ts`

**Checkpoint**: comfort/accessibility options honored at the shell and exposed to consumers (SC-003).

---

## Phase 6: User Story 4 — Play defaults + data (Priority: P2)

**Goal**: The player sets default board size/difficulty + optional stopwatch (feeding Home/Play), can export/import their save blob to move between machines, and can reset progress behind a soft confirm.

**Independent Test**: Set defaults (surfaced to Play); toggle the stopwatch; export the save blob and re-import it losslessly; attempt reset and confirm it requires an explicit confirm; import a malformed blob and confirm it is rejected without corrupting the current save.

- [ ] T029 [P] [US4] Unit test (write first, expect fail): `exportSave` yields `{ version, settings, saves, journal }`; `importSave` validates version + shape, round-trips losslessly, and rejects a malformed/incompatible blob leaving the current save intact (Constitution II) in `src/game/settings/save-blob.test.ts`
- [ ] T030 [US4] Implement `exportSave` / `importSave` over the platform `SaveStore` — validate version + shape before applying, reject malformed with a typed error, never touch the current save on rejection — in `src/game/settings/save-blob.ts` (depends on T005, T009)
- [ ] T031 [US4] Implement the reset-progress guard: clear saves/journal via `SaveStore` only when an explicit confirm flag is passed (FR-009) in `src/game/settings/reset.ts` (depends on T009)
- [ ] T032 [US4] Add the Play group (default size/difficulty segmented, optional stopwatch toggle) to the Settings screen and expose the defaults via the consumer selector (Home/Play 003/004) in `src/ui/settings/SettingsScreen.tsx` and `src/game/settings/selectors.ts` (depends on T014, T026)
- [ ] T033 [US4] Add the Data group — Export (download blob), Import (file → `importSave` with a gentle rejection message), Reset progress behind a soft confirm — to the Settings screen in `src/ui/settings/SettingsScreen.tsx` (depends on T030, T031)
- [ ] T034 [US4] Make T029 pass; add tests: reset requires the confirm flag (`reset.test.ts`); malformed import rejected + current save intact (`save-blob.test.ts`) in `src/game/settings/reset.test.ts` and `src/game/settings/save-blob.test.ts`
- [ ] T035 [US4] Playwright e2e: set defaults → Play reflects them; export → re-import round-trips with no loss; reset requires an explicit confirm in `e2e/settings-data.spec.ts`

**Checkpoint**: data portability + play defaults complete; reset is guarded and imports are safe (SC-004, SC-005).

---

## Phase 7: Polish & Cross-Cutting

- [ ] T036 [P] Guard test: settings/theme components use Tailwind theme tokens only — no hardcoded palette hex — in `src/ui/settings/no-hardcoded-hex.test.tsx`
- [ ] T037 [P] Night Tide + Daylight polish pass: verify contrast and `focus-visible` states across every screen in both themes in `src/ui/theme/tokens.css`
- [ ] T038 `npm run typecheck` + `npm run build` + full `npm run test` + `npm run test:e2e` green; add the Settings & Themes `CHANGELOG.md` entry

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2, blocking)** → **User Stories (Phase 3–6)** → **Polish (Phase 7)**.
- Within Foundational, the hard chain is: `schema` (T004→T005) → `store` (T007) → `persistence` (T009) + `useSettings` (T011); test tasks branch off their impl.
- **US1** depends on all of Foundational (esp. `useSettings`). **US2** builds on US1's screen + `useTheme` (`useSettings`). **US3** builds on US1's screen + the store selector. **US4** builds on US1's screen + `persistence`/`save-blob`.
- **Cross-feature**: persistence + reset + export/import consume feature **008**'s `SaveStore` (`src/platform`) — the `SaveBlob` shape (`{ version, settings, saves, journal }`) is *defined here* and shared with 008; feature **009** (Auto-Cloud) later syncs this same blob. Theme application (`data-theme` stamping) is the App Shell's (003) mechanism; this feature supplies the token *values*. Consumers 002/003/004 read the settings selectors.
- Tests for a task are written before/with its implementation and must fail first.

## Parallel Opportunities

- Phase 1: T002, T003 in parallel.
- Phase 2: once `schema` (T004→T005) lands, the schema tests (T006), the store track (T007→T008), and — after `store` — the persistence (T009→T010) and `useSettings` (T011) tracks proceed with the marked `[P]` overlap.
- Each story: the `[P]` test task is authored ahead of its implementation; within a story the control kit / token set (T013, T018) parallels the test authoring.
- The four stories are independently testable; after Foundational, US1→US2 (P1) and US3/US4 (P2) can be split across developers, coordinating only on shared edits to `SettingsScreen.tsx`.

## Implementation Strategy

- **MVP = Phases 1–3 (through US1)**: a grouped Settings screen whose changes apply live and persist. Stop and validate here.
- **Complete the P1 slice with US2 (Phase 4)**: themes incl. Night Tide — the other P1 story and the headline comfort feature. Ship after this for a coherent settings + theme release.
- Then add **US3** (accessibility/comfort — a Steam quality signal) and **US4** (play defaults + data portability) as P2 increments, each independently testable.
- Commit after each task or logical group; the Settings & Themes `CHANGELOG.md` entry lands with T038.

## Notes

- Settings model/store paths under `src/game/settings/` (pure, no React/DOM); screen + theme under `src/ui/settings/` and `src/ui/theme/`; tests co-located as `*.test.ts(x)` (Vitest), e2e under `e2e/` (Playwright).
- Never call `localStorage`/Tauri APIs outside `src/platform` — settings persist only through the 008 `SaveStore` (guarded by T003).
- Never hardcode palette hex in components — extend the `@theme` tokens in `src/index.css` and the `[data-theme]` sets in `tokens.css` (guarded by T036).
- Imported save blobs are untrusted input — validate version + shape and reject safely before applying (Constitution II); a malformed import must never corrupt the current save.
- Colorblind-safe is a *non-color cue* flag (SC-003), consumed by the render layer (002); this feature owns and exposes the flag, not the board rendering.
- Music may be absent early — the toggle exists and no-ops gracefully until audio lands.
