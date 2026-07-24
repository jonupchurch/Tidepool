# Feature Specification: Board Modes — Endless, Curated & Seed Entry

**Feature Branch**: `004-board-modes`

**Created**: 2026-07-24

**Status**: Draft

**Input**: The ways a player starts a board — all producing a seed+params handed to Gameplay. **Endless tide**: an infinite stream at a chosen size/difficulty, "next" advances deterministically. **Curated shores**: a hand-tuned pack of blessed seeds along a gentle difficulty curve, browsable as a coastline path with completion marks. **Enter a seed**: type/paste a seed to jump to that exact, shareable board. Everything is a seed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Endless tide (Priority: P1)

The player picks a size (Small/Medium/Large) and difficulty (Calm/Tricky/Deep) and plays an endless stream of fresh boards; finishing one offers the next immediately, preserving the "one more pool" rhythm. The stream is deterministic (reproducible from its starting seed).

**Why this priority**: Endless is the core replay engine and the default Play target.

**Independent Test**: Choose Medium/Tricky, start; complete a board, get the next; confirm the same starting point reproduces the same stream.

**Acceptance Scenarios**:

1. **Given** a chosen size + difficulty, **When** the player starts Endless, **Then** a matching board loads and "Next board" yields another board at that size/difficulty.
2. **Given** an endless stream from a starting seed, **When** replayed from that start, **Then** it produces the identical sequence of boards.

### User Story 2 - Curated shores (Priority: P1)

The player browses a calm, ordered set of hand-tuned boards (a coastline path), each showing a name, a difficulty marker, its seed, and completion state (with the earned creature peeking out when solved). Selecting one loads that exact seed.

**Why this priority**: Curated is the designed on-ramp and the "campaign"; it delivers the tuned difficulty curve.

**Independent Test**: Open Curated, see the ordered list with completion marks; select an entry; land on that exact board; on solving, its completion mark updates.

**Acceptance Scenarios**:

1. **Given** the curated pack, **When** it renders, **Then** each entry shows name, difficulty, seed, and solved/unsolved state in order.
2. **Given** a curated entry, **When** selected, **Then** Gameplay loads that entry's exact seed/params; **When** solved, **Then** its completion + earned creature are recorded and shown.

### User Story 3 - Enter a seed (Priority: P2)

The player types or pastes a seed (with size/difficulty) and jumps straight to that exact board — the same board a friend sees for the same seed.

**Why this priority**: First-class sharing/reproducibility; a core consequence of the seed design.

**Independent Test**: Enter a known seed, jump to the board; enter the same seed on a fresh session and confirm the identical board.

**Acceptance Scenarios**:

1. **Given** a valid seed input, **When** the player submits it, **Then** Gameplay loads that exact board.
2. **Given** an invalid/garbled seed, **When** submitted, **Then** a gentle inline message explains it and no board loads.

### User Story 4 - Gentle curated gating (Priority: P3)

Curated entries may be gently gated ("solve a couple more to unlock the next stretch") or fully open; the tone stays unhurried, never a hard wall.

**Why this priority**: Optional pacing nicety; can ship fully open.

**Independent Test**: With gating enabled, confirm locked entries show a soft lock and unlock as prerequisites are solved.

**Acceptance Scenarios**:

1. **Given** gating is on, **When** prerequisites are unmet, **Then** the entry shows a soft "unlock soon" state and cannot be entered; **When** met, **Then** it unlocks.

### Edge Cases

- Seed entry with valid seed but missing/implicit size+difficulty: apply sensible defaults or infer from a full seed token; never silently produce a different board than a shared one intends.
- Curated manifest entry whose seed fails to generate a valid board at its stated params: caught by the CI oracle before ship (curated seeds are pre-validated), and handled gracefully at runtime.
- Endless "next" while offline / mid-generation: generation is deterministic + local, so it always succeeds; show the splash/loader if a large board takes a beat.
- Completion recorded for a curated board replayed later: stays solved; replaying doesn't un-solve it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let the player select size (Small/Medium/Large) and difficulty (Calm/Tricky/Deep) for Endless play, remembering the last choice.
- **FR-002**: Endless MUST produce a deterministic, reproducible stream of boards at the chosen size/difficulty, advancing to the next via a seed derivation (no ambient randomness).
- **FR-003**: The system MUST provide a Curated Shores screen listing a hand-tuned, ordered pack of boards, each showing name, difficulty marker, seed, and completion state.
- **FR-004**: Selecting any board source MUST hand a fully-specified `{seed, size, difficulty}` to Gameplay (002) and open it.
- **FR-005**: The system MUST let the player enter/paste a seed and jump to that exact board, validating input and showing a gentle message on invalid input.
- **FR-006**: Curated completion (solved + earned creature) MUST be recorded via persistence (008) and reflected in the curated list.
- **FR-007**: Curated boards MUST be defined by a shippable manifest of blessed seeds (`{ name, seed, size, difficulty, ordering }`), pre-validated by the engine's oracle so every curated board is guaranteed uniquely solvable.
- **FR-008**: Curated gating MUST be configurable (fully open OR gentle prerequisite unlocks) with an unhurried tone; the default is [open unless a designed curve requires gating].
- **FR-009**: Seeds surfaced anywhere (curated, resume, entry) MUST use the human-friendly format and be copyable for sharing.

### Key Entities *(include if feature involves data)*

- **BoardRequest**: `{ seed, size, difficulty }` produced by any mode and consumed by Gameplay.
- **EndlessStream**: a starting seed + size/difficulty; `next()` deterministically derives the following seed.
- **CuratedManifest / CuratedEntry**: the shipped pack — ordered entries of `{ name, seed, size, difficulty, ordering }` (+ derived earned creature).
- **CuratedProgress**: per-entry solved state (from persistence).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A given Endless starting point reproduces the identical board sequence 100% of the time.
- **SC-002**: Every curated board loads to a uniquely-solvable board matching its stated difficulty (100%, guaranteed by pre-ship oracle validation).
- **SC-003**: The same seed entered by two players yields the identical board 100% of the time.
- **SC-004**: Curated completion + earned creature persist and display correctly across sessions.
- **SC-005**: Invalid seed input never loads a board and always explains why.

## Assumptions

- **Determinism** is provided by the engine (001); modes only choose/derive seeds and params.
- **Curated manifest** ships as a static bundled asset (JSON), not a database; a build/CI step runs the oracle over every entry so no unsolvable curated board can ship.
- **Endless "next" derivation**: the next seed is a deterministic function of the current seed (e.g., a counter/hash step), keeping the whole stream reproducible.
- **Seed token**: may encode or accompany size+difficulty so a shared seed reproduces exactly; a bare word-number seed uses the player's current size/difficulty unless the token specifies otherwise.
- **Gating** ships open by default; the gentle-unlock variant is available if the curated curve wants it.

## Dependencies

- **Engine (001)** — generates/validates boards from a seed; the oracle validates the curated manifest.
- **Gameplay (002)** — consumes the `BoardRequest`.
- **Persistence (008)** — curated progress, last endless size/difficulty.
- **App Shell (003)** — hosts the Endless picker / seed entry controls on Home and routes to Curated.
- **Journal (005)** — the earned-creature shown on solved curated entries.
