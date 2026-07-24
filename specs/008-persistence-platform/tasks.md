---
description: "Task list for the Persistence & Platform Seam feature"
---

# Tasks: Persistence & Platform Seam — the one storage/OS seam every stateful feature uses

**Input**: Design documents from `specs/008-persistence-platform/`

**Prerequisites**: plan.md, spec.md, data-model.md

**Tests**: INCLUDED (test-first where practical). Persistence is the highest-signal
test target after the engine and the Constitution requires tests (Principle VIII —
this overrides the template's "optional" default). Tests are co-located as
`src/platform/*.test.ts` (Vitest, jsdom), per `stacks/tidepools.md`. A reusable
backend contract harness is run against every backend so the swappable-seam
property (FR-007) is proven by construction.

**Organization**: Grouped by the spec's user stories in priority order. The
`SaveStore` interface + schemas + the in-memory fake backend are **Foundational** —
they are hard prerequisites that block every user story. This feature is **first in
the implementation order**: it is the seam consumed by every stateful feature
(002–007), so its surface must be right before they build on it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md (tags appear only on user-story tasks)
- Paths are exact; all persistence/OS code lives under `src/platform/` (SC-002)
- Consumers (`game`/`ui`) import **only** the `src/platform` barrel — never a backend
  and never a storage/OS API directly

---

## Phase 1: Setup

**Purpose**: Module skeleton + test infrastructure + fixtures

- [ ] T001 Create the `src/platform/` file skeleton with typed stubs + a single public barrel (`save-store.ts`, `schemas.ts`, `memory-backend.ts`, `web-backend.ts`, `migrate.ts`, `blob.ts`, `index.ts`) per plan.md Project Structure
- [ ] T002 [P] Add the IndexedDB wrapper dep (`idb-keyval`) + `fake-indexeddb` for jsdom, and wire the IndexedDB/localStorage test polyfills into `src/test/setup.ts` (package.json + src/test/setup.ts)
- [ ] T003 [P] Add persistence test fixtures + helpers — a sample record per namespace and an older-schema save fixture — in `src/platform/test-helpers.ts` and `src/platform/fixtures/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The seam itself — the `SaveStore` interface, the versioned schema set,
the reusable backend contract harness, and the in-memory fake backend every test and
the private-browsing fallback rely on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete — every
consumer and every backend depends on these shapes.

- [ ] T004 Define the `SaveStore` interface (async `get`/`set`/`remove`/`exportAll`/`importAll`), the `Namespace` union (inProgressBoard, settings, journal, stats, curatedProgress, onboarding, shellPrefs), and the `keyFor(namespace)` → `tp:v{N}:{namespace}` builder in `src/platform/save-store.ts`
- [ ] T005 [P] Define the versioned `PersistedSchemas` (InProgressBoard, Settings, Journal, Stats, CuratedProgress, OnboardingState, ShellPrefs — each with a `v` field), per-namespace current-version constants and default factories, plus the `SaveBlob` and `Migration` types, in `src/platform/schemas.ts`
- [ ] T006 [P] Author the reusable backend contract harness (write first, expect fail) — `runSaveStoreContract(makeStore)` that round-trips **every** namespace, plus remove and overwrite/last-write-wins — in `src/platform/save-store.contract.ts`
- [ ] T007 Implement the in-memory fake `memory-backend.ts` (namespaced async map; used by tests and as the private-browsing fallback) in `src/platform/memory-backend.ts`
- [ ] T008 Run `runSaveStoreContract` against the memory backend (make T006 pass) in `src/platform/memory-backend.test.ts`
- [ ] T009 Implement typed per-namespace accessors that apply schema defaults + shape-validate on read (corrupt/absent → default for that key only) in `src/platform/save-store.ts`

**Checkpoint**: interface, schemas, and the fake backend are green — user-story work can begin against a real, tested seam.

---

## Phase 3: User Story 1 — Nothing is ever lost (Priority: P1) 🎯 MVP

**Goal**: Every namespace is durably written to real browser storage (localStorage for
small records, IndexedDB for the in-progress board / larger blobs) and restored exactly
across reloads, crashes, and restarts.

**Independent Test**: Write each data type, restart the environment (fresh store over the
same storage), read them back identical (SC-001).

- [ ] T010 [P] [US1] Run the shared `runSaveStoreContract` harness against the web backend (write first, jsdom + fake-indexeddb) in `src/platform/web-backend.test.ts`
- [ ] T011 [US1] Implement small key-value persistence via `localStorage` (settings, stats, curatedProgress, onboarding, shellPrefs) in `src/platform/web-backend.ts`
- [ ] T012 [US1] Implement blob/larger-record persistence via IndexedDB (`idb-keyval`) for the in-progress board(s) and export blob in `src/platform/web-backend.ts`
- [ ] T013 [US1] Add debounced `set` (autosave writes coalesced, last-write-wins) to `src/platform/web-backend.ts`
- [ ] T014 [US1] In-progress board round-trip — persist only `{ request, marks, revealed }`; on load reproduce the board via `generateBoard(request)` from `@/core` and assert `serializeBoard` deep-equals the original (board never stored, only player state) — in `src/platform/in-progress-board.test.ts`
- [ ] T015 [US1] Restart-survival test: a fresh `web-backend` instance over the same storage returns identical records for **every** namespace (SC-001) in `src/platform/web-backend.test.ts`

**Checkpoint**: MVP core — durable, exact round-trip of all persisted data across restarts.

---

## Phase 4: User Story 2 — One seam, swappable backend (Priority: P1)

**Goal**: All consumers read/write only through the single `SaveStore` interface; the
web backend can be swapped for the fake (and later the Tauri) backend with **no consumer
changes** (FR-007), and nothing touches storage/OS APIs outside `src/platform` (SC-002).

**Independent Test**: Point the seam at the fake backend; the same consumer code works
unchanged. Scan the codebase: no `localStorage`/IndexedDB/Tauri call exists outside
`src/platform`.

- [ ] T016 [US2] Implement backend selection in `src/platform/index.ts` (browser → web-backend; test → memory-backend; a hook where the Tauri backend from feature 009 drops in — same interface, no consumer change) and export the public barrel
- [ ] T017 [P] [US2] Swappable-backend property test: one sample consumer routine drives an identical script against the memory **and** web backends and observes identical results (FR-007) in `src/platform/swappable-backend.test.ts`
- [ ] T018 [P] [US2] SC-002 scan test: assert no `localStorage`/`sessionStorage`/`indexedDB`/`window.__TAURI__`/`@tauri-apps` reference appears anywhere under `src/` **except** `src/platform/` in `src/platform/no-direct-storage.test.ts`

**Checkpoint**: the MVP seam is complete — durable (US1), swappable, and leak-free (both P1 stories done).

---

## Phase 5: User Story 3 — Export / import save (Priority: P2)

**Goal**: The whole save exports as one portable, versioned blob and imports on another
machine; malformed/incompatible blobs are rejected without corrupting current data.

**Independent Test**: Export the full save, wipe, import → identical progress; import a
corrupt blob → rejected with a gentle reason, existing data intact (SC-003).

- [ ] T019 [P] [US3] Export/import contract test (write first): full round-trip restores every namespace; malformed and version-incompatible blobs are rejected with `{ ok:false, reason }` and current data is untouched — in `src/platform/blob.test.ts`
- [ ] T020 [US3] Implement `exportAll()` — gather every namespace into `SaveBlob { appVersion, schemaVersion, records }` — in `src/platform/blob.ts`
- [ ] T021 [US3] Implement `importAll(blob)` — validate `schemaVersion` + each record's shape, then write each namespace; on any failure return `{ ok:false, reason }` and leave current data unmodified — in `src/platform/blob.ts`
- [ ] T022 [US3] Wire `exportAll`/`importAll` from the `SaveStore` interface onto both backends (delegating to `blob.ts`) in `src/platform/web-backend.ts` and `src/platform/memory-backend.ts`

**Checkpoint**: whole-save portability with safe rejection (SC-003).

---

## Phase 6: User Story 4 — Schema versioning & migration (Priority: P2)

**Goal**: Persisted records carry a schema version; older saves migrate forward on read,
and unknown/newer versions are refused-and-preserved rather than corrupted.

**Independent Test**: Load the older-schema fixture → it migrates to current and reads
correctly; an unknown/newer version is handled safely (SC-004).

- [ ] T023 [P] [US4] Migration tests (write first): the older-schema fixture migrates forward and reads correctly; a `v > current` record is not overwritten and surfaces a gentle "save is from a newer version" — in `src/platform/migrate.test.ts`
- [ ] T024 [US4] Implement the migration runner + per-namespace ordered registry (`vN → vN+1` composed to current) in `src/platform/migrate.ts`
- [ ] T025 [US4] Wire migration into the read path (typed accessors): on `get`, migrate older→current via the registry; if `v > current`, do not write, surface the notice, and keep the record intact — in `src/platform/save-store.ts`

**Checkpoint**: saves survive schema evolution; newer versions never corrupt (SC-004).

---

## Phase 7: Edge Cases & Graceful Degradation (Cross-Cutting — FR-008 / SC-005)

**Purpose**: Under quota, corruption, or disabled storage the app degrades gracefully and
never destroys still-valid data. Cross-cutting (no single story owns it), so no `[Story]` tag.

- [ ] T026 [P] Quota-exceeded: `set` catches the quota error, surfaces a gentle notice, and already-saved data is untouched (throwing-storage stub) in `src/platform/degradation.test.ts`
- [ ] T027 [P] Corrupt single-key isolation: an unparseable record resets only that namespace to its default; all other namespaces read intact, in `src/platform/degradation.test.ts`
- [ ] T028 Disabled-storage fallback: when localStorage/IndexedDB is unavailable (private mode), `index.ts` falls back to `memory-backend` for the session with a gentle notice and never overwrites existing valid data — in `src/platform/index.ts` (covered by `src/platform/degradation.test.ts`)
- [ ] T029 [P] Concurrent rapid writes: last-write-wins per key with no cross-key interleaving corruption, in `src/platform/degradation.test.ts`

**Checkpoint**: graceful degradation across all failure modes (SC-005).

---

## Phase 8: Polish & Cross-Cutting

- [ ] T030 [P] Confirm `src/platform/index.ts` is the single public barrel consumers import (the `SaveStore` provider + typed accessors + `SaveBlob` type — nothing backend-specific), matching the quickstart, in `src/platform/index.ts`
- [ ] T031 `npm run typecheck` + `npm run build` + full `npm run test` green; add the persistence-seam `CHANGELOG.md` entry

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2, blocking)** → **User Stories (Phases 3–6)** → **Edge/Degradation (Phase 7)** → **Polish (Phase 8)**.
- Within Foundational the chain is: `SaveStore` interface (T004) + schemas (T005) → contract harness (T006) → memory backend (T007) → contract pass (T008) → typed accessors (T009).
- **US1** depends on all of Foundational (esp. the contract harness + typed accessors) and on the **001 engine** (`generateBoard`/`serializeBoard` for the in-progress board, T014). **US2** depends on US1 (web backend exists) + the memory backend. **US3** depends on the interface + typed accessors (blob reads/writes every namespace). **US4** depends on the schemas' version fields + typed read path. **Phase 7** depends on the web backend (US1) + `index.ts` selection (US2).
- Tests for a task are written before/with its implementation and must fail first (T006, T010, T019, T023).

## Parallel Opportunities

- Phase 1: T002, T003 in parallel.
- Phase 2: schemas (T005) and the contract harness (T006) are parallel to the interface work; the memory backend is the serial tail.
- US2: the swappable-backend property test (T017) and the SC-002 scan test (T018) are independent files, parallel to each other.
- Phase 7: T026, T027, T029 are independent assertions in the same suite and can be authored in parallel; T028 touches `index.ts`.
- The write-first contract/property tests (T006, T010, T017, T019, T023) can be drafted against the typed stubs ahead of their implementations.

## Implementation Strategy (MVP first)

- **MVP = Phases 1–4 (through US2)** — both P1 stories: a durable web backend (US1) behind a single, swappable, leak-free seam (US2). This is the minimum the rest of the project needs: **stop and validate here**, because features 002–007 all consume this surface and should not start until it is stable.
- Then layer US3 (export/import, P2) and US4 (versioning/migration, P2), then the Phase 7 degradation hardening, incrementally — each is independently testable and shippable.
- Commit after each task or logical group (Constitution IX, atomic); the persistence `CHANGELOG.md` entry lands with this feature (T031).

## Notes

- All paths under `src/platform/`; tests co-located as `*.test.ts` (Vitest, jsdom). No storage/OS call may appear outside `src/platform` — enforced by T018 (SC-002).
- **Cross-feature dependencies**: depends on **001 engine** (canonical board serialization — the in-progress board stores only `request` + player state and is regenerated via `generateBoard`, keeping saves tiny and robust to engine drift). **Consumed by** every stateful feature — Gameplay 002, App Shell 003, Board Modes 004, Journal 005, Settings 006 (shares `SaveBlob`), Tutorial 007 — which import only the `src/platform` barrel. The **009 Tauri/native backend** drops into the `index.ts` selection hook implementing the same `SaveStore` interface with **zero consumer changes** (FR-007).
- The interface is plain async `get`/`set`/`remove`/`exportAll`/`importAll` specifically so a native/file backend (+ Steam Auto-Cloud file patterns) is a drop-in at 009 — do not leak backend specifics into the interface or the typed accessors.
