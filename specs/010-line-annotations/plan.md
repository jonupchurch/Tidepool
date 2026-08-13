# Implementation Plan: Line Annotations (`{n}` / `-n-` on edge totals)

**Branch**: `010-line-annotations` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

## Summary

Give `LineClue` an optional `connectivity`, exactly as `AdjacencyClue` already has one, and teach the solver to deduce from it. A row's water is *together* when it forms one unbroken run along the row and *apart* otherwise, where a stone **or a missing cell** ends a run. A new `lineConnectivity` clue toggle, default off, gates generation — and is appended to the RNG seed string only when on, so every board that exists today generates byte-identically.

The only genuinely new machinery is one solver pass: a forward/backward DP over a row that decides, for each unknown cell, whether every valid arrangement makes it water (or stone). Everything else is threading an optional field through paths that already carry one.

## Technical Context

**Language/Version**: TypeScript 5, strict. Pure ES modules; `src/core/` is DOM-free and enforced so by `core/purity.test.ts`.

**Primary Dependencies**: None new. The mechanic is a peer of the existing connectivity clue and reuses its shape.

**Storage**: None new. `ClueToggles` already rides inside `BoardParams`, which is what `inProgressBoardRecord.request` persists — so a board using the mechanic saves and resumes with no schema change.

**Testing**: Vitest for the engine (unit + the existing contract/determinism/purity/perf guards); Playwright for the rendered label. The existing `generate.contract.test.ts` and `determinism.test.ts` are the load-bearing guards for FR-009/FR-010.

**Target Platform**: Web + Tauri desktop. Unchanged.

**Performance Goals**: No regression in `core/perf.test.ts`. The DP is O(cells × water × 4) per row per fixpoint round — for the longest row on a Large board (15 cells) that is under a thousand states, well below the existing 2⁶ ring enumeration cost per adjacency clue.

**Constraints**: Principle XI. Every board still uniquely solvable and guess-free; every existing seed still produces its existing board.

**Scale/Scope**: ~8 engine files, 1 renderer file, 1 help-content file. No UI screens, no persistence changes.

## Constitution Check

- **III. Conventions** — the mechanic mirrors `AdjacencyClue.connectivity` field-for-field and reuses `Connectivity`, `circularRuns`'s vocabulary, and the existing `{}`/`--` render treatment. Nothing new is invented where an analog exists. ✅
- **IV. Scope** — row annotations only. Endless keeps its clue set; the curated pack is [013](../013-curated-page-two/spec.md)'s job. ✅
- **VIII. Testing** — the engine is exactly where unit tests carry signal, and this is branching logic over a small state space. DP correctness gets tested against brute-force enumeration on short rows. ✅
- **XI. Determinism & Solvability** — the binding constraint. Handled by an append-only seed string plus a frozen-seed regression test; see Design notes. ✅

No violations.

## Project Structure

```text
src/core/
├── board.ts          # LineClue.connectivity?; ClueToggles.lineConnectivity; Technique += 'line-connectivity'
├── clues.ts          # lineSegments(), lineRuns(), lineConnectivityOf(), lineConnectivityInformative()
├── techniques.ts     # line constraints carry order + gaps; lineConnectivityPass() (the DP)
├── solver.ts         # technique order + allowed-gating + propagate()
├── difficulty.ts     # allowedTechniquesFor('Deep'); rateDifficulty
├── generate.ts       # rngSeedString (append-only); buildFullyCluedBoard attaches annotations
└── reduce.ts         # a third removal kind: drop the annotation before dropping the whole line
src/render/
├── line-labels.ts    # wider collision clearance for an annotated label
└── board-renderer.ts # lineText(): the {n} / -n- / n form, mirroring clueText()
src/ui/gameplay/
└── how-to-play-content.tsx
```

**Structure Decision**: No new modules. Every change lands in the file that already owns that concern, which is what keeps the mechanic reviewable against its adjacency twin.

## Design notes

### Determinism: append-only seed string

`rngSeedString()` builds `${seed}|${size}|${difficulty}|c{0,1}l{0,1}|#${cand}`. Adding a third flag to that segment would change the RNG stream for **every** board in existence. Instead the new toggle contributes a segment **only when enabled**:

```
off (today, forever):  COVE-0001|Medium|Calm|c1l1|#3
on  (new boards):      KELP-0007|Large|Deep|c1l1|lc1|#3
```

Guard it with a frozen-seed test: a checked-in table of `seed → board fingerprint` for a spread of existing seeds, asserted byte-identical. This is cheap insurance on a NON-NEGOTIABLE principle, and it is the test that will catch the next person who edits that function.

The same care applies in `reduce.ts`: the removal order comes from a seeded `shuffle` over an item list, so *adding items to that list changes every reduced board*. Annotation-removal items only exist on boards that have annotations — i.e. only when the toggle is on — so today's boards keep their item list and their shuffle. This is a real trap and worth a comment at the site.

### Runs over a row, with holes

`linesOf()` already returns each row's cells sorted along the axis. A row on a hexagonal board is contiguous; on a shaped board ([012](../012-irregular-shores/spec.md)) it may not be. Split the sorted cell list into **segments** — maximal stretches where consecutive cells differ by exactly that axis's step — and count runs of water within segments only. A hole therefore ends a run, matching how an absent neighbour ends a run on an adjacency ring (`ringWater` maps absent slots to `false`).

This costs nothing today (every row is one segment) and means 010 and 012 cannot disagree when 012 lands. Implement and test it now.

### Informativeness: exact, not a heuristic

The adjacency clue uses a count window (`2 ≤ water ≤ neighbours − 2`) to decide whether `{}`/`--` says anything. That heuristic is right for a 6-slot ring but wrong for a row with holes — a row like `A B ▢ C D` with two water cells admits both a together and an apart arrangement at counts the window would reject, and a row of two isolated segments is *forced* apart at a count the window would accept.

Use the exact rule instead: annotate iff **both** connectivity values are achievable for that row given its length, its segment structure, and its total. The DP below computes exactly this, so it costs one extra call and no new code. Leave the adjacency rule alone — changing it would move every existing board.

### The solver pass

For one row: cells in order, a target water count, and a wanted connectivity. State is `(index, waterUsed, runsSoFar capped at 2, inRun)`. Run a forward feasibility pass and a backward one; a cell is forced water when no valid arrangement leaves it stone, and vice versa. Contradiction when no arrangement is valid at all — the same signal `applyConnectivity` already raises.

Correctness gets pinned by testing the DP against brute-force subset enumeration on rows short enough to enumerate (≤ 12 cells), across every total and both connectivity values. That is the test that actually proves this, and it is cheap to write.

`propagate()` in the uniqueness counter must run the new pass too. The existing comment there explains why — a connectivity-dependent board that cannot propagate blows the step budget — and the same reasoning applies verbatim.

### Difficulty

`line-connectivity` joins the `Technique` union and is Deep-tier: `allowedTechniquesFor('Deep')` gains it, `rateDifficulty` treats it like `connectivity`. Calm and Tricky must **not** get it, or reduction will produce boards that need it and then rate them below their tier.

### Rendering

`lineText(clue)` mirrors `clueText(clue)` — same braces, same dashes, same font. Two things to check rather than assume:

- `MIN_GAP` in `line-labels.ts` spaces labels by centre distance in hex-step units, tuned for a one- or two-character number. `-10-` is roughly twice as wide, so annotated labels need more clearance or they will touch. Widen the gap for annotated rows specifically, so unannotated boards keep their current label placement exactly.
- `lineLabelAt()`'s hit radius should follow, so the wider label stays fully clickable for strike-off and guides.

## Risks

| Risk | Handling |
|---|---|
| Seed-string or reduction-order change silently regenerates every board | Frozen-seed fingerprint test; append-only segment; comment at both sites |
| DP subtly wrong in a corner (empty row, full row, zero water) | Brute-force differential test across all totals and both values |
| Annotated labels collide or overflow at Large | Widen clearance for annotated labels only; Playwright check at the largest size |
| Reduction leans so hard on annotations that boards get thin | Reduction already keeps only removals that preserve guess-free solvability; watch the rating distribution when generating [013](../013-curated-page-two/spec.md)'s pack |

## Sequencing

Independent of the other four features. Build first: [013](../013-curated-page-two/spec.md) needs it finished and verified, and it touches the engine, which is the part everything else rests on.
