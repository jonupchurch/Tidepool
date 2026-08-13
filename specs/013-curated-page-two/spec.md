# Feature Specification: Curated Page Two (the deep coast)

**Feature Branch**: `013-curated-page-two`

**Created**: 2026-08-13

**Status**: Draft

**Input**: Create a second page of curated puzzles, and have the new features — row annotations and irregular shapes — appear in those boards.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A second coastline to work through (Priority: P1)

The player who has worked down the existing thirty-six curated boards finds a second page of thirty-six waiting, laid out the same way, with its own named runs.

**Why this priority**: This is the feature — more hand-tuned boards for the players who finished the ones there are.

**Independent Test**: Open the curated screen, move to the second page, and confirm a full set of playable boards arranged in named groups.

**Acceptance Scenarios**:

1. **Given** the curated screen, **When** the player moves to the second page, **Then** a second full arrangement of grouped boards is shown.
2. **Given** a board on the second page, **When** the player selects it, **Then** it launches and plays like any curated board.
3. **Given** a board on the second page, **When** the player finishes it, **Then** it is recorded, earns its creature, and offers the next board on that page.

---

### User Story 2 - Move between pages without losing your place (Priority: P1)

The player can get from page one to page two and back, knows which page they are on, and sees progress for the page in front of them.

**Why this priority**: A second page nobody can find, or can't get back from, is worse than no second page.

**Independent Test**: Move between pages with the keyboard and with the pointer; confirm the current page is obvious and progress reads correctly on each.

**Acceptance Scenarios**:

1. **Given** page one, **When** the player moves forward, **Then** page two is shown and clearly identified as page two.
2. **Given** page two, **When** the player moves back, **Then** page one is shown unchanged.
3. **Given** either page, **When** the player reads the tally, **Then** it reports progress for that page, and overall progress is available.
4. **Given** a keyboard-only player, **When** they reach the pager, **Then** they can change pages and the change is announced.

---

### User Story 3 - The new mechanics appear here (Priority: P1)

The boards on the second page use row annotations and irregular shapes — that is what makes it a second act rather than more of the same.

**Why this priority**: The point of building the two mechanics was to have somewhere to put them.

**Independent Test**: Play through a sample from each group on page two and confirm both mechanics are present, and that boards using them are still solvable without guessing.

**Acceptance Scenarios**:

1. **Given** the second page, **When** its boards are inspected, **Then** row annotations appear on some of them and irregular shapes on some of them.
2. **Given** any board on the second page, **When** it is validated, **Then** it is uniquely solvable, guess-free, and rated at its stated difficulty.
3. **Given** a player arriving on page two, **When** they meet a mechanic they have not seen, **Then** the board's help explains it without leaving the board.

---

### User Story 4 - Page one is untouched (Priority: P1)

Every board on the first page is exactly the board it was, with the player's progress on it intact.

**Why this priority**: The game is shipped. Existing curated progress and existing boards must survive.

**Acceptance Scenarios**:

1. **Given** the shipped first page, **When** the game updates, **Then** every board on it generates identically and every recorded solve still points at the board it was earned on.
2. **Given** a player mid-way through page one, **When** they update, **Then** their progress, creatures, and mistake records are unchanged.

---

### User Story 5 - The second page is honestly harder (Priority: P2)

Page two starts around where page one ends and climbs from there, so a player moving across feels a step up rather than a reset.

**Why this priority**: A second page that repeats page one's difficulty curve wastes the mechanics it was built for.

**Independent Test**: Compare the stated difficulty distribution of both pages and confirm page two is weighted deeper.

**Acceptance Scenarios**:

1. **Given** both pages, **When** their difficulty distributions are compared, **Then** page two is weighted toward the deeper tiers.
2. **Given** page two, **When** its groups are read in order, **Then** difficulty rises across the page rather than jumping at the first board.

### Edge Cases

- A player who has never opened the curated screen sees page one first, not page two.
- Progress recorded against a board that a later pack revision retires must not inflate the tally — the existing rule (count only entries the shipped pack still contains) has to keep holding across both pages.
- A group that ends up with fewer than a full run of boards must still lay out and read correctly rather than leaving a gap in the ring.
- The optional prerequisite gating, if switched on, has to treat the two pages as one ordered coastline rather than unlocking page two from nothing.
- The board-to-board "next board" chain has to walk from the end of page one into the start of page two, and stop cleanly at the end of page two.
- A player on a small window must still be able to reach and read both pages.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The curated pack MUST support more than one page of grouped boards, each page holding a full arrangement of groups.
- **FR-002**: A second page MUST ship with a full complement of boards, matching the first page's arrangement.
- **FR-003**: The curated screen MUST let the player move between pages with pointer and keyboard, and MUST make the current page obvious.
- **FR-004**: Progress, creature rewards, best-mistake records, and clean-solve marking MUST work identically on every page.
- **FR-005**: Per-page and overall progress tallies MUST both be available, and MUST count only boards the shipped pack still contains.
- **FR-006**: Boards MUST be able to declare, per entry, which clue mechanics they use and which silhouette they are played on.
- **FR-007**: A board that declares no mechanics or shape MUST generate exactly as it does today — the first page MUST be bit-for-bit unchanged.
- **FR-008**: Every board on every page MUST be verified automatically as uniquely solvable, guess-free, and correctly rated, and the build MUST fail if any is not.
- **FR-009**: The second page MUST use row annotations and irregular shapes across its boards.
- **FR-010**: The second page's difficulty MUST be weighted deeper than the first page's and MUST rise across the page.
- **FR-011**: The "next board" chain MUST continue from the end of one page into the start of the next, and stop at the end of the last.
- **FR-012**: Optional prerequisite gating MUST treat all pages as one ordered sequence.
- **FR-013**: The seeds shipping on the second page MUST be found by a repeatable, automated search rather than by hand, so the pack can be regenerated and extended.

### Key Entities

- **Curated pack**: the shipped manifest of blessed boards. Gains pages; groups belong to a page.
- **Curated entry**: one blessed board — name, seed, size, difficulty, group. Gains an optional clue set and an optional silhouette.
- **Curated progress**: the player's per-entry record of solves, earned creatures, and best mistake counts. Unchanged in shape; now spans two pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The second page ships with a full complement of boards, and 100% of them pass automated validation as unique, guess-free, and on-tier.
- **SC-002**: 100% of first-page boards generate identically to the shipped build, and all existing curated progress still resolves to the board it was earned on.
- **SC-003**: A player can reach page two from the main menu in no more than three interactions, and return to page one in one.
- **SC-004**: Both mechanics from [010](../010-line-annotations/spec.md) and [012](../012-irregular-shores/spec.md) appear on the second page, each on multiple boards across multiple groups.
- **SC-005**: The second page's boards are weighted to the deeper difficulty tiers compared with the first page's.
- **SC-006**: The curated screen renders and is operable on the smallest supported window, both pages.
- **SC-007**: The seed search can regenerate an equivalent pack from scratch without hand-editing.

## Assumptions

- The second page copies the first page's arrangement — the same number of groups, the same number of boards per group — so the existing layout carries over rather than needing a new one.
- Page two is themed as deeper, colder water than page one's shallows, continuing the existing naming voice. Exact group names are a content decision, not a structural one.
- This feature depends on [010](../010-line-annotations/spec.md) and [012](../012-irregular-shores/spec.md) being finished and verified. It is the last of the five to be built, and is the reason the other two exist.
- Mechanics are introduced gradually across page two rather than all at once on the first board, so a player learns each one on a board where it is the only new thing.
- Existing creature rewards are reused; this feature does not add creatures. If thirty-six more boards want thirty-six more creatures, that is separate work.
- Boards on page two are still found by seed search over the existing generator, not authored cell by cell. Hand-authored layouts are out of scope.
