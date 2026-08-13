# Feature Specification: Perfect Solves

**Feature Branch**: `011-perfect-solves`

**Created**: 2026-08-13

**Status**: Draft

**Input**: Track the number of perfectly completed puzzles alongside the completed puzzles.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A clean solve is counted (Priority: P1)

The player finishes a board without ever placing a wrong mark. The game notices, and their lifetime perfect count goes up alongside their boards-solved count.

**Why this priority**: This is the feature. The board already knows how many mistakes you made; nothing currently remembers that you made none.

**Independent Test**: Solve a board with no wrong marks and confirm both totals rise; solve another with one wrong mark and confirm only boards-solved rises.

**Acceptance Scenarios**:

1. **Given** a board completed with zero wrong marks, **When** it resolves, **Then** boards-solved and perfect-solves both increase by one.
2. **Given** a board completed after at least one wrong mark, **When** it resolves, **Then** boards-solved increases by one and perfect-solves does not.
3. **Given** a completed board, **When** the app is restarted, **Then** both totals are still there.

---

### User Story 2 - See the perfect count where the other totals live (Priority: P1)

The player finds their perfect count sitting beside boards solved, pools filled and creatures found — same footer, same voice, no fanfare.

**Why this priority**: A number that is tracked but never shown is not a feature. The journal footer is where the game already keeps its gentle lifetime totals.

**Independent Test**: Open the journal with a known set of totals and confirm the perfect count reads correctly alongside the others.

**Acceptance Scenarios**:

1. **Given** the journal, **When** the player reads the lifetime stats, **Then** perfect solves appears alongside boards solved.
2. **Given** zero perfect solves, **When** the stats render, **Then** the count shows as zero rather than being hidden — it reads as something to reach for, not something broken.

---

### User Story 3 - Told, gently, at the moment it happens (Priority: P2)

On finishing a board clean, the completion panel says so — one line, in the game's voice, no confetti.

**Why this priority**: The reward for a clean solve should land when the player earns it, not only when they later open a menu. It must not turn a calm game into an achievement machine.

**Independent Test**: Complete a board clean and one with a mistake; confirm the panel differs by exactly one line and nothing else.

**Acceptance Scenarios**:

1. **Given** a board completed with zero wrong marks, **When** the completion panel appears, **Then** it acknowledges the clean solve.
2. **Given** a board completed with at least one wrong mark, **When** the panel appears, **Then** it reads exactly as it does today, with no mention of mistakes.

---

### User Story 4 - Clean curated boards are marked on the map (Priority: P3)

On the curated coastline, a board finished clean is visibly distinct from one merely finished.

**Why this priority**: Curated boards already keep your best mistake count per entry, so the information exists and is currently only shown as a total. Marking it makes replaying for a clean run worth doing.

**Independent Test**: Solve one curated board clean and one with a mistake; confirm the map distinguishes them.

**Acceptance Scenarios**:

1. **Given** a curated board whose best run had zero mistakes, **When** the coastline renders, **Then** that board is marked as clean.
2. **Given** a curated board replayed clean after a fumbled first run, **When** the coastline renders, **Then** it is marked clean — the best run is what counts.

---

### User Story 5 - Existing progress is not thrown away (Priority: P2)

A player who has already finished a shelf of curated boards without a single mistake does not open the new counter and see a zero.

**Why this priority**: The evidence for those clean runs is already stored per curated entry. Showing zero would read as the game having forgotten.

**Independent Test**: With curated progress recorded before this feature, confirm the perfect count reflects the clean entries already on record.

**Acceptance Scenarios**:

1. **Given** curated entries recorded as solved with zero mistakes, **When** the player first opens the game after this feature ships, **Then** the perfect count includes them.
2. **Given** curated entries solved before mistakes were tracked at all, **When** the count is derived, **Then** those are not counted as perfect — the game does not award credit it has no evidence for.
3. **Given** the count has been established once, **When** the game restarts again, **Then** it is not re-derived or double-counted.

### Edge Cases

- A wrong mark placed and then undone still costs the perfect: the counter records that a wrong mark was placed, not whether one is currently on the board. Undo is for fixing the board, not the record.
- A board resumed from a save: mistakes are counted per playing session and are not carried in the save record, so a board finished after a resume is judged on the marks placed since resuming. This is stated, not hidden.
- Replaying a board already solved perfectly increments the lifetime count again — the lifetime total counts solves, not distinct boards. The curated map's per-board mark is what tracks distinct clean boards.
- A saved-progress record written by an older build has no perfect count: it reads as absent, not as corrupt, and the game fills it in.
- A saved-progress record written by a *newer* build is left alone rather than overwritten, as with every other record.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST record, on each board completion, whether the board was completed with zero wrong marks placed.
- **FR-002**: A lifetime perfect-solve total MUST persist alongside the existing lifetime totals.
- **FR-003**: A wrong mark that was subsequently undone or corrected MUST still disqualify that solve.
- **FR-004**: The journal's lifetime stats MUST show the perfect total alongside boards solved.
- **FR-005**: The completion panel MUST acknowledge a clean solve, and MUST be unchanged for a solve with mistakes.
- **FR-006**: The curated coastline MUST visually distinguish entries whose best run was clean.
- **FR-007**: On first run after this feature ships, the perfect total MUST be seeded from curated entries already recorded as solved with zero mistakes, once, without double-counting on later runs.
- **FR-008**: Curated entries solved before mistake tracking existed MUST NOT be counted as perfect.
- **FR-009**: Stored progress from an older build MUST load and gain the new total without losing anything; stored progress from a newer build MUST be left untouched.
- **FR-010**: Nothing about how a board plays MUST change — this feature observes and reports, it does not gate, penalise, or reward with content.

### Key Entities

- **Lifetime stats**: the persisted gentle totals (boards solved, pools filled, creatures found). Gains a perfect-solves total.
- **Play session**: the live state of one board being played. Already knows the running count of wrong marks placed; that count at completion is what decides a perfect.
- **Curated progress**: the per-entry record of solved curated boards and the fewest mistakes across runs. Already sufficient to mark an entry clean.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A board completed with zero wrong marks increments the perfect total 100% of the time; a board completed with one or more never does.
- **SC-002**: Both totals survive a restart, and survive export and re-import of a save.
- **SC-003**: A player with existing clean curated solves sees a non-zero perfect count the first time they open the updated game, and that count does not change on subsequent restarts.
- **SC-004**: The perfect count is visible from the journal in one step from the main menu.
- **SC-005**: No existing stat, save, or board behaviour changes.

## Assumptions

- "Perfect" means zero wrong marks placed during the play of that board. It does not consider time taken, undo usage, or reading aids (row guides, strike-off, hover highlight) — those are comfort features and using them is not a flaw.
- The completion panel's clean-solve line is one added sentence in the existing calm voice; there is no new sound, animation, or overlay. This game is not trying to make anyone anxious about a streak.
- No achievement, unlock, or content gate hangs off the perfect count in this feature. If Steam achievements want it later, they read the same total.
- Mistake counts continue not to be stored in the in-progress save; the resumed-board caveat above is accepted rather than solved, because storing it would change the save shape for a marginal gain.
