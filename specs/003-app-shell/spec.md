# Feature Specification: App Shell — Home, Splash & Pause

**Feature Branch**: `003-app-shell`

**Created**: 2026-07-24

**Status**: Draft

**Input**: The connective tissue that ties the screens together — a calm Home/main menu, a warm Splash/loading screen, a Pause overlay, and the navigation between screens. Home is the inviting landing that routes to Play, Curated, Endless, Seed entry, Journal, Settings, and How-to-play, and surfaces a "continue your pool" resume plus light stats. Everything breathes; nothing urgent.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Land on Home and start playing (Priority: P1)

The player opens the game to a warm shoreline Home with a big **Play** button that drops straight into a board at their last size/difficulty, plus clear entries to Curated shores, the Endless size/difficulty picker, Enter-a-seed, Shore Journal, Settings, and How-to-play.

**Why this priority**: Home is the front door and the fastest path into the game; without it the player can't navigate.

**Independent Test**: Open the app, land on Home, click Play, arrive in Gameplay with the expected size/difficulty.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** Home renders, **Then** Play plus all secondary entries (Curated, Journal, Settings, How-to-play, seed entry, Endless picker) are visible and reachable.
2. **Given** Home, **When** the player clicks Play, **Then** Gameplay opens with a board at the player's last-used size/difficulty.

### User Story 2 - Resume an in-progress board (Priority: P2)

If a board is in progress, Home shows a "Continue your pool" card (a mini board preview, progress, seed) that returns the player to the exact saved state.

**Why this priority**: Supports the "walk away and come back" pillar and pulls players back in.

**Independent Test**: Leave a board mid-solve, return to Home, use the resume card, land on the exact saved board.

**Acceptance Scenarios**:

1. **Given** a saved in-progress board, **When** Home renders, **Then** the resume card shows its progress and seed; **When** clicked, **Then** Gameplay restores that exact state.
2. **Given** no board in progress, **When** Home renders, **Then** the resume card is absent (not an empty shell).

### User Story 3 - Splash / loading (Priority: P2)

On first load (or while generating), a calm splash shows the wordmark + crab, a themed loading indicator, and a rotating flavor tip; it sets the unhurried tone and never blocks longer than needed.

**Why this priority**: First impression + covers any load latency gracefully; low functional risk.

**Independent Test**: Trigger the splash; confirm wordmark, loader animation, and a rotating tip appear; it dismisses when ready.

**Acceptance Scenarios**:

1. **Given** the app is loading, **When** the splash shows, **Then** it displays the wordmark, a themed loader, and a rotating tip, and dismisses to Home/Gameplay when ready.

### User Story 4 - Pause from a board (Priority: P2)

From the Gameplay top bar, the player opens a soft Pause overlay over the frozen board with Resume, New board, Restart this board, Settings, Home, and a reassurance line ("Your board is saved.").

**Why this priority**: "Pausing is just stepping away" — it must feel safe and frictionless.

**Independent Test**: Open Pause from Gameplay; confirm the five actions + reassurance; Resume returns to the exact board.

**Acceptance Scenarios**:

1. **Given** Gameplay, **When** the player opens Pause, **Then** the board freezes under a scrim and the pause actions + "board is saved" line appear.
2. **Given** Pause, **When** the player picks Resume, **Then** the exact board returns; **When** Home, **Then** Home loads with the board still saved.

### User Story 5 - Global toggles + navigation (Priority: P3)

A mute toggle and a Day/Night (theme) toggle are reachable from Home; navigation between all screens is consistent and calm (soft transitions, no jarring jumps).

**Why this priority**: Convenience + polish; not required to play.

**Independent Test**: Toggle mute and theme from Home; navigate across screens and back; state persists.

**Acceptance Scenarios**:

1. **Given** Home, **When** the player toggles Night, **Then** the app switches to the Night Tide theme and remembers it.
2. **Given** any screen, **When** the player navigates back, **Then** they return without losing prior context.

### Edge Cases

- Cold start with no saved data: Home shows zeros/empty-but-warm states, no resume card, sensible defaults.
- Rapid navigation / double activation: no duplicate screens or stuck transitions.
- Reduced-motion: transitions and splash animation minimize.
- Pause opened, then the app is closed and reopened: returns to a safe state (Home or the saved board) with progress intact.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST present a Home screen with a primary Play action and reachable entries to Curated shores, Endless size/difficulty selection, Enter-a-seed, Shore Journal, Settings, and How-to-play.
- **FR-002**: Play MUST start a board at the player's last-used size/difficulty (defaults if none), handing the request to the board-source (feature 004) and opening Gameplay (002).
- **FR-003**: Home MUST show a "Continue your pool" resume affordance when an in-progress board exists (with progress + seed), and omit it otherwise; activating it restores the exact saved board.
- **FR-004**: Home MUST show light stats (e.g., boards solved, most recent creature / creatures found) sourced from the journal/persistence layer.
- **FR-005**: The app MUST show a Splash/loading screen with the wordmark, crab, a themed loading indicator, and a rotating tip; it MUST dismiss when the target screen is ready.
- **FR-006**: Gameplay MUST be able to open a Pause overlay offering Resume, New board, Restart this board, Settings, and Home, with a "board is saved" reassurance; Resume returns to the exact board.
- **FR-007**: The app MUST provide navigation between all screens with calm transitions, and MUST expose global mute and theme (Day / Night Tide) toggles from Home.
- **FR-008**: The theme choice MUST persist and apply app-wide (defers actual theme tokens to Settings/006 which owns Night Tide).
- **FR-009**: All screens and transitions MUST respect reduced-motion and render correctly with no saved data (warm empty states).

### Key Entities *(include if feature involves data)*

- **Screen/Route**: the current view (Home, Gameplay, Curated, Journal, Settings, Tutorial, Splash) and navigation between them.
- **ResumeSnapshot**: the summary of an in-progress board shown on Home (progress, seed, size/difficulty) — read from persistence (008).
- **ShellPrefs**: mute + theme, persisted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a cold open, the player can reach a playable board in ≤2 clicks (Play, or Play→picker), 100% of the time.
- **SC-002**: The resume card appears if and only if a valid in-progress board exists, and restores the exact state 100% of the time.
- **SC-003**: Pause always returns the player to the exact board via Resume; leaving to Home never loses the saved board.
- **SC-004**: Theme and mute toggles persist across restarts.
- **SC-005**: Every screen renders correctly with zero saved data (no crashes, no empty grey voids — warm defaults).

## Assumptions

- **Navigation** is client-side only (single-page app; no URLs required for v1, though a light in-app router is fine).
- **Home embeds** the Endless picker + Curated/Seed entry *controls*, but the board-source *behavior* (what a difficulty selection or seed does) belongs to feature 004.
- **Theme tokens** (Day / Night Tide) are defined by Settings (006); the shell only stores + applies the choice.
- **Stats + resume data** come from persistence/journal (008 / 005); the shell reads, it does not own them.
- **Splash** does not require a real progress percentage; it's a tone-setter that dismisses when ready.

## Dependencies

- **Board Modes (004)** — starting a board from Home's entries.
- **Gameplay (002)** — the screen Play/Resume open, and the source of the Pause trigger.
- **Persistence (008)** — resume snapshot, stats, shell prefs.
- **Settings (006)** — owns theme tokens (Day / Night Tide) the shell applies.
- **Journal (005)** — recent-creature / creatures-found stat on Home.
