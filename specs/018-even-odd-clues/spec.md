# Feature Specification: Even and Odd Clues in the Deep

**Feature Branch**: `018-even-odd-clues`

**Created**: 2026-08-17

**Status**: Draft

**Input**: Add cells labelled E/O for Even/Odd numbers of water neighbours around a
hex. Deep tier only, opt-in, must not change any existing board.

> **Note on numbering.** This is 018, not 017: the sound-effects switch already
> took `[017]` in the commit log and CHANGELOG even though it never got a spec
> directory. Reusing the number would make the artifact record ambiguous.

## Context

Today every revealed stone shows an exact count: the number of water tiles
touching it, optionally braced (`{n}`) or dashed (`-n-`) to say whether that water
sits in one run. The count is the only thing a stone can say.

An **even/odd clue** is the same stone saying *less*: `E` means an even number of
its neighbours are water, `O` means an odd number. It replaces the number rather
than decorating it — a number already tells you its own parity, so an annotation
alongside one would be worth nothing.

That makes this the first clue in the game that is strictly *weaker* than what it
replaces, which inverts how generation has worked until now. Features 010 and 012
*added* information (an annotation, a silhouette) and let reduction strip what the
tier could not use. Parity instead *removes* information from a clue that
reduction has already proved necessary, so it cannot be stamped on during
generation — the fully-clued board would stop being uniquely solvable and every
candidate would be rejected.

## Measured constraints

Taken before designing, across 5 seeds × 3 sizes at Deep (284 clues on 15 boards),
by weakening clues on the served, already-minimal board and re-running the solver:

1. **Parity survives often enough to be visible.** 98 of 284 clues (**34.5%**)
   can be weakened from a count to E/O with the board still solving guess-free —
   2–4 per Small board, 5–7 Medium, 11–13 Large. This is the opposite of what
   feature 016 measured for row annotations (0–3 per board, and none at all below
   Deep); even/odd will not be a mechanic players struggle to find.
2. **The parity is genuinely load-bearing, not decorative.** The control matters
   more than the headline: deleting those same clues outright instead of weakening
   them succeeds **0** times out of 284, exactly as minimality predicts. So all 98
   survivals are cases where the parity itself carries the deduction, not cases
   where the clue had become redundant.
3. **The hard version of the technique is not needed.** A "parity subtraction"
   rule (when one clue's unknown cells are a subset of another's and the
   difference is a single cell, that cell's value follows from the two parities)
   accounts for **1 of the 98**. Restricting the technique to the trivial rule —
   a parity clue with exactly one unknown neighbour left forces that neighbour —
   still yields 97. The expensive rule buys nothing and is dropped from scope.
4. **Cost is negligible.** The weakening pass runs in 0–20 ms per board, against
   the existing 2000 ms generate-and-verify budget for Large.
5. **The technique is inert without parity clues.** Verified directly: on boards
   with no E/O clue present, the parity pass never fires. This is the property the
   whole feature rests on — see FR-003.

## User Scenarios & Testing

### User Story 1 - Solve using an even/odd clue (Priority: P1)

A player on a Deep board sees a stone marked `O` instead of a number. They cannot
tell how much water surrounds it, but once they have settled all but one of its
neighbours, the parity tells them what the last one must be.

**Why this priority**: This is the mechanic. Without it there is no feature.

**Independent Test**: Load a Deep board generated with even/odd on, confirm at
least one `E` and one `O` tile are rendered, and confirm the board completes
guess-free.

**Acceptance Scenarios**:

1. **Given** a Deep board with even/odd on, **When** it is served, **Then** some
   revealed stones show `E` or `O` in place of a count.
2. **Given** an `O` stone with exactly one unsettled neighbour and an odd number
   of water already found, **When** the player reasons from the clue, **Then** the
   remaining neighbour is determined to be stone.
3. **Given** any served even/odd board, **When** the oracle checks it, **Then** it
   has exactly one solution, reachable with no guessing.
4. **Given** an even/odd board, **When** the player marks cells, **Then** correct
   cells lock and mistakes stay gentle exactly as on any other board.

---

### User Story 2 - Turn even/odd on without disturbing anything else (Priority: P1)

A player switches even/odd on for the Endless tide. Deep boards start carrying the
new clue; every other board in the game is untouched, including the one they were
part-way through.

**Why this priority**: Equal to US1. The game is live on Steam with shipped
curated boards, written-down seeds, and saves that resume by regenerating from
stored params. A feature that quietly moved existing boards would be a defect
regardless of how good the mechanic is.

**Independent Test**: With the switch off, generate across every seed/size/tier
and confirm the boards are byte-identical to today's. With it on at Calm and
Tricky, confirm the same.

**Acceptance Scenarios**:

1. **Given** even/odd off, **When** any board is generated, **Then** it is
   byte-identical to the board that seed has always produced.
2. **Given** even/odd on and a tier below Deep, **When** a board is generated,
   **Then** it carries no E/O clue and is byte-identical to today's board.
3. **Given** a board saved mid-play before this feature, **When** it is resumed,
   **Then** the same board is restored.

---

### User Story 3 - Learn what E and O mean (Priority: P2)

A player meeting an `E` tile for the first time finds it explained in the same
place the other clue forms are, in the same voice.

**Why this priority**: A clue form nobody can read is not playable, but it depends
on US1 existing first.

**Independent Test**: Open How to play and confirm the E/O forms appear beside
`n`, `{n}` and `-n-`.

**Acceptance Scenarios**:

1. **Given** the rail beside the board or the How to play screen, **When** the
   player reads the clue forms, **Then** `E` and `O` are listed with their
   meanings.

---

### User Story 4 - Share the exact board (Priority: P3)

A player copies the board label and sends it to a friend, who gets the identical
board — even/odd included.

**Why this priority**: The label-is-the-token property already exists (016); this
extends it rather than building it.

**Acceptance Scenarios**:

1. **Given** an even/odd board, **When** its label is pasted into seed entry,
   **Then** the same board loads.
2. **Given** a token naming no even/odd, **When** it is loaded, **Then** the
   pre-018 board for that seed is served.

### Edge Cases

- **A stone with fewer than two neighbours.** With one neighbour, parity pins the
  count exactly, so `E`/`O` is just a stranger way of writing the number; with
  none it says nothing at all. Neither may be weakened (FR-006).
- **A stale preference at the wrong tier.** Even/odd left on while the player
  drops to Calm must not change the Calm board — gated in code, not only in the
  UI (FR-004), the same trap feature 016 documented for edge hints.
- **A parity clue whose ring is already fully settled.** Reads as a plain
  decorative tile; harmless, and no different from a satisfied count today.
- **Even/odd requested at Deep on a shape whose rows have holes.** Parity counts
  present neighbours only, so an absent neighbour simply is not water — the same
  convention `ringWater` already uses.
- **A saved board whose stored params say even/odd**, restored after the player
  turned the preference off: the params travel with the save, so it resumes as the
  even/odd board it was.

## Requirements

### Functional Requirements

- **FR-001**: A revealed stone MUST be able to show the parity of its water
  neighbours — `E` for even, `O` for odd — **in place of** its exact count.
- **FR-002**: Even/odd MUST be opt-in, and MUST apply only at Deep.
- **FR-003**: The parity deduction MUST be inert on any board carrying no parity
  clue. Strengthening the solver for every board would change which clues
  reduction keeps and silently rewrite every seed in existence.
- **FR-004**: The Deep-only restriction MUST be enforced in code, not only in the
  UI, so a stale stored preference cannot alter a Calm or Tricky board.
- **FR-005**: With even/odd untouched, every seed MUST produce a byte-identical
  board to the one it produced before this feature — including every shipped
  curated board and every in-progress save.
- **FR-006**: A clue MUST only be weakened to parity where parity is genuinely
  weaker than the count, i.e. the stone has at least two present neighbours.
- **FR-007**: Every served even/odd board MUST be verified uniquely solvable and
  guess-free before it is served, by the same oracle every other board passes.
  This includes the independent solution counter, which MUST understand parity —
  a counter blind to it would count assignments the clue forbids and could report
  a board unique when it is not, or non-unique when it is.
- **FR-008**: An even/odd board MUST survive a save/restore round trip and a
  serialization round trip unchanged.
- **FR-009**: The board label MUST name even/odd when it is on, and seed entry
  MUST read that token back, so the label stays a complete description of the
  board.
- **FR-010**: The E/O clue forms MUST be explained wherever the existing clue
  forms are explained.
- **FR-011**: Marking, mistake handling, locking, perfect-solve tracking, and
  creature discovery MUST behave exactly as on any other board. These read the
  hidden solution, not the clues, and MUST stay that way.

### Key Entities

- **Even/odd clue**: what a revealed stone shows instead of a count — the parity
  of the water among its present neighbours. Mutually exclusive with showing a
  count, and (this slice) never combined with the `{}`/`--` run annotation.
- **Even/odd toggle**: the per-board opt-in, alongside the existing clue toggles.
  Contributes to a board's identity only when on.
- **Parity technique**: the reasoning step the solver gains — a parity clue with a
  single unsettled neighbour determines that neighbour. Deep-tier only.

## Success Criteria

- **SC-001**: With even/odd off, boards are byte-identical at every seed × size ×
  tier, and the frozen fingerprint table is green.
- **SC-002**: A Deep board generated with even/odd on shows both an `E` and an `O`
  tile, verified in the running app rather than from params.
- **SC-003**: Across 5 seeds × 3 sizes at Deep, every board carries at least one
  E/O clue, and every one passes the unique-and-guess-free oracle.
- **SC-004**: No board below Deep carries an E/O clue, with the toggle forced on.
- **SC-005**: Every even/odd board's label round-trips through seed entry to the
  same board.
- **SC-006**: Large/Deep generation with even/odd on stays inside the existing
  2000 ms generate-and-verify budget.
- **SC-007**: A player can state what `E` and `O` mean from the in-game
  explanation alone, without reference to this spec.

## Assumptions

- **E/O replaces the number rather than joining it.** A count already reveals its
  own parity, so an `E` beside a `4` would carry no information. Recorded as a
  decision, not an open question.
- **E/O clues do not also carry `{}`/`--`.** The measurement was taken with the
  run annotation dropped from any weakened clue, so this is the configuration the
  numbers describe. Combining them is deferred (see non-goals).
- **Density is left wherever reduction lands it** — roughly a third of clues at
  Deep. That is dense enough to be noticeable and possibly dense enough to feel
  mushy; it is a tuning question that wants play-testing, not a guess now.
- **The glyphs are the letters `E` and `O`.** They sit in the same tile face the
  numerals use, so legibility in the existing numeral font stack needs a look
  during implementation.
- **Weakening runs as a pass after existing reduction**, not as extra items in
  reduction's seeded removal shuffle. Adding items to that shuffle would reorder
  removals; a separate pass leaves the existing order untouched, which is the
  cheaper thing to prove.
- **Even/odd is a clue toggle**, so its segment appends to the RNG seed string in
  the clue-toggle position — after row annotations, before shape. That order must
  be pinned once, as `rngSeedString` already warns.
- **Endless is the target**; the curated pack is untouched by this slice.

## Non-goals (named, not folded in)

- **Parity subtraction.** Measured at 1 clue in 284. A player who spots it solves
  faster, which is fine and costs nothing — the solver does not need to model it
  for the board to be guaranteed guess-free.
- **Parity on the edge/line totals.** A parity row total is a coherent idea and a
  separate feature.
- **Combining E/O with `{}`/`--`.** "An even number of neighbours, all in one
  run" is legible but unmeasured, and it interacts with the ring enumeration.
- **Tuning how many E/O clues a board gets.** Revisit after play-testing.
- **Curated boards using even/odd.** A content pass with its own validation run.
- **A fourth difficulty tier.** Even/odd lives inside Deep. A new tier would
  ripple into pools, achievements, journal stats, the curated manifest, and the
  Home picker for no gain here.
- **Retro-fitting even/odd into the tutorial's scripted board.** The How to play
  text covers it; a tutorial beat is separate.
