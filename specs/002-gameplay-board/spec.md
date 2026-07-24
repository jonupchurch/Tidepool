# Feature Specification: Gameplay & Board — The Playable Screen

**Feature Branch**: `002-gameplay-board`

**Created**: 2026-07-24

**Status**: Draft

**Input**: The core play experience — render a board and let the player deduce it. A hex board (from the engine) is shown on a wet-sand canvas; the player marks each cell water or rock, reads the clues, and solves the shore. Solved pools bloom into creatures; a completed board settles with a calm panel. No timer, no fail state, every move reversible, state auto-saved.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deduce and mark a board (Priority: P1)

The player sees a hex board with pre-revealed clues and marks each unknown cell as water or rock (left-click water, right-click rock, configurable). Marks are free and reversible; clues read clearly (`{n}` / `-n-` framing, line totals outside the board).

**Why this priority**: This is the game. Without marking + reading clues there is nothing to play.

**Independent Test**: Load a known board, mark cells via clicks, confirm the visible state updates and clues render correctly.

**Acceptance Scenarios**:

1. **Given** a board is loaded, **When** the player left-clicks an unknown cell, **Then** it becomes marked water; **When** they left-click it again, **Then** it returns to unknown.
2. **Given** a cell is marked water, **When** the player right-clicks it, **Then** it becomes marked rock (mark type swaps).
3. **Given** a clue cell, **When** the board renders, **Then** it shows the number with correct `{}` / `--` framing or a plain line total in the margin.

### User Story 2 - Reward for a solved pool (Priority: P1)

When a connected water pool is fully and correctly marked, it gently animates and a hand-drawn creature appears in it with a soft sound — the core reward.

**Why this priority**: The creatures ARE the reward loop; the game's whole draw is this payoff.

**Independent Test**: Correctly mark all cells of one pool; confirm the pool-complete animation + creature appears exactly once, and not before the pool is fully correct.

**Acceptance Scenarios**:

1. **Given** a pool with all-but-one cells correctly marked water, **When** the last cell is correctly marked, **Then** the pool animates and a creature appears.
2. **Given** a completed pool, **When** the player unmarks a cell in it, **Then** the reward state reverts cleanly (no duplicate creatures on re-completion).

### User Story 3 - Complete the board (Priority: P1)

When every cell is correctly resolved, the shore settles and a calm panel slides up ("The tide's in.") offering Next board / Journal / Home.

**Why this priority**: Closes the loop and feeds the "one more pool" rhythm.

**Independent Test**: Correctly solve an entire small board; confirm the completion panel appears with the three actions.

**Acceptance Scenarios**:

1. **Given** all cells but one are correct, **When** the final cell is correctly marked, **Then** the board-complete panel appears.
2. **Given** the panel is shown, **When** the player picks "Next board", **Then** a new board of the same size/difficulty loads immediately.

### User Story 4 - Undo, redo, and never lose progress (Priority: P2)

Every mark can be undone/redone; leaving and returning restores the exact board state (auto-saved continuously).

**Why this priority**: "Low cost per move" and "walk away anytime" are core pillars; a lost board breaks trust.

**Independent Test**: Make several marks, undo/redo them; reload the screen and confirm the exact state returns.

**Acceptance Scenarios**:

1. **Given** several marks, **When** the player undoes, **Then** marks revert one step at a time; redo re-applies them.
2. **Given** a partially solved board, **When** the player leaves and returns, **Then** the identical marks, progress, and revealed creatures are restored.

### User Story 5 - Optional teaching + comfort aids (Priority: P3)

Hovering a cell can softly highlight the cells/lines it informs (toggleable), and an optional gentle "nudge" gives a faint ripple of doubt on an incorrect mark — never a punishing error.

**Why this priority**: Comfort options widen accessibility without pressure; they're enhancements, not core.

**Independent Test**: Enable hover-highlight and nudge; hover a clue (related cells highlight); make a wrong mark (faint ripple, no penalty, mark still allowed).

**Acceptance Scenarios**:

1. **Given** hover-highlight is on, **When** the player hovers a clue cell, **Then** its related neighbors/line highlight; **When** off, **Then** nothing highlights.
2. **Given** nudge is on, **When** the player marks a cell incorrectly, **Then** a faint ripple shows and the mark is still applied (no counter, no lockout).

### Edge Cases

- Marking a `given`/clue cell does nothing (clues are fixed).
- Rapid clicking / click-drag: each cell toggles predictably; no accidental double-toggles.
- Very large board (~250 cells): rendering + hover stay smooth; the board pans/zooms or scales to fit.
- Completing the board while a pool animation is mid-play: animations resolve gracefully, panel still appears.
- Reduced-motion / colorblind settings active: animations minimized, water/rock distinguished by more than color.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The screen MUST render a hex board supplied by the engine on the wet-sand canvas, drawing each cell in its state (unknown / marked water / marked rock / clue) per the style system.
- **FR-002**: The player MUST be able to mark an unknown cell water or rock and cycle/clear it; the default mapping is left-click = water, right-click = rock, and MUST be overridable by settings (feature 006).
- **FR-003**: Marks MUST be free and reversible with no penalty, mistake counter, or lockout.
- **FR-004**: Clue cells MUST display adjacency numbers with `{}` / `--` connectivity framing, and line/edge totals MUST render just outside their row/diagonal.
- **FR-005**: The screen MUST detect when a connected water pool is fully and correctly marked and play a one-time pool-complete animation with a creature reveal and soft sound.
- **FR-006**: The screen MUST detect board completion (all cells correct) and present a calm completion panel with Next board / Journal / Home.
- **FR-007**: The screen MUST support undo and redo of marks.
- **FR-008**: In-progress board state (marks, revealed pools) MUST auto-save continuously and restore exactly on return (via the persistence feature 008).
- **FR-009**: A top bar MUST show the board label/seed, a progress indicator (pools found / waterline), and a pause/menu control; no timer is shown unless enabled in settings.
- **FR-010**: An optional hover-highlight MUST softly indicate the cells/line a hovered cell informs, toggleable and defaulting per settings.
- **FR-011**: An optional gentle mis-mark "nudge" MUST give non-punishing feedback on an incorrect mark, toggleable.
- **FR-012**: The board MUST remain readable and interactive at all sizes up to ~250 cells (fit-to-viewport with pan/zoom or scaling), and MUST respect reduced-motion and colorblind-safe settings.
- **FR-013**: The screen MUST request the next board from the active board source (feature 004) when the player chooses Next board, preserving the "one more" rhythm.

### Key Entities *(include if feature involves data)*

- **PlaySession**: the live state over a Board — the player's marks per cell, undo/redo history, set of revealed pools, and completion status. (Save shape defined with feature 008.)
- **Pool**: a connected water component of the board's solution (from an engine helper), mapped to a creature by size/rarity for the reward.
- **Mark**: a per-cell player annotation — `water | rock | unknown`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A pool's creature appears the instant — and only when — the pool is fully and correctly marked; unmarking reverts it, with no duplicate rewards, 100% of the time.
- **SC-002**: The board-complete panel appears if and only if every cell is correct, 100% of the time.
- **SC-003**: Leaving and returning restores the exact prior board state (marks, history availability, revealed pools) 100% of the time.
- **SC-004**: Board interaction (mark, hover) stays responsive (no perceptible lag, ~60fps) on a ~250-cell board on a typical desktop.
- **SC-005**: No sequence of marks can produce a "stuck"/error state; every mark is reversible and the board is always in a valid, continuable state.

## Assumptions

- **Rendering**: the board is drawn on Canvas 2D (per `stacks/tidepools.md`), chrome around it in React.
- **Solution access**: the engine board carries the hidden solution and a helper to enumerate connected water pools; the screen compares marks against it for completion + optional nudge.
- **Creature art**: only the crab exists today; other creatures render as styled placeholders until art lands (tracked in PLAN). Creature→pool mapping (by size/rarity) is shared with the Journal (005).
- **Sound**: soft SFX are triggered here but the audio system/assets are a later concern; screen degrades silently if muted/absent.
- **Board source & saves**: getting a board and persisting progress are delegated to features 004 and 008 respectively.

## Dependencies

- **Engine (001)** — supplies the board, solution, clue rendering data, and pool enumeration.
- **Persistence & Platform (008)** — auto-save/restore of the play session.
- **Board Modes (004)** — provides the next board on "Next board".
- **Settings (006)** — control mapping, hover-highlight/nudge defaults, reduced-motion, colorblind, optional timer.
- Governed by the cozy pillars (low cost per move, no timer/fail, always resumable).
