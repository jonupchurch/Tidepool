# Feature Specification: Framed Parity — marks on edges, and `{}` / `--` on marks

**Feature Branch**: `019-framed-parity`

**Created**: 2026-08-17

**Status**: Draft

**Input**: Edge markers should be able to have a `+` / `|`. What about `{+}` or `{|}`?

> **Depends on [018](../018-even-odd-clues/spec.md)**, which is built and verified
> but **not yet merged or playtested**. This spec is written now because the
> measurements were cheap to take while the machinery was fresh; see "Sequencing
> risk" before starting on it.

## Context

018 gave a stone one new thing to say: the *parity* of its water neighbours —
`+` for even, `|` for odd — in place of an exact count. It stopped there
deliberately, naming two extensions as non-goals: parity on the edge totals, and
combining a parity mark with the `{}`/`--` run annotation.

Both of those turn out to be the same idea, and it is a tidier idea than either
alone. The game already has a **face** (what a clue says about quantity: a
number, or now a parity) and a **framing** (what it says about arrangement:
nothing, `{}` for one unbroken run, `--` for two or more). Until now the framing
only ever wrapped a number, and parity only ever appeared bare on a tile. Letting
the two compose freely, in both places a clue can live, gives:

|        | bare | one run | split |
|--------|------|---------|-------|
| count  | `4`  | `{4}`   | `-4-` |
| parity | `+`  | `{+}`   | `-+-` |

…on a tile and on an edge total alike. Nothing new is invented; two rules the
player already knows stop being artificially prevented from meeting.

## Measured constraints

Taken before designing, on served Deep boards across 5 seeds × 3 sizes — 202 edge
totals and 284 ring clues. Method as in 018: start from the already-minimal
board, so every clue has been proved necessary in its exact form, then ask whether
a weaker form still suffices. Control throughout: delete the clue instead, which
must fail.

1. **A bare parity mark works on an edge total: 81 of 202 (40.1%)**, with the
   control at **0 of 202**. So every one of those 81 is genuine parity
   information, not redundancy.
2. **This contradicted the prediction that motivated the original non-goal.**
   018's plan reasoned that the parity technique only fires when a single cell is
   unsettled, which on a 13-cell row means waiting for twelve — so edge parity
   would be nearly useless. The reasoning was sound and the conclusion wrong:
   rows *are* heavily settled by ring clues late in a solve, and the exact
   total's marginal value over its parity is frequently just the final cell.
3. **Framed parity works on an edge total: 94 of 202 (46.5%)** — better than bare,
   as expected, since `{+}` says strictly more than `+`.
4. **Framed parity works on a ring clue: 190 of 284 (66.9%)**, control 25
   (8.8%). That control is not noise: it is 018's known reveal-leak, where a cell
   stays a revealed stone even once its clue is gone. Genuine framed-parity
   information is therefore ~58% of ring clues — far more than the 35% that bare
   parity manages, because the run annotation does the work the lone-unknown rule
   cannot.
5. **Density is now the main design risk, not scarcity.** At ~58–67% of ring
   clues and ~46% of edge totals, a board could show more parity than number.
   That is the opposite problem from feature 016's annotations, and it is what
   FR-007's preference order exists to control.

## User Scenarios & Testing

### User Story 1 - Read a parity mark on an edge total (Priority: P1)

A player on a Deep board sees `+` where a row's total would be. The row holds an
even number of water tiles; it won't say how many. Once all but one of that row is
settled, the mark finishes it.

**Why this priority**: It is half the ask, and the half with the measurement
behind it.

**Independent Test**: Load a Deep board with the mechanic on and confirm at least
one edge total renders as a parity mark, and that the board completes guess-free.

**Acceptance Scenarios**:

1. **Given** a Deep board with the mechanic on, **When** it is served, **Then**
   some edge totals show a parity mark in place of a number.
2. **Given** a row whose parity mark is the only unsettled information left,
   **When** the player reasons from it, **Then** the last cell is determined.
3. **Given** any served board, **When** the oracle checks it, **Then** it has
   exactly one solution reachable with no guessing.

---

### User Story 2 - Read a framed parity mark (Priority: P1)

A player sees `{+}` on a stone: an even number of water tiles beside it, and that
water all in one unbroken run. Or `-|-`: an odd number, in two or more pieces.
The two things they already know how to read compose.

**Why this priority**: The other half of the ask, and deductively the stronger
half — it is where parity earns its place on a long row.

**Independent Test**: Load a board carrying framed marks and confirm all four
combinations (`{+}`, `-+-`, `{|}`, `-|-`) are reachable across a sample.

**Acceptance Scenarios**:

1. **Given** a stone whose water is even and in one run, **When** it is shown as
   a framed parity mark, **Then** it reads `{+}`.
2. **Given** a stone whose water is odd and split, **Then** it reads `-|-`.
3. **Given** a framed parity mark, **When** the solver reasons from it, **Then**
   it uses both facts — the arrangements it rules out are those failing *either*
   the parity or the run count.
4. **Given** a framed mark on an edge total, **Then** it reads the same way as on
   a tile, with the row's holes ending a run exactly as they do today.

---

### User Story 3 - Learn the grid, not six new glyphs (Priority: P2)

A player meeting `-|-` for the first time can work it out from the two rules they
already have, and the How to play page presents it as a grid rather than a list of
special cases.

**Why this priority**: Six parity forms presented as six separate glyphs would be
a wall. Presented as face × framing it is two rules the player mostly knows.

**Acceptance Scenarios**:

1. **Given** the How to play page, **When** the player reads the clue forms,
   **Then** the composition rule is stated once and applies to every form.

---

### User Story 4 - Share the exact board (Priority: P3)

The board label continues to name every input that distinguishes the board, and
seed entry reads it back.

**Acceptance Scenarios**:

1. **Given** a board using framed parity, **When** its label is pasted into seed
   entry, **Then** the same board loads.

### Edge Cases

- **A framing that says nothing.** `{}`/`--` is only meaningful when both
  readings are achievable — the existing `connectivityInformative` /
  `lineConnectivityInforms` rules. Over a *parity* face the question changes:
  the set of possible counts is now every count of that parity, so achievability
  must be recomputed against that set, not against a single known total.
- **A parity mark hiding a zero.** Already forbidden by 018 FR-006, and it stays
  forbidden — including on edge totals, where a row of no water would otherwise
  read `+`.
- **A row with holes.** A gap ends a run, as it has since 010. Unchanged.
- **A stale preference below Deep.** Same trap, same handling as 016 and 018:
  gated in code, not only in the UI.
- **An edge mark's legibility.** A bare `|` in the margin has no tile behind it
  and sits among arrows and numbers; whether it reads as a clue rather than a
  tick mark has to be settled by looking (see Assumptions).

## Requirements

### Functional Requirements

- **FR-001**: An edge total MUST be able to show a parity mark in place of its
  number.
- **FR-002**: A parity mark — on a tile or an edge total — MUST be able to carry
  the existing `{}` / `--` run annotation, giving `{+}`, `-+-`, `{|}`, `-|-`.
- **FR-003**: The solver MUST reason from both halves of a framed mark together:
  an arrangement is admissible only if it satisfies the parity **and** the run
  count. Reasoning from either half alone would be sound but weaker, and boards
  are reduced against what the solver can actually do.
- **FR-004**: A framing MUST only be attached where it distinguishes something,
  recomputed against the set of counts the parity admits rather than a single
  total.
- **FR-005**: Every served board MUST be verified uniquely solvable and guess-free
  by the same oracle every other board passes, including the independent
  solution counter, which MUST understand every new form.
- **FR-006**: The mechanic MUST remain opt-in and Deep-only, enforced in code
  rather than only in the UI.
- **FR-007**: Reduction MUST prefer the form that **withholds the most**, trying
  bare parity first, then framed parity, and keeping the exact count when neither
  survives. This is what stops framed marks — which survive on ~58% of ring clues
  — from crowding out both bare marks and numbers.
- **FR-008**: With the mechanic off, every seed MUST produce a byte-identical
  board to the one it produced before this feature.
- **FR-009**: A parity mark MUST NOT be shown over a count of zero, on a tile or
  an edge total (inherited from 018 FR-006).
- **FR-010**: Every new form MUST survive a serialization and save/restore round
  trip.
- **FR-011**: The board label MUST continue to describe the board completely, and
  seed entry MUST read it back.
- **FR-012**: The composition rule MUST be explained wherever the clue forms are
  explained.
- **FR-013**: A framing MUST NOT be attached to a parity mark whose true count is
  1 or 2. Added during playtest. A framing over a *known* count is read against
  that count — `{2}` says two tiles side by side and there is nothing to misread
  — but a framing over a *withheld* count is read on its own, and "all in one
  unbroken run" is not how anyone describes a single tile. A player meeting
  `{|}` takes the run to be more than one tile, rules out 1, and concludes 3 or
  5; over a true 1 that is a wrong deduction reached by sound-looking reasoning,
  which is the same trap FR-009 exists to prevent. This does **not** apply to
  counting clues: `{2}` stays legal, both because the count disambiguates it and
  because changing that would regenerate every board in existence.

### Key Entities

- **Clue face**: what a clue says about quantity — an exact count, or a parity.
- **Clue framing**: what it says about arrangement — nothing, one unbroken run,
  or two or more. Orthogonal to the face; this feature is what makes it so.
- **Clue site**: a stone, or an edge total. Both carry a face and a framing.

## Success Criteria

- **SC-001**: With the mechanic off, boards are byte-identical at every seed ×
  size × tier, and the frozen fingerprint table is green.
- **SC-002**: Across 5 seeds × 3 sizes at Deep, every board carries at least one
  parity-marked edge total, and every board passes the unique-and-guess-free
  oracle.
- **SC-003**: All four framed forms appear somewhere across that sample, verified
  from what the renderer produced rather than from params.
- **SC-004**: No board below Deep carries any parity form, with the toggle forced
  on.
- **SC-005**: Numbers remain the most common clue face on a Deep board — parity
  forms are a minority of all clues, tiles and edges counted together.
- **SC-006**: Large/Deep generation stays inside the existing 2000 ms
  generate-and-verify budget.
- **SC-007**: A player can derive the meaning of `-|-` from the in-game
  explanation without being told that specific form.

## Assumptions

- **Both framings, not just braces.** The ask named `{+}` and `{|}`; this spec
  includes `-+-` and `-|-` too. `{}` and `--` are two values of one annotation,
  and offering only the first would mean a player can be told water is in one run
  but never that it is split — an incoherent rule rather than a smaller one.
- **One toggle, not two.** This extends 018's `evenOdd` rather than adding a
  second switch: one concept, one control, no second seed-string segment. **This
  holds only while 018 is unreleased** — see Sequencing risk.
- **Reduction prefers withholding** (FR-007) rather than preferring the strongest
  clue or picking at random. Untested as a feel decision; it is the choice most
  likely to keep numbers on the board.
- **Edge marks reuse the annotated-label spacing** that `-10-` already needs, so
  `{+}` should fit the existing collision rules. To be confirmed by looking, along
  with whether a bare `|` reads as a clue in the margin.
- **Density needs a look before it needs tuning.** No cap is specified. FR-005 and
  FR-007 are expected to be sufficient; if a Large Deep board still reads as mush,
  that is a follow-up, not a rebuild.

## Sequencing risk

018 is verified but **unplaytested**. This feature multiplies its clue vocabulary
from two forms to six, so if the underlying parity deduction turns out to feel
fiddly rather than satisfying, 019 makes the problem larger rather than smaller.

The honest order is: play 018, decide the mechanic is worth having, then build
019. Concretely, two things in this spec depend on that not being deferred:

- **The single-toggle assumption.** If 018 ships to Steam before 019 lands, every
  shipped `evenOdd` board would move the moment 019 extends the same toggle.
  019 would then need its own toggle and its own seed segment, which is more work
  and one more switch on Home.
- **FR-007's preference order** is tuned for a mechanic whose feel is known. It is
  a guess until someone has solved a parity board by hand.

## Non-goals (named, not folded in)

- **Parity subtraction.** Still out, for 018's measured reason (1 clue in 284) and
  because it wants to read the parity of ordinary counting clues, which would
  strengthen the solver on every board in existence.
- **A parity form for the pool/creature counts** or any clue site other than
  stones and edge totals.
- **Curated boards using the new forms.** A content pass with its own validation.
- **A fourth difficulty tier.** Everything here lives inside Deep.
- **Density caps.** See Assumptions.
