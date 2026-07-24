# Feature Specification: Settings & Themes (incl. Night Tide dark mode)

**Feature Branch**: `006-settings-themes`

**Created**: 2026-07-24

**Status**: Draft

**Input**: A calm, grouped settings surface plus the theme system. Few options, no shaming: Sound, Visuals (incl. the Day / Night Tide / Auto theme), Controls, Comfort/Assist, Play defaults, and Data (local save + export/import). Changes apply live. This feature owns the theme token definitions the rest of the app applies, including the not-yet-built Night Tide dark mode.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adjust settings, applied live (Priority: P1)

The player opens Settings and adjusts grouped options (sound, visuals, controls, comfort, play defaults); changes apply immediately and persist.

**Why this priority**: Settings are how players make the game comfortable; they must work and stick.

**Independent Test**: Change several settings; confirm each takes effect live and survives a restart.

**Acceptance Scenarios**:

1. **Given** Settings, **When** the player changes the control mapping / a comfort toggle / a sound level, **Then** the change applies live and is remembered on restart.
2. **Given** Settings, **When** the player presses Done, **Then** the panel closes with all changes retained.

### User Story 2 - Switch theme, including Night Tide (Priority: P1)

The player chooses Daylight / Night Tide / Auto; the whole app re-themes live. Night Tide is a designed dark mode (moonlit shore), not an inversion.

**Why this priority**: Dark mode is a top requested comfort feature and is specced-but-unbuilt; this feature delivers it.

**Independent Test**: Switch to Night Tide; confirm every screen adopts the dark palette; switch to Auto and confirm it follows the OS preference.

**Acceptance Scenarios**:

1. **Given** any screen, **When** the player selects Night Tide, **Then** the app applies the night palette app-wide and persists it.
2. **Given** Auto, **When** the OS theme changes, **Then** the app follows it.

### User Story 3 - Accessibility & comfort options (Priority: P2)

The player can enable reduce-motion, high-contrast cells, colorblind-safe water/rock distinction, cell-size scaling, and comfort aids (hover-highlight, mis-mark nudge, line-total helper) — framed as comfort, never "easy mode."

**Why this priority**: Accessibility is a core value (and a Steam quality signal); these widen who can play comfortably.

**Independent Test**: Enable each accessibility option; confirm the board/UI respects it (motion reduced, cells distinguishable without color, larger cells, etc.).

**Acceptance Scenarios**:

1. **Given** reduce-motion on, **When** animations would play, **Then** they are minimized app-wide.
2. **Given** colorblind-safe on, **When** the board renders, **Then** water vs rock is distinguishable by more than color (texture/icon/shape).

### User Story 4 - Play defaults + data (Priority: P2)

The player sets default board size/difficulty and optional stopwatch, and can reset progress (soft confirm) or export/import their save for moving between machines.

**Why this priority**: Control over defaults + data portability; reset/export are trust features.

**Independent Test**: Set defaults (used by Play), toggle stopwatch, export the save blob and re-import it, reset progress behind a confirm.

**Acceptance Scenarios**:

1. **Given** default size/difficulty set, **When** the player uses Play from Home, **Then** it uses those defaults.
2. **Given** Data, **When** the player exports then imports the save, **Then** progress is preserved; **When** they reset, **Then** a soft confirm is required first.

### Edge Cases

- First run: sensible defaults for every setting; nothing undefined.
- Import of a malformed/incompatible save blob: rejected with a gentle message, existing save untouched.
- Auto theme with no OS signal available: falls back to Daylight.
- Reset progress: clears saves/journal only after explicit confirm; never on a single misclick.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Settings MUST present grouped options — Sound (master volume, SFX, ambient, music), Visuals (theme, reduce-motion, high-contrast, colorblind-safe, cell size), Controls (swap click mapping, tap-to-cycle, confirm-before-clear), Comfort (hover-highlight, mis-mark nudge, line-total helper), Play (default size/difficulty, optional stopwatch, reset progress), Data (export/import save).
- **FR-002**: All settings MUST apply live and persist across sessions (via persistence 008).
- **FR-003**: The system MUST provide three themes — **Daylight**, **Night Tide** (a designed dark palette), and **Auto** (follows OS) — applied app-wide; this feature OWNS the theme token definitions.
- **FR-004**: The board and UI MUST honor reduce-motion, high-contrast, colorblind-safe (non-color water/rock distinction), and cell-size settings.
- **FR-005**: Comfort aids (hover-highlight, mis-mark nudge, line-total helper) MUST be toggleable and consumed by Gameplay (002); framed as comfort, not difficulty.
- **FR-006**: Control settings (swap left/right mapping, tap-to-cycle for trackpad, confirm-before-clear) MUST be consumed by Gameplay's input handling.
- **FR-007**: Play defaults (size/difficulty) MUST feed Home's Play and the Endless picker's initial state; optional stopwatch MUST be surfaced in Gameplay only when enabled.
- **FR-008**: The system MUST support exporting the full save as a portable blob and importing it, rejecting malformed/incompatible blobs with a gentle message and leaving the current save intact.
- **FR-009**: Reset progress MUST require a soft confirmation before clearing saves/journal.
- **FR-010**: Every setting MUST have a sensible first-run default.

### Key Entities *(include if feature involves data)*

- **Settings**: the full grouped preference set (sound, visuals/theme, controls, comfort, play, data), persisted as one object with a schema version.
- **ThemeTokens**: the Daylight and Night Tide token sets (colors, applied via the shell); the source of truth for palettes.
- **SaveBlob**: the exportable/importable serialization of all local progress (settings + saves + journal), versioned.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every setting applies live and is restored correctly after restart (100%).
- **SC-002**: Selecting Night Tide re-themes every screen with the designed dark palette; Auto follows the OS signal.
- **SC-003**: With colorblind-safe on, water and rock are distinguishable without relying on hue (verified by a non-color cue on every cell state).
- **SC-004**: Export→import round-trips a save with zero loss; a malformed import is rejected without corrupting the existing save.
- **SC-005**: Reset never occurs without an explicit confirm.

## Assumptions

- **Persistence** stores the settings object + save blob (008); this feature defines the schema, storage is delegated.
- **Theme application** mechanism (setting a `data-theme` / token set) is provided by the App Shell (003); this feature supplies the token *values*, including Night Tide (which the mockups left unbuilt).
- **Consumers** (Gameplay, Home) read settings; this feature is the source of truth for their values.
- **Music** may be absent in early builds; the toggle exists and no-ops gracefully until audio lands.

## Dependencies

- **Persistence (008)** — stores settings + the export/import save blob.
- **App Shell (003)** — applies the theme tokens this feature defines.
- **Gameplay (002)** — consumes control mapping, comfort aids, cell size, reduced-motion, colorblind, stopwatch.
- **Board Modes (004) / Home (003)** — consume default size/difficulty.
- Accessibility posture aligns with the brief (reduce-motion, colorblind-safe, high-contrast, legible numerals).
