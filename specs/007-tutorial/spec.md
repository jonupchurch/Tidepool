# Feature Specification: Tutorial / How to Play (Onboarding)

**Feature Branch**: `007-tutorial`

**Created**: 2026-07-24

**Status**: Draft

**Input**: A short, optional, skippable, revisitable onboarding that teaches by doing on a tiny guaranteed-solvable board — one concept at a time: (1) rock numbers count neighboring water, (2) mark water vs. rock, (3) `{n}` = one connected group / `-n-` = separate, (4) edge/line totals. Ends with the creature-reward payoff. This consolidates the two overlapping mockups (How-to-Play + Tutorial) into a single flow.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Learn by doing, one concept at a time (Priority: P1)

A new player is walked through a tiny interactive board that introduces each mechanic in sequence, practicing it before moving on, with warm coaching copy and no walls of text.

**Why this priority**: Onboarding is the difference between "I get it" and a bounce; teaching-by-doing is the whole approach.

**Independent Test**: Run the flow start to finish; confirm each step introduces exactly one concept, requires the correct action to advance, and reaches completion.

**Acceptance Scenarios**:

1. **Given** the tutorial starts, **When** step 1 shows, **Then** it teaches rock-number = adjacent water count and requires a correct mark to proceed.
2. **Given** progression, **When** the player reaches the connectivity step, **Then** both `{n}` (connected) and `-n-` (separate) are taught interactively, not just shown.
3. **Given** the final step, **When** completed, **Then** a creature appears (the reward), and the flow offers to play a real board.

### User Story 2 - Skip and revisit (Priority: P2)

The player can skip the tutorial at any point and can re-open it later from the menu.

**Why this priority**: Respect experienced players; keep the lesson available without forcing it.

**Independent Test**: Skip mid-flow → land in the game; later open the tutorial from How-to-play → it runs again cleanly.

**Acceptance Scenarios**:

1. **Given** any tutorial step, **When** the player picks Skip, **Then** the tutorial closes and the game proceeds.
2. **Given** the menu, **When** the player opens How-to-play, **Then** the same tutorial runs from the start.

### Edge Cases

- Wrong action on a teaching step: gentle correction (the same non-punishing nudge as gameplay), step does not advance until correct.
- Reduced-motion: the reward/step animations minimize.
- First-launch auto-offer vs. never forcing: the tutorial may be offered on first run but is always skippable and never blocks reaching the game.
- The `-n-` (split) concept — explicitly taught interactively (the mockups only showed it statically); this feature closes that gap.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tutorial MUST teach, interactively and one at a time, the four core mechanics: adjacency numbers, marking water/rock, `{n}` connected vs `-n-` split, and line/edge totals — on a tiny guaranteed-solvable board.
- **FR-002**: Each step MUST require the correct action to advance and give gentle, non-punishing correction on a wrong action (consistent with Gameplay's nudge).
- **FR-003**: The `-n-` split concept MUST be taught interactively (not merely displayed).
- **FR-004**: The tutorial MUST be skippable at any step and MUST never block reaching the game.
- **FR-005**: The tutorial MUST be revisitable from the menu (How-to-play) and run cleanly from the start each time.
- **FR-006**: Completion MUST deliver the creature-reward payoff and offer to start a real board.
- **FR-007**: There MUST be exactly one onboarding flow (the two overlapping mockups are consolidated); it MUST respect reduced-motion and accessibility settings.
- **FR-008**: The tutorial board(s) MUST be fixed/deterministic (authored or fixed-seed) so the guided steps always line up.

### Key Entities *(include if feature involves data)*

- **TutorialStep**: `{ concept, coaching copy, the cells/actions it requires, the clue(s) it highlights }`.
- **TutorialFlow**: the ordered steps over a fixed tiny board; tracks current step + completion.
- **OnboardingState**: whether the player has completed/seen it (persisted, to decide first-run auto-offer).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time player can complete the tutorial and correctly solve a real Calm board immediately after (validated by playtest / e2e of the taught actions).
- **SC-002**: Every step advances only on the correct action and never hard-blocks (skip always available), 100%.
- **SC-003**: All four mechanics — including `-n-` split — are each taught interactively at least once.
- **SC-004**: The tutorial is reachable from the menu and reruns cleanly.
- **SC-005**: Completion reliably shows the creature reward and the "play for real" hand-off.

## Assumptions

- **Fixed boards**: the tutorial uses authored/fixed-seed boards (via the engine) so guided steps are stable and reproducible.
- **Consolidation**: the two mockup flows (How-to-Play + Tutorial) become one; the better interactive board-based approach wins, the card-only approach is dropped.
- **Reuse**: the tutorial renders the real board + input via Gameplay's renderer where practical, constrained to the current lesson's allowed actions.
- **First-run offer** is stored in onboarding state; the player is never forced.

## Dependencies

- **Gameplay (002)** — board rendering, marking, and the nudge feedback are reused/constrained for lessons.
- **Engine (001)** — supplies the fixed tiny boards and clue data.
- **App Shell (003)** — menu entry (How-to-play), routing, first-run offer.
- **Persistence (008)** — onboarding completion state.
- **Settings (006)** — reduced-motion / accessibility respected.
