# Feature Specification: Desktop Packaging — Tauri + Steam

**Feature Branch**: `009-desktop-packaging`

**Created**: 2026-07-24

**Status**: Draft

**Input**: The final phase — wrap the finished web app in Tauri to ship a native binary on Steam, without rewriting the game. Implement the Tauri backend of the platform seam (native storage), integrate Steamworks (achievements + Auto-Cloud saves), self-host fonts for offline use, and set up the build/release pipeline. Accepted trade-off: the Steam in-game overlay may not inject into a webview app; achievements + cloud saves are enough.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Native desktop build (Priority: P1)

The exact same web game runs as a native desktop application (a small Tauri binary), launching to the game with no browser chrome and working fully offline.

**Why this priority**: This is the deliverable — a shippable Steam build. Without it there's no Steam release.

**Independent Test**: Build the Tauri app on a dev machine; launch the binary; play a board offline end-to-end.

**Acceptance Scenarios**:

1. **Given** the built desktop app, **When** launched, **Then** it opens directly to the game (no browser UI) and is fully playable offline.
2. **Given** the desktop app, **When** compared to the web build, **Then** game behavior is identical (it's a wrap, not a fork).

### User Story 2 - Native saves via the platform seam (Priority: P1)

All progress persists through the existing platform seam, now backed by native storage — no game/UI code changes, just a swapped backend.

**Why this priority**: Proves the seam strategy and ensures desktop players keep their progress.

**Independent Test**: Play, quit the native app, relaunch → exact progress restored via the Tauri backend; confirm no game/ui code changed to enable it.

**Acceptance Scenarios**:

1. **Given** the desktop app, **When** progress is made and the app relaunched, **Then** all data restores via the native backend.
2. **Given** the codebase, **When** the Tauri backend is added, **Then** it implements the existing `SaveStore` interface and no consumer changes.

### User Story 3 - Steam achievements + cloud saves (Priority: P2)

The game unlocks Steam achievements at the right moments and syncs saves via Steam Auto-Cloud so progress follows the player across machines.

**Why this priority**: The agreed Steam integration scope (overlay explicitly out); achievements + cloud are the value.

**Independent Test**: In a Steam dev/test environment, trigger an achievement condition → it unlocks; move to another machine → Auto-Cloud restores the save.

**Acceptance Scenarios**:

1. **Given** an achievement condition is met, **When** it triggers, **Then** the corresponding Steam achievement unlocks.
2. **Given** progress on machine A, **When** the player launches on machine B, **Then** Steam Auto-Cloud has synced the save.

### User Story 4 - Offline assets + release pipeline (Priority: P2)

Fonts and all assets are bundled/self-hosted (no external fetches), and there is a repeatable build+upload pipeline to Steam (SteamPipe).

**Why this priority**: A store build must be self-contained and repeatably shippable.

**Independent Test**: Disconnect the network, launch the app → fonts/assets render correctly; run the release pipeline → a build uploads to a Steam depot.

**Acceptance Scenarios**:

1. **Given** no network, **When** the app launches, **Then** Bricolage + Nunito and all assets render from bundled files (no external requests).
2. **Given** the pipeline, **When** run, **Then** a versioned build is produced and uploaded to the configured Steam depot.

### Edge Cases

- Steam not running / not installed (e.g., a non-Steam build or dev run): the game still runs; Steam features no-op gracefully, saves fall back to the native local backend.
- In-game overlay unavailable (expected for a webview app): documented; no feature depends on it.
- Steam Deck (Linux) target: the webview backend (webkitgtk) runs; input/scaling verified; controller/cursor scheme handled by the input layer.
- Save conflict from Auto-Cloud (two machines): last-write / Steam's conflict resolution surfaced gently; no silent data loss.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST package the existing web app as a native desktop binary (Tauri) that launches directly to the game with no browser chrome and runs fully offline.
- **FR-002**: Desktop behavior MUST be identical to the web build (a wrap of the same codebase, not a fork).
- **FR-003**: The system MUST implement the platform seam's `SaveStore` (feature 008) with a native backend, with **no changes to game/ui consumers**.
- **FR-004**: The system MUST integrate Steam **achievements**, unlocking them at the correct in-game moments.
- **FR-005**: The system MUST enable Steam **Auto-Cloud** save syncing (file-pattern based) so progress follows the player across machines.
- **FR-006**: The system MUST bundle/self-host all fonts and assets so no external network requests occur at runtime.
- **FR-007**: The system MUST provide a repeatable build + Steam upload (SteamPipe) pipeline producing versioned builds.
- **FR-008**: When Steam is absent or an integration is unavailable (incl. the overlay), the game MUST still run and degrade gracefully (local saves, no-op Steam calls).
- **FR-009**: Steam-specific code MUST live behind the platform seam / a thin native layer; the web build MUST remain buildable and unaffected.

### Key Entities *(include if feature involves data)*

- **DesktopBackend**: the Tauri implementation of `SaveStore` (native file storage) + Steam bindings.
- **AchievementMap**: in-game events → Steam achievement IDs.
- **BuildArtifact**: a versioned desktop build + its Steam depot mapping.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The native binary launches to a fully-playable, offline game with behavior identical to the web build.
- **SC-002**: Progress persists via the native backend with zero changes to game/ui code.
- **SC-003**: Achievements unlock at the correct moments in a Steam test environment; Auto-Cloud syncs a save across two machines.
- **SC-004**: With the network disconnected, all fonts/assets render from bundled files (zero external requests).
- **SC-005**: With Steam absent, the game runs and saves locally with no errors.
- **SC-006**: The release pipeline produces and uploads a versioned build repeatably.

## Assumptions

- **Tauri, not Electron** (decided) — small native shell over the OS webview; the web build is the source of truth.
- **Overlay out of scope** (accepted): the Steam in-game overlay likely won't inject into a webview; nothing depends on it. Achievements + Auto-Cloud deliver the integration value.
- **Rust toolchain** is a prerequisite for building Tauri (not yet installed — a setup step for this phase).
- **This is the last feature** — built after the game is complete on web; it changes packaging + adds the native backend, not gameplay.
- **Steam Deck** is a nice-to-have target validated opportunistically, not a launch gate.

## Dependencies

- **Persistence & Platform seam (008)** — provides the `SaveStore` interface this feature implements natively.
- **All gameplay features (001–007)** — must be complete on web first; this wraps them.
- **Settings (006)** — Auto-Cloud syncs the save blob it defines.
- External: Rust/Tauri toolchain, a Steam partner account + app/depot, Steamworks SDK.
