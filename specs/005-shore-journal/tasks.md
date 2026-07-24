---
description: "Task list for the Shore Journal feature"
---

# Tasks: Shore Journal — Creature Collection

**Input**: Design documents from `specs/005-shore-journal/`

**Prerequisites**: plan.md, spec.md, checklists/requirements.md

**Tests**: INCLUDED (required, not optional). Constitution VIII overrides the template's "tests optional" default: the discovery/unlock rules, stats accumulation, and persistence shape are the highest-signal logic here, and the spec/plan require unit tests for the journal model plus a Playwright golden-path e2e. Unit tests are co-located as `src/game/*.test.ts` / `src/ui/journal/*.test.tsx` (Vitest); e2e lives under `e2e/`, per `stacks/tidepools.md`.

**Organization**: Grouped by the spec's user stories (US1 Browse, US2 Record, US3 Filter+stats). The shared creature catalog and the SaveStore persistence adapter are hard prerequisites for every story, so they live in Foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US3 from spec.md (Setup / Foundational / Polish tasks carry no story tag)
- Paths are exact; catalog + model live under `src/game/` and `src/content/`, screens under `src/ui/journal/`

## Cross-feature dependencies

- **Persistence (008)** — discoveries + lifetime stats go through the `SaveStore` seam in `src/platform`; treat its interface as available and consume it (never call `localStorage`/IndexedDB directly).
- **Gameplay (002)** — the board/pool-complete event drives discoveries and stat totals; the journal subscribes to it and owns only the recording/read model.

---

## Phase 1: Setup

**Purpose**: Module skeleton + test guardrails

- [ ] T001 Create the journal module skeleton with typed stubs + exports — `src/game/creatures.ts`, `src/game/journal.ts`, `src/game/journal-store.ts`, `src/content/creatures.json`, `src/ui/journal/JournalScreen.tsx`, `src/ui/journal/CreatureCard.tsx` — per plan.md
- [ ] T002 [P] Add shared journal test fixtures — an in-memory `SaveStore` double + a sample catalog and discovery-map fixtures — in `src/game/journal-fixtures.ts`
- [ ] T003 [P] Add a guard test asserting the journal persists only through the injected `SaveStore` (no direct `localStorage`/`indexedDB`/`window` in `src/game/journal*.ts` or `src/ui/journal/**`) in `src/game/journal-store.guard.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared building blocks every story needs — the single creature catalog (shared with Gameplay's reward mapping, FR-007), its types, and the SaveStore-backed persistence adapter.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Define the catalog + record types — `Creature`, `Rarity`, pool-size `unlock` range, `Discovery { found, firstFoundSeed, count }`, `JournalStats { boardsSolved, poolsFilled, creaturesFound }` — in `src/game/creatures.ts` and `src/game/journal.ts`
- [ ] T005 [P] Author the creature catalog data (~a dozen creatures; crab with an `art` path, the rest art-less per the known gap) in `src/content/creatures.json`
- [ ] T006 Implement the catalog loader + `creatureForPoolSize(size)` reward-mapping resolver — the single source shared with Gameplay 002 (FR-007) — in `src/game/creatures.ts` (depends on T004, T005)
- [ ] T007 [P] Unit tests for the catalog + resolver: every creature has required fields, rarities are valid, pool-size `unlock` ranges partition the space with no gaps/overlap, and `creatureForPoolSize` maps size→creature deterministically in `src/game/creatures.test.ts`
- [ ] T008 Implement the journal persistence adapter over `SaveStore` (008): namespaced/versioned discovery-record read/write plus lifetime-stats read, via the injected store, in `src/game/journal-store.ts` (depends on T004)
- [ ] T009 [P] Unit tests for the persistence adapter: a discovery record round-trips through the in-memory `SaveStore`; the persisted shape matches the schema; stats read back correctly (SC-003) in `src/game/journal-store.test.ts`

**Checkpoint**: catalog, resolver, and persistence adapter all green — story work can begin.

---

## Phase 3: User Story 1 — Browse discovered creatures (Priority: P1) 🎯 MVP

**Goal**: The Shore Journal renders a grid of all catalog creatures — found cards show illustration + name + rarity + description; unfound cards are faint silhouettes labelled "not yet found" — with an accurate "X of Y found" count.

**Independent Test**: With some creatures discovered (fixture), open the journal; confirm found cards show art/name/rarity/description, unfound cards show silhouettes, and the count is accurate.

### Tests for User Story 1 (write first, expect fail) ⚠️

- [ ] T010 [P] [US1] Unit tests for the read model: `buildJournalView(catalog, discoveries)` returns per-creature found/silhouette state and an accurate "X of Y found" count (SC-001); zero-discovery and all-discovered inputs handled in `src/game/journal.test.ts`
- [ ] T011 [P] [US1] Component test for `CreatureCard`: found → art + name + rarity + description; unfound → silhouette + "not yet found"; missing art → styled placeholder, never a broken card (FR-008) in `src/ui/journal/CreatureCard.test.tsx`
- [ ] T012 [P] [US1] Component test for `JournalScreen`: renders a card for every catalog creature, the "X of Y found" header reflects the fixture, and the warm zero-discovery empty state + full-completion "shore's full" state both render (SC-004) in `src/ui/journal/JournalScreen.test.tsx`

### Implementation for User Story 1

- [ ] T013 [US1] Implement the journal read model — per-creature found/silhouette state and the "X of Y found" count derived from catalog + persisted discoveries — in `src/game/journal.ts` (depends on T004, T008)
- [ ] T014 [P] [US1] Implement `CreatureCard`: found card / silhouette / art-placeholder degradation, styled with Tailwind theme tokens (no hardcoded hex) in `src/ui/journal/CreatureCard.tsx` (FR-001, FR-008)
- [ ] T015 [US1] Implement `JournalScreen`: responsive card grid + "X of Y found" header + warm empty / full-completion states, wired to the read model, in `src/ui/journal/JournalScreen.tsx` (depends on T013, T014)
- [ ] T016 [US1] Route to the journal from the app shell (nav entry) and export `JournalScreen` from `src/ui/index.ts` (integrates with App Shell 003) in `src/App.tsx`
- [ ] T017 [US1] Make T010–T012 green; add the zero-discovery ("0 of Y found", warm not-grey) and full-completion edge-case assertions (SC-004) in `src/game/journal.test.ts` and `src/ui/journal/JournalScreen.test.tsx`

**Checkpoint**: the journal is browsable and reads correctly against fixtures — independently demoable.

---

## Phase 4: User Story 2 — Record a discovery (Priority: P1)

**Goal**: On pool completion in Gameplay, the journal records the creature — first-found seed and count 1 on first reveal; on re-encounter the count increments and the first-found record is unchanged — persisted via `SaveStore`.

**Independent Test**: Solve a pool that yields a not-yet-found creature; confirm the journal marks it found with the first-found seed and count 1; find it again → count increments, first-found stays the same.

### Tests for User Story 2 (write first, expect fail) ⚠️

- [ ] T018 [P] [US2] Unit tests for record logic: first find sets `found` + `firstFoundSeed` + `count: 1`; a re-find increments `count` and preserves `firstFoundSeed` (FR-003, FR-004, SC-002) in `src/game/journal.test.ts`
- [ ] T019 [P] [US2] Unit test: a recorded discovery is written through the `SaveStore` adapter and survives a store round-trip (SC-003) in `src/game/journal-store.test.ts`

### Implementation for User Story 2

- [ ] T020 [US2] Implement `recordDiscovery(creatureId, seed)` in `src/game/journal.ts`: branch first-found vs increment, then persist via the journal-store adapter (depends on T008, T013)
- [ ] T021 [US2] Subscribe the recorder to Gameplay's (002) pool-complete event — resolve the creature via `creatureForPoolSize`, then call `recordDiscovery` — in `src/game/journal.ts` (depends on T006, T020; consumes the Gameplay 002 event)
- [ ] T022 [US2] Make T018–T019 green; add the re-find-preserves-first-found and count-increment edge cases (SC-002) in `src/game/journal.test.ts`

**Checkpoint**: discoveries accumulate and persist — solving a pool fills the collection.

---

## Phase 5: User Story 3 — Filter + stats (Priority: P3)

**Goal**: The player can filter All / Found / Missing, and a gentle footer shows lifetime stats (boards solved, pools filled, creatures found) read from persistence.

**Independent Test**: Toggle each filter and confirm the visible set matches exactly; confirm the footer's boards-solved / pools-filled / creatures-found reflect recorded totals.

### Tests for User Story 3 (write first, expect fail) ⚠️

- [ ] T023 [P] [US3] Unit tests for the filter partition: All / Found / Missing each return exactly the matching subset of the catalog view (SC-005) in `src/game/journal.test.ts`
- [ ] T024 [P] [US3] Component test: switching the filter shows exactly the matching cards, and the stats footer renders boards-solved / pools-filled / creatures-found from a fixture (FR-005, FR-006) in `src/ui/journal/JournalScreen.test.tsx`

### Implementation for User Story 3

- [ ] T025 [US3] Implement the All / Found / Missing filter partition in the read model in `src/game/journal.ts` (depends on T013)
- [ ] T026 [US3] Add the All / Found / Missing segmented filter control (Tailwind theme tokens) to `src/ui/journal/JournalScreen.tsx` (depends on T015, T025)
- [ ] T027 [US3] Implement the display-only stats footer reading lifetime totals via the journal-store/`SaveStore` (FR-006) in a new `src/ui/journal/StatsFooter.tsx` and mount it in `src/ui/journal/JournalScreen.tsx` (depends on T008)
- [ ] T028 [US3] Make T023–T024 green; assert each filter's exact subset (SC-005) and the footer totals in `src/game/journal.test.ts` and `src/ui/journal/JournalScreen.test.tsx`

**Checkpoint**: filtering and the stats footer round out the browsing experience.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T029 [P] Playwright e2e (golden path): complete a board in Gameplay → open the Journal → the creature's card flips from silhouette to found with the correct first-found seed and count 1 in `e2e/journal-discovery.spec.ts`
- [ ] T030 [P] Playwright e2e (persistence): record a discovery, reload, and confirm the journal still shows it found with the same seed + count (SC-003) in `e2e/journal-persistence.spec.ts`
- [ ] T031 [P] Accessibility + theme pass: silhouettes carry accessible labels, the count/footer are readable, and all journal components use Tailwind theme tokens (no hardcoded hex) across `src/ui/journal/JournalScreen.tsx`, `src/ui/journal/CreatureCard.tsx`, `src/ui/journal/StatsFooter.tsx`
- [ ] T032 `npm run typecheck` + `npm run build` + full `npm run test` + `npm run test:e2e` green; add the Shore Journal `CHANGELOG.md` entry

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2, blocking)** → **User Stories (Phase 3–5)** → **Polish (Phase 6)**.
- Foundational blocks every story: the catalog + resolver (T006) and the persistence adapter (T008) are hard prerequisites for the read model and the recorder alike.

### User Story Dependencies

- **US1 (P1, Browse)**: depends only on Foundational. Independently testable against discovery fixtures — no dependency on US2's recording path.
- **US2 (P1, Record)**: depends on Foundational + US1's read model (`journal.ts` spine, T013) and consumes the Gameplay 002 pool-complete event.
- **US3 (P3, Filter+stats)**: depends on Foundational + US1's read model and screen; independent of US2.

### Within Each User Story

- Tests (T010–T012, T018–T019, T023–T024) are written first and must fail before implementation.
- Read model / persistence before screen; screen before routing/integration.
- Story complete and its checkpoint verified before moving to the next priority.

## Parallel Opportunities

- **Phase 1**: T002 and T003 in parallel (T001 first — it creates the files they touch).
- **Phase 2**: T005 (catalog data) and T007 (catalog tests, write-first) parallel to the T004→T006 type/resolver chain; T008→T009 (persistence adapter + tests) is an independent track once T004 lands.
- **US1**: the three write-first tests T010/T011/T012 run in parallel; on implementation, `CreatureCard` (T014) is parallel to the `journal.ts` read model (T013).
- **US2 / US3**: each story's write-first tests (T018+T019, T023+T024) run in parallel.
- **Polish**: T029, T030, T031 are independent files and run in parallel.

## Implementation Strategy

### MVP scope

**MVP = Phases 1–4 (Setup + Foundational + US1 + US2).** Both P1 stories together are the minimum shippable slice: US1 (Browse) is the collection screen and US2 (Record) is the accumulation loop that fills it — neither is meaningful alone. Complete through US2, then **STOP and VALIDATE**: solve a pool, watch the card flip from silhouette to found, and confirm it persists across a reload.

### Incremental delivery

1. Setup + Foundational → catalog + persistence ready.
2. US1 → browsable journal (demoable against fixtures).
3. US2 → discoveries record + persist → **MVP complete**.
4. US3 (P3) → filters + stats footer → full experience.
5. Polish → e2e golden path, persistence e2e, a11y/theme pass, typecheck/build/tests + CHANGELOG.

## Notes

- Catalog + model are pure and portable (`src/game`, `src/content`); screens are React + Tailwind (`src/ui/journal`); persistence is only ever the `SaveStore` seam (008) — no direct `localStorage`/IndexedDB, enforced by T003.
- The single shared catalog (`src/game/creatures.ts`) is imported by both the Journal and Gameplay's reward mapping (FR-007) — seed→creature and journal state can never disagree.
- Missing art degrades to a styled placeholder in `CreatureCard` (FR-008); only the crab has real art today.
- The journal displays lifetime stats but does not compute them — totals are read from persistence (008), which owns them.
- Commit after each task or logical group; the Shore Journal `CHANGELOG.md` entry lands with T032.
