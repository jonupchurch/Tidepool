# Feature Specification: Persistence & Platform Seam

**Feature Branch**: `008-persistence-platform`

**Created**: 2026-07-24

**Status**: Draft

**Input**: The cross-cutting storage layer + the platform abstraction. All local data — in-progress board, settings, journal/discoveries, lifetime stats, curated progress, onboarding state, shell prefs — is read/written through one seam with a web implementation now (localStorage/IndexedDB) and a Tauri implementation later, plus export/import of the whole save. No database; the seed design keeps data small. Nothing OS-specific leaks into game/ui.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nothing is ever lost (Priority: P1)

Every piece of local progress is durably saved and restored exactly — the in-progress board, discoveries, stats, settings, curated completion — surviving reloads, crashes, and app restarts.

**Why this priority**: "Walk away and come back" is a core pillar; the whole game trusts this layer.

**Independent Test**: Write each data type, restart the app/environment, read them back identical.

**Acceptance Scenarios**:

1. **Given** any saved data, **When** the app restarts, **Then** it is restored byte-for-byte.
2. **Given** an in-progress board, **When** the tab/app closes unexpectedly, **Then** on reopen the exact state is available.

### User Story 2 - One seam, swappable backend (Priority: P1)

The game reads/writes only through a single platform interface; the web backend (browser storage) can be swapped for a Tauri (native) backend later without touching game or UI code.

**Why this priority**: This is what makes the web→desktop port a wrap, not a rewrite (a founding stack decision).

**Independent Test**: Point the seam at a fake/in-memory backend in tests; the same game code works unchanged. Confirm no `localStorage`/Tauri call exists outside the seam.

**Acceptance Scenarios**:

1. **Given** the game code, **When** scanned, **Then** no direct storage/OS API calls exist outside `src/platform`.
2. **Given** the seam interface, **When** a different backend is provided, **Then** all consumers work unchanged.

### User Story 3 - Export / import save (Priority: P2)

The player can export their entire save as a portable blob and import it on another machine; malformed imports are rejected safely.

**Why this priority**: Cross-device portability (before Steam Cloud) and a trust/backup feature.

**Independent Test**: Export the full save, wipe, import it → identical progress; import a corrupt blob → rejected, existing data intact.

**Acceptance Scenarios**:

1. **Given** progress, **When** exported then imported into a fresh install, **Then** all progress is restored.
2. **Given** a malformed blob, **When** imported, **Then** it is rejected with a gentle message and current data is untouched.

### User Story 4 - Schema versioning & migration (Priority: P2)

Saved data carries a schema version; when the shape changes across releases, older saves migrate forward rather than breaking.

**Why this priority**: A shipped game evolves; players must not lose progress on update.

**Independent Test**: Load a fixture from an older schema version → it migrates to current and reads correctly.

**Acceptance Scenarios**:

1. **Given** an older-versioned save, **When** loaded, **Then** it is migrated to the current schema and usable.
2. **Given** an unknown/newer version, **When** loaded, **Then** it is handled safely (refuse + preserve, not corrupt).

### Edge Cases

- Storage full / quota exceeded: fail gracefully with a message; never lose already-saved data.
- Corrupt/partial record for one key: isolate the damage (that key resets to default) without nuking everything.
- Concurrent writes (rapid autosave): last-write-wins per key, no interleaving corruption.
- Private-browsing / storage disabled: degrade to in-memory for the session with a gentle notice.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a single platform/persistence interface for all local data: in-progress board, settings, journal/discoveries, lifetime stats, curated progress, onboarding state, shell prefs.
- **FR-002**: A **web backend** MUST implement the interface using appropriate browser storage (small key-value in localStorage; larger blobs in IndexedDB).
- **FR-003**: No consumer (game/ui) MUST call storage or OS APIs directly — only through the seam (Constitution + stack pack rule).
- **FR-004**: All persisted data MUST survive reloads, crashes, and restarts, restoring exactly.
- **FR-005**: The system MUST support exporting the entire save as a portable, versioned blob and importing it, validating and rejecting malformed/incompatible blobs without corrupting current data.
- **FR-006**: All persisted structures MUST carry a **schema version**, with forward **migration** for older versions and safe handling of unknown/newer versions.
- **FR-007**: The interface MUST be swappable to a **Tauri/native backend** (feature 009) and to a fake/in-memory backend (tests) with no consumer changes.
- **FR-008**: Failures (quota, corruption, disabled storage) MUST degrade gracefully and never destroy unrelated saved data.

### Key Entities *(include if feature involves data)*

- **SaveStore (interface)**: `get/set/remove` per namespaced key + `exportAll/importAll`; the seam every consumer uses.
- **PersistedSchemas**: versioned shapes for InProgressBoard, Settings, Journal (discoveries), Stats, CuratedProgress, OnboardingState, ShellPrefs.
- **SaveBlob**: `{ version, <all namespaces> }` — the export/import unit (shared with Settings 006).
- **Migration**: `(fromVersion, data) → currentData`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of persisted data types restore exactly across a restart.
- **SC-002**: Zero direct storage/OS calls outside `src/platform` (enforced by a test/lint scan).
- **SC-003**: Export→import round-trips with zero loss; malformed import is rejected with current data intact.
- **SC-004**: An older-schema fixture migrates forward and reads correctly; unknown versions never corrupt data.
- **SC-005**: Under simulated quota/corruption/disabled-storage, the app degrades gracefully and preserves all still-valid data.

## Assumptions

- **No database** (the decided architecture): seeds + small structured records fit localStorage/IndexedDB; SQLite is unnecessary and would split the backend (per the earlier decision).
- **Data volume** is small: settings, a handful of in-progress boards, a journal of tens of creatures, counters.
- **Tauri backend** (009) will implement the same interface using native storage + Steam Auto-Cloud file patterns; the interface is designed to accommodate it.
- **Serialization** is JSON; the engine's canonical board serialization is used for in-progress boards.

## Dependencies

- **Consumed by** every stateful feature: Gameplay (002) saves, App Shell (003) prefs/resume, Board Modes (004) curated progress, Journal (005) discoveries/stats, Settings (006) settings + save blob, Tutorial (007) onboarding state.
- **Desktop Packaging (009)** provides the Tauri backend implementation of this seam.
- **Engine (001)** — canonical board serialization for saved boards.
