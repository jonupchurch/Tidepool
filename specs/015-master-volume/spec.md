# Feature Specification: Master Volume

**Feature Branch**: `015-master-volume`

**Created**: 2026-08-13

**Status**: Draft

**Input**: Add a master volume control. It can control both the music and the sound effects volume.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set the game to a comfortable level (Priority: P1)

The player finds the game too loud (or too quiet) and moves one control until it sits right. Both the ambient bed and the marks landing move together, keeping their balance with each other.

**Why this priority**: This is the feature. Today the only sound controls are two switches — mute (all or nothing) and music (on or off). A player who wants the game *quieter* has no answer but silence.

**Independent Test**: Move the control to a mid position and confirm both channels are audibly reduced, and that their relative balance is unchanged.

**Acceptance Scenarios**:

1. **Given** the volume control, **When** the player lowers it, **Then** music and sound effects both become quieter by the same proportion.
2. **Given** the volume control at zero, **When** a sound effect fires, **Then** nothing is audible.
3. **Given** a chosen level, **When** the app is restarted, **Then** the level is still there.

---

### User Story 2 - Adjust without leaving the board (Priority: P1)

A board is open and the volume is wrong. The player pauses, adjusts, and resumes — without abandoning the board or hunting through a menu.

**Why this priority**: Identical to the reasoning already recorded for the music switch (014 US3): needing to change the volume is usually urgent, and making someone leave a board to do it is a poor answer. The precedent is set; this control should honour it.

**Independent Test**: Open Pause on a live board, move the control, resume, and confirm the board is untouched and the level changed.

**Acceptance Scenarios**:

1. **Given** the Pause overlay, **When** the player moves the volume control, **Then** the level changes immediately and the board state is unaffected.
2. **Given** a level set from Pause, **When** the player later opens Home, **Then** Home's control shows that same level.

---

### User Story 3 - Reachable by keyboard and screen reader (Priority: P2)

A player who does not use a mouse focuses the control and adjusts it with the arrow keys, hearing the level announced.

**Why this priority**: Every other control in the shell is a real, named, keyboard-reachable element, and `a11y.test.tsx` enforces it. A volume control built from a `div` and pointer handlers would be the first exception.

**Independent Test**: Tab to the control, press the arrow keys, and confirm the value moves and is announced.

**Acceptance Scenarios**:

1. **Given** the volume control, **When** it receives focus, **Then** it exposes the slider role with an accessible name.
2. **Given** the focused control, **When** an arrow key is pressed, **Then** the level moves by one step and the new level is announced as a percentage.

---

## Requirements *(mandatory)*

- **FR-001**: A single control MUST set one level that governs both the music channel and the sound-effect channel together.
- **FR-002**: The control MUST be present on Home and in the Pause overlay, reading and writing the same stored level.
- **FR-003**: A change MUST take effect immediately, without a confirm step and without restarting audio.
- **FR-004**: The level MUST persist across restarts, via the existing settings record.
- **FR-005**: The control MUST be a native range input — keyboard-operable, screen-reader-labelled, and touch-draggable without bespoke pointer code.
- **FR-006**: The control MUST announce its value as a percentage rather than a raw 0–1 fraction.
- **FR-007**: Mute MUST remain an independent switch. Moving the volume control MUST NOT clear or set mute, and mute MUST continue to silence everything regardless of level.
- **FR-008**: While muted, the control MUST remain operable (so a level can be set in advance) but MUST indicate that what it sets is not currently audible.
- **FR-009**: The relative balance between music and effects MUST be preserved at every level — the master scales both, it does not mix them.
- **FR-010**: Moving the control MUST NOT modify any other setting.

### Key Entities

- **`Settings.sound.volume`** — the existing 0–1 master level. Already read by `AppShell` and applied to the engine's master gain node. This feature gives it a UI; it does not introduce a new field.

## Assumptions & Non-Goals

- **Per-channel sliders are out of scope.** `sound.sfx` and `sound.ambient` exist in the model and already have their own gain nodes, but the ask is a *master* control. Separate music/effects sliders are worth doing and are named here as future work, not folded in.
- **No Settings screen.** There still isn't one (`useSettings.ts` says so explicitly). This feature does not create one; it adds a control to the two surfaces that already carry sound controls.
- **Step granularity is 5%.** Fine enough to level a game by, coarse enough that a full drag writes ~20 settings records rather than one per pixel.
- **The existing `changePrefs` theme-clobber is not fixed here.** `AppShell.changePrefs` writes an explicit `Day`/`Night` on every prefs change, which would destroy a stored `Auto` theme. It is pre-existing, unreachable without a hand-edited save (no Settings screen exposes `Auto`), and out of scope — this feature deliberately routes volume through its own setter rather than through `ShellPrefs` so it does not widen that bug's reach.

## Success Criteria *(mandatory)*

- **SC-001**: One control changes the loudness of both channels; no board behaviour changes anywhere.
- **SC-002**: A level set on either surface is visible on the other and survives a restart.
- **SC-003**: The control is operable by keyboard alone and carries an accessible name and a percentage value.
- **SC-004**: `a11y.test.tsx`'s existing guarantees still hold, and the Pause overlay's action list is unchanged when no volume handler is wired.
