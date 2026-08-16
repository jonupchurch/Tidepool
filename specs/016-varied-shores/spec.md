# Feature Specification: Varied Shores in the Endless Tide

**Feature Branch**: `016-varied-shores`

**Created**: 2026-08-16

**Status**: Built

**Input**: Make the generated levels support odd shapes like the curated ones, as well as exterior lines with `--` and `{}`.

> **Note on process.** Unlike 001–015 this feature was scoped with a mini-spec in
> conversation rather than the full Spec-Kit pass, then written up here so the
> artifact record stays complete (Principle X). The measurements it rests on are
> in "Measured constraints" below; they were taken before any code was written.

## Context

The engine has accepted both mechanics for some time. `generateBoard` takes a
`shape` (feature 012) and a `clues.lineConnectivity` toggle (feature 010), and
`Board.present` has always been the engine's notion of topology, so every clue is
already computed over an irregular region.

What was missing is that nothing on the *generated* path ever asked for them. The
shell built every request as a filled hexagon with `{connectivity, lineTotals}`,
and only the curated manifest named a shape or a clue set. So this feature is a
selection layer, not engine work — no generation logic changed.

## Measured constraints

Taken by generating boards across 5 seeds × 3 sizes × 3 tiers before designing:

1. **`lineConnectivity` does nothing below Deep.** Calm produced 0 line clues at
   all; Tricky produced 222 line clues with **0** annotated; only Deep kept any.
   Reduction offers each annotation for removal and drops the ones the tier's
   technique set cannot use, and `line-connectivity` is Deep-only
   (`allowedTechniquesFor`). The shipped curated pack agrees: all 18 annotated
   entries are Deep.
2. **Annotations are sparse even at Deep** — 0–3 per board. A player who turns
   hints on will not see them on every board. This is equally true of the
   curated Deep boards and is not a defect.
3. **Every shape/size/tier pair generates cleanly**, worst case ~300 ms, no
   failures.

## User Scenarios & Testing

### User Story 1 - Play a generated board on an odd shape (Priority: P1)

The player picks a shore on Home and gets an Endless board carved to it, with all
the same clue reading — including the edge numbers that now run along an
irregular boundary.

**Independent Test**: Pick Large / Deep / Atoll, press Play, and confirm the
board has an open lagoon and fewer cells than a filled hexagon of that tier.

**Acceptance Scenarios**:

1. **Given** a Medium or Large size, **When** the player picks a named shore,
   **Then** the board served is carved to that silhouette.
2. **Given** the shore left at Open water, **When** the player presses Play,
   **Then** the board is bit-for-bit the one that seed has always produced.
3. **Given** the shore set to Any, **When** the player advances the stream,
   **Then** successive boards differ in silhouette, and each is reproducible
   from its own seed.

### User Story 2 - Read `{n}` and `-n-` on the edge numbers (Priority: P1)

At Deep, the player can turn on edge hints and have row totals tell them whether
that row's water sits in one unbroken run or comes apart.

**Independent Test**: Enter `KELP-0027 Large Deep hints` and confirm the board
shows annotated edge numbers of both kinds.

**Acceptance Scenarios**:

1. **Given** Deep and edge hints on, **When** a board is served, **Then** rows
   whose annotation says something carry `{n}` or `-n-`.
2. **Given** a tier below Deep, **When** edge hints are on, **Then** the board is
   unchanged from what that seed always produced.

### User Story 3 - Share the exact board (Priority: P2)

The board label names everything that distinguishes the board, and seed entry
reads it all back, so a player can pass a friend a shaped, annotated board.

**Acceptance Scenarios**:

1. **Given** any board, **When** its label is pasted into seed entry, **Then**
   the same board loads.
2. **Given** a token naming no shore or hints, **When** it is loaded, **Then**
   the pre-016 board for that seed is served.

## Requirements

- **FR-001**: Endless boards MUST support every silhouette the catalog claims for
  the requested size.
- **FR-002**: Endless Deep boards MUST be able to carry `{n}` / `-n-` row totals.
- **FR-003**: Both MUST be opt-in. With the controls untouched, a seed MUST
  produce a byte-identical board to the one it produced before this feature.
- **FR-004**: Edge hints MUST be gated on Deep in code, not only in the UI — a
  stale stored preference must not change a Calm or Tricky board.
- **FR-005**: A shore the current size cannot carry MUST degrade to the hexagon,
  never throw.
- **FR-006**: The held choice MUST survive a size change that cannot honour it.
- **FR-007**: Both choices MUST persist across sessions, as optional fields on
  the existing settings `play` group.
- **FR-008**: The board label MUST name every input that distinguishes the board,
  and seed entry MUST parse it back.

## Non-goals (named, not folded in)

- **Small-size silhouettes.** The catalog stays Medium/Large; the picker is shown
  disabled on Small with the reason.
- **New silhouettes** beyond the four that shipped in 012.
- **A share/copy button for Endless seeds.** Curated has one; adding it here is
  its own slice.
- **Making annotations denser than the generator naturally produces.** That would
  mean changing candidate acceptance for `lineConnectivity` boards, which would
  silently rewrite the 18 shipped curated Deep boards — and the fingerprint table
  does not cover them, so nothing would have caught it.

## Success Criteria

- **SC-001**: With no options, the shell produces byte-identical boards at every
  seed/size/tier (`board-request.test.ts`), and `fingerprints.test.ts` is green.
- **SC-002**: An Endless atoll board is served and rendered, verified end-to-end
  by cell count rather than by label (`e2e/endless-shores.spec.ts`).
- **SC-003**: An Endless Deep board shows annotated edge numbers of both kinds.
- **SC-004**: Every board label round-trips through seed entry to the same params.
