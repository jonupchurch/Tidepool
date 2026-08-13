# Feature Specification: Irregular Shores (non-hexagonal board shapes)

**Feature Branch**: `012-irregular-shores`

**Created**: 2026-08-13

**Status**: Draft

**Input**: Explore making the puzzle area irregular shapes. Direction chosen: a small catalog of named, hand-authored silhouettes — atoll, crescent, wedge, and so on — rather than procedurally carved blobs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play a board that isn't a hexagon (Priority: P1)

The player opens a board shaped like an atoll — a ring of cells around an empty middle — and plays it exactly as they would any other board.

**Why this priority**: This is the feature. Everything else is about making it safe.

**Independent Test**: Launch a board with a named shape; confirm it draws as that silhouette, every present cell is playable, and the empty region is inert.

**Acceptance Scenarios**:

1. **Given** a board with a named shape, **When** it renders, **Then** only the cells belonging to that shape are drawn.
2. **Given** the empty region of a shaped board, **When** the player clicks in it, **Then** nothing happens — no mark, no sound, no error.
3. **Given** a shaped board, **When** the player fills every water cell and marks every stone, **Then** the board completes exactly as a hexagonal one does.

---

### User Story 2 - A shaped board is still a fair puzzle (Priority: P1)

The player never meets a shaped board that needs a guess, has two answers, or is rated as something it isn't.

**Why this priority**: The game's whole promise is that every board is solvable by reasoning. A new region shape must not become a loophole in that.

**Independent Test**: Generate boards across every shape and size; confirm each is uniquely solvable, guess-free, and honestly rated.

**Acceptance Scenarios**:

1. **Given** any shape in the catalog at any size, **When** a board is generated for it, **Then** that board has exactly one solution and needs no guess.
2. **Given** a shape that would produce a degenerate board for a given size or difficulty, **When** generation runs, **Then** the game declines that combination rather than serving a bad board.
3. **Given** a shaped board, **When** its difficulty is reported, **Then** the rating reflects the reasoning actually required.

---

### User Story 3 - Clues still read correctly around the holes (Priority: P1)

On a shaped board, adjacency counts, row totals, row guides, and the margin labels all behave as if the missing cells simply were never there.

**Why this priority**: Every clue in the game is defined over "the cells that are present". Holes are where that definition gets tested — a row total that points at the wrong row, or an adjacency count that includes a cell that doesn't exist, breaks the puzzle silently.

**Independent Test**: On a shape with an interior hole, verify each clue type against the solution by hand and by the solver.

**Acceptance Scenarios**:

1. **Given** a cell beside a hole, **When** its adjacency clue is shown, **Then** it counts only cells that exist.
2. **Given** a row broken by a hole, **When** its total is shown, **Then** the total covers every cell of that row on both sides of the hole, and its margin label unambiguously identifies that row.
3. **Given** a row broken by a hole with its guide toggled on, **When** the guide draws, **Then** it reads as marking that row and no other.
4. **Given** a shaped board, **When** the player strikes off a satisfied row total, **Then** it behaves as on a hexagonal board.

---

### User Story 4 - The board still fits the window (Priority: P2)

A long, thin, or off-centre silhouette fills the play area sensibly and never runs off the edge, at any window size, on desktop or in the browser.

**Why this priority**: The current fit logic centres a symmetric hexagon. An asymmetric shape with margin labels on one side is the case that breaks it.

**Independent Test**: Open the most extreme shape in the catalog at the smallest and largest supported window sizes and confirm the whole board and all its labels are visible.

**Acceptance Scenarios**:

1. **Given** any shape at any supported window size, **When** the board renders, **Then** every cell and every margin label is fully on screen.
2. **Given** a window resize, **When** the board re-fits, **Then** it stays centred and complete.

---

### User Story 5 - Shaped boards save, resume, and reproduce (Priority: P1)

A shaped board can be left mid-play and resumed, and its seed reproduces it exactly — on any machine, in any build.

**Why this priority**: The seed is the game's contract. A shape that isn't part of what a seed reproduces would make saves resume onto the wrong board.

**Independent Test**: Start a shaped board, mark some cells, quit, reopen, resume; confirm the same shape and the same marks.

**Acceptance Scenarios**:

1. **Given** a shaped board in progress, **When** the player quits and resumes, **Then** the same shape and marks return.
2. **Given** the same seed and shape, **When** a board is generated on a different machine, **Then** it is identical.
3. **Given** a save written before shapes existed, **When** it is resumed, **Then** it loads as the hexagonal board it always was.

---

### User Story 6 - Nothing that exists today changes (Priority: P1)

Every board the game serves today keeps its exact shape and contents.

**Why this priority**: Same reason as [010](../010-line-annotations/spec.md): shipped seeds and shipped curated boards are promises.

**Acceptance Scenarios**:

1. **Given** a board with no shape named, **When** it is generated, **Then** it is the filled hexagon it is today, from an unchanged seed.
2. **Given** the shipped curated pack, **When** it is validated after this feature, **Then** every board still passes unchanged.

### Edge Cases

- A shape that would leave a cell with no neighbours: rejected from the catalog. An isolated cell can only ever be resolved by a row total, and reads as a rendering fault.
- A shape whose present region is not connected: rejected from the catalog, for the same reason — it reads as two boards.
- A shape that leaves a row with a single cell: allowed, but that row's total is never annotated (see [010](../010-line-annotations/spec.md)) because it carries no arrangement information.
- A hole that swallows a water pool's only route: pools are whatever the solution's water forms, so a shape simply makes different pools. Creature reveal continues to hang off the largest pool, and a shape must still admit at least one pool worth naming.
- A silhouette at the smallest size may be too small to be interesting or even solvable — a size/shape pair the catalog does not support is refused up front, not served badly.
- Margin labels on a concave shape: the slot a row's label occupies is by construction empty (it sits before that row's first cell along the row's own axis), so a label can never land on a cell.
- An interior hole large enough to sit under the completion panel or the HUD must not swallow clicks intended for the UI, nor the reverse.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST support a catalog of named board silhouettes, each defining which cells of a region are present.
- **FR-002**: Each silhouette MUST be defined for each board size it supports, and MUST declare the sizes it does not support.
- **FR-003**: Every silhouette in the catalog MUST be a single connected region with no cell left without a neighbour.
- **FR-004**: A board's shape MUST be part of what its seed reproduces — the same seed and shape MUST produce the same board everywhere, forever.
- **FR-005**: A board with no shape named MUST generate exactly as it does today, from an unchanged seed.
- **FR-006**: All existing clue types MUST be computed over present cells only, with missing cells treated as absent rather than as stone.
- **FR-007**: Every board generated for a supported shape/size/difficulty combination MUST be uniquely solvable and guess-free, or generation MUST fail loudly rather than serve it.
- **FR-008**: A margin row label on a shaped board MUST identify exactly one row, unambiguously, by its position.
- **FR-009**: The board MUST fit any supported window size with all cells and labels visible, for every silhouette.
- **FR-010**: A shaped board in progress MUST save and resume onto the same shape.
- **FR-011**: Saves and curated entries written before shapes existed MUST continue to load as hexagonal boards.
- **FR-012**: The pool, creature, completion, undo, mistake-flagging, and reading-aid behaviours MUST work on shaped boards without special-casing.
- **FR-013**: The catalog MUST be validated automatically — connectivity, no isolated cells, and generatability at every declared size — so a broken silhouette cannot ship.

### Key Entities

- **Silhouette**: a named board shape (for example atoll, crescent, wedge). Defines, per supported size, which cells of the region are present.
- **Present region**: the set of cells a board is played on. Already the game's notion of board topology; a silhouette is a way of producing one.
- **Board parameters**: the reproducible description of a board — seed, size, difficulty, clue set. Gains an optional shape, absent meaning the filled hexagon.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of boards generated for supported shape/size/difficulty combinations are uniquely solvable and guess-free.
- **SC-002**: 100% of seeds that exist before this change generate a byte-identical board after it.
- **SC-003**: Every silhouette in the catalog passes the automated shape checks (connected, no isolated cells, generatable at every declared size).
- **SC-004**: Every silhouette renders fully on screen, labels included, at the smallest and largest supported window sizes.
- **SC-005**: A shaped board can be saved and resumed with shape and marks intact, on desktop and in the browser.
- **SC-006**: The catalog ships with at least three distinct silhouettes beyond the plain hexagon, each usable at more than one size.

## Assumptions

- Silhouettes are hand-authored and reviewed, not procedurally carved. Predictable shapes are worth more here than variety, because each one has to be validated and because the curated pack is what will use them. Procedural carving stays open as later work and is explicitly out of scope.
- A silhouette is carved from the same hexagonal region the size tiers already define, so cell counts stay in a familiar range and the existing size vocabulary (Small / Medium / Large) still means something.
- Shapes are a property of the board, not a mode the player selects. Curated boards name their shape; Endless keeps serving hexagons unless and until that is decided separately.
- Names are for the catalog and the specs, not necessarily player-facing. Whether a board announces "Atoll" is a presentation decision for [013](../013-curated-page-two/spec.md).
- The board's existing "topology as data" model is sufficient — this feature is expected to add a way to *produce* an irregular present set and to harden the parts that have only ever seen a symmetric one, not to redefine what a board is.
