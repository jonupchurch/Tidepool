# Feature Specification: Line Annotations (`{n}` / `-n-` on edge totals)

**Feature Branch**: `010-line-annotations`

**Created**: 2026-08-13

**Status**: Draft

**Input**: The numbers on the edge of the grid should also allow for the `-n-` and `{n}` forms — the same consecutive / not-consecutive vocabulary the board already uses on adjacency clues, extended to row totals.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a row total that tells you how the water sits (Priority: P1)

A margin total reads `{4}` or `-4-` instead of a bare `4`. `{4}` means the four water cells in that row form one unbroken run; `-4-` means they are broken into two or more runs. The player uses that to place water without guessing.

**Why this priority**: This is the feature. Without it there is nothing to see or deduce.

**Independent Test**: Open a board generated with line annotations on; confirm annotated totals render in the margin, and that the annotation is true of the solution for every annotated row.

**Acceptance Scenarios**:

1. **Given** a row whose solution water cells are contiguous, **When** that row's total is annotated, **Then** it renders as `{n}`.
2. **Given** a row whose solution water cells are broken by at least one stone, **When** that row's total is annotated, **Then** it renders as `-n-`.
3. **Given** any annotated row on any board the game serves, **When** the board is solved, **Then** the annotation matches the finished row — no annotation is ever wrong.

---

### User Story 2 - Solve a board that needs the annotation (Priority: P1)

The player meets a board that cannot be finished by counting alone, but can be finished — with no guessing — by reasoning about whether a row's water is together or apart.

**Why this priority**: An annotation that never changes what you can deduce is decoration. The mechanic has to carry real deductions, and the game's guarantee is that every board it serves is solvable without guessing.

**Independent Test**: Generate boards at the tier that uses the mechanic; confirm the solver completes them using line-annotation reasoning and that each has exactly one solution.

**Acceptance Scenarios**:

1. **Given** a board whose remaining cells are only resolvable via a row annotation, **When** the solver runs, **Then** it completes the board without guessing.
2. **Given** any board the game serves with annotations on, **When** it is checked, **Then** it has exactly one solution and needs no guess at any point.
3. **Given** a board that needs a row annotation to finish, **When** its difficulty is reported, **Then** it is rated at the tier that owns the mechanic and not below.

---

### User Story 3 - Learn what the new marks mean (Priority: P2)

The player who has only seen bare row totals meets `{4}` and understands it without leaving the board.

**Why this priority**: The adjacency `{}`/`--` forms are already taught; the row form is the same idea in a new place, and an unexplained symbol reads as a bug.

**Independent Test**: Open How to Play and confirm the row-total entry describes both annotated forms in the same voice as the adjacency entry.

**Acceptance Scenarios**:

1. **Given** How to Play, **When** the player reads the row-totals section, **Then** both `{n}` and `-n-` are explained for rows.
2. **Given** a board carrying an annotated total, **When** the player has the help rail open, **Then** the explanation is reachable without leaving the board.

---

### User Story 4 - Nothing the player already had changes (Priority: P1)

A player mid-board, or replaying a seed they know, finds everything exactly where they left it.

**Why this priority**: The game is shipped and on Steam. A seed is a promise: the same code has to make the same board forever, and an in-progress save has to resume onto the board it was saved from.

**Independent Test**: Record the generated board for a set of existing seeds before the change; confirm each is byte-identical after.

**Acceptance Scenarios**:

1. **Given** any seed that exists today, **When** its board is generated after this feature ships, **Then** the board is identical to the one that seed produced before.
2. **Given** an in-progress save written before this feature, **When** the player resumes, **Then** they resume onto the same board with their marks intact.
3. **Given** every curated board shipped today, **When** the pack is validated, **Then** all still pass unchanged.

### Edge Cases

- A row whose water count makes the annotation uninformative — 0 or 1 water cells (trivially one run), or water in all but one cell (trivially one run) — is never annotated. A `{1}` teaches nothing and reads as noise.
- A row with a gap in it (possible once boards can be irregular): a missing cell breaks a run, exactly as an absent neighbour breaks a run on an adjacency ring. Two water cells either side of a hole are `-2-`, not `{2}`.
- A row of length 1 or 2: never annotated (no arrangement is distinguishable).
- An annotated total the player has struck off as satisfied still shows its annotation, greyed with the rest of the label.
- The widest annotated label (`-10-` on a large board) must still fit its margin slot without overlapping the board or another label.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A row total MUST be able to carry one of two annotations — *together* (`{n}`) or *apart* (`-n-`) — or no annotation at all.
- **FR-002**: *Together* MUST mean the water cells in that row form exactly one unbroken run; *apart* MUST mean they form two or more runs.
- **FR-003**: A cell missing from a row MUST break a run, consistent with how an absent neighbour breaks a run on an adjacency clue.
- **FR-004**: An annotation MUST be attached only when it is informative — when at least two arrangements of that row's water are consistent with the bare total. Uninformative rows keep the bare number.
- **FR-005**: Every annotation the game shows MUST be true of that board's solution.
- **FR-006**: The solver MUST be able to make every deduction a human could make from a row annotation, so boards using the mechanic are provably solvable without guessing.
- **FR-007**: A board requiring row-annotation reasoning MUST be rated at the difficulty tier that owns the mechanic.
- **FR-008**: Annotated totals MUST render in the margin in the same visual language as the adjacency clues that already use `{}` and `--`.
- **FR-009**: The mechanic MUST be opt-in per board. A board that does not use it MUST generate exactly as it does today, from an unchanged seed.
- **FR-010**: Every existing seed, in-progress save, and shipped curated board MUST produce identical results after this feature ships.
- **FR-011**: How to Play MUST explain both annotated row forms.
- **FR-012**: Row guides and strike-off (the player's existing reading aids) MUST work on annotated totals exactly as on plain ones.

### Key Entities

- **Row total**: a count of water along one of the three board axes, shown in the margin. Gains an optional *together / apart* property.
- **Run**: a maximal unbroken sequence of water cells within a row, where a stone or a missing cell ends it.
- **Board clue set**: the per-board record of which clue mechanics are switched on. Gains row annotations as a new switch, off by default.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of annotations shown on any board the game serves are true of that board's solution.
- **SC-002**: 100% of boards generated with annotations on are uniquely solvable with no guessing.
- **SC-003**: 100% of seeds that exist before this change generate a byte-identical board after it.
- **SC-004**: Boards exist, and can be generated on demand, that cannot be completed without using a row annotation — the mechanic changes outcomes, not just appearance.
- **SC-005**: A player who has read How to Play can state what `{4}` on a row means without further help.
- **SC-006**: No annotated label overlaps a board cell or another label at any board size.

## Assumptions

- *Together / apart* is judged on the row as it appears on the board — the ordered sequence of cells along that axis, holes included as breaks. This is the reading a player gets by looking, and it matches the existing adjacency semantics.
- The mechanic belongs to the deepest difficulty tier, alongside the existing connectivity clue, because it is the same class of reasoning.
- Endless boards keep their current clue set for now; this feature makes the mechanic available and proven, and [013-curated-page-two](../013-curated-page-two/spec.md) is what puts it in front of players. Whether Endless later adopts it is a separate call.
- The existing informativeness rule for adjacency clues (annotate only when at least two arrangements fit) is the right rule for rows too, and carries over.
- No new clue is added to the board's face — this changes how an existing number is written, not how many numbers there are.
