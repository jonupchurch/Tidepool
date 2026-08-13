# Implementation Plan: Irregular Shores

**Branch**: `012-irregular-shores` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

## Summary

The engine already models board topology as data: `Board.present` is a `Set<string>`, every clue is computed over it, and `pools`, `hit-test`, `fitLayout` and `linesOf` all read it rather than assuming a hexagon. So an irregular board needs one new thing — a way to *produce* a non-hexagonal present set — plus hardening in the two places that have quietly only ever seen a symmetric one.

Add `src/core/shapes.ts`: a catalog of named silhouettes, each a predicate over axial coordinates parameterised by the size tier's radius, carved out of the same `hexRegion` the size tiers already define. `BoardParams` gains an optional `shape`; absent means the filled hexagon and generates byte-identically to today.

The interesting work is not the shapes. It is proving that margin labels still land somewhere legal on a concave board, and that a silhouette can never ship broken.

## Technical Context

**Language/Version**: TypeScript 5, strict. `src/core/` stays DOM-free (`core/purity.test.ts`).

**Primary Dependencies**: None new.

**Storage**: None new. `BoardParams` is what `inProgressBoardRecord.request` persists and what `serialize.ts` writes wholesale (`params: Board['params']`), so an added optional field rides along in both without a schema change. `VALIDATORS.inProgressBoard` only structurally checks `request.seed`, so old records keep validating; an absent `shape` reads as the hexagon it always was.

**Testing**: Vitest for the catalog invariants and generation; Playwright for fit and label placement on the most awkward silhouette. The catalog check runs as a test **and** as a build script, alongside `validate:curated`.

**Target Platform**: Web + Tauri desktop. Unchanged.

**Performance Goals**: No regression in `core/perf.test.ts`. A carved region has fewer cells than the hexagon it came from, so generation gets cheaper, not dearer — but candidate rejection may rise, which is what the generatability check measures.

**Constraints**: Principle XI. Every shape/size/difficulty combination the catalog claims must produce unique, guess-free, honestly-rated boards, or be refused up front.

**Scale/Scope**: 1 new engine module, ~4 engine files touched, 1 renderer file hardened, 1 new validation script.

## Constitution Check

- **III. Conventions** — `shapes.ts` sits beside `hex.ts` and follows its shape: pure, deterministic, coordinate-space functions returning `Axial[]`, consumed through `presentSet()`. The catalog is data in `core/`, not content in `src/content/`, because it is geometry the engine must trust. ✅
- **IV. Scope** — a validated catalog and the hardening it demands. Procedural carving is named out of scope in the spec; player-facing shape selection is [013](../013-curated-page-two/spec.md)'s call. ✅
- **VIII. Testing** — catalog invariants (connected, no isolated cells, generatable) are exactly the branching, edge-case logic unit tests are for. Fit and label placement need a real viewport, so they are Playwright. ✅
- **XI. Determinism & Solvability** — binding. Same append-only seed-string discipline as [010](../010-line-annotations/spec.md); plus a hard gate that no shape ships without every declared size generating. ✅

No violations.

## Project Structure

```text
src/core/
├── shapes.ts         # NEW: ShapeId, SHAPES catalog, regionFor(size, shape), shape invariant checks
├── hex.ts            # unchanged; hexRegion stays the region every silhouette is carved from
├── board.ts          # BoardParams.shape?: ShapeId
├── generate.ts       # presentSet(regionFor(...)); rngSeedString append-only
└── shapes.test.ts    # catalog invariants + a generatability sweep
src/render/
└── line-labels.ts    # anchor placement must not land over a cell of a different row
scripts/
└── validate-shapes.ts  # build gate, mirroring validate-curated.ts
```

**Structure Decision**: A new `core/shapes.ts` rather than growing `hex.ts`. `hex.ts` is coordinate primitives — directions, keys, lines, the region generator — and is imported nearly everywhere. Silhouettes are a catalog with an editorial dimension (which shapes exist, which sizes they claim) and will keep growing; that belongs in its own module with its own tests.

## Design notes

### Silhouettes as predicates, not cell lists

Each silhouette is a predicate over an axial coord, parameterised by the size tier's radius:

```
atoll     dist(c) >= radius - 2                    a ring with an open middle
crescent  in hex, minus a disc centred off-axis    a curved bay
wedge     one 120° sector plus the centre          a fan opening from a corner
```

Predicates beat literal cell lists on three counts: one definition covers Small / Medium / Large instead of three hand-typed tables; they stay readable in review, which matters because a wrong cell in a literal table is invisible; and they compose with `hexRegion` so cell counts stay in the range the size vocabulary already implies.

The catalog declares which sizes each silhouette supports. A predicate that produces a good Large atoll may produce a 6-cell ring at Small — refused (FR-002), not served badly.

### Determinism

Same discipline as [010](../010-line-annotations/spec.md), and the same trap. `rngSeedString()` gains a segment **only** when a shape other than the default is named:

```
no shape (today, forever):  COVE-0001|Medium|Calm|c1l1|#3
atoll:                      KELP-0007|Large|Deep|c1l1|s:atoll|#3
```

If [010](../010-line-annotations/spec.md) lands first, the two optional segments must have a fixed order relative to each other, decided once and tested, or a board with both will differ depending on which feature's code path composed the string. Pick the order when the second one lands and pin it with a fingerprint test.

### The real risk: margin labels on a concave board

`lineAnchors()` places a row's total in the empty hex slot one step back along that row's *own* axis. On a hexagon that is always safe, and safe for a subtle reason worth writing down: the anchor sits before the row's first cell in sorted order, so it cannot be a cell **of that row**.

It says nothing about other rows. On a hexagon, rows shorten as you move outward, so the slot before a short row is outside the board. On a **concave** silhouette — a crescent, or anything with a bite taken out of one side — a short row's label can land directly on top of a cell belonging to a *neighbouring* row. The board would render, the tests would pass, and the label would be unreadable and would steal clicks.

Fix it where the ambiguity is: after choosing a candidate anchor, reject it if it lies within a cell's radius of any present cell, and keep nudging. The nudge machinery (`MAX_NUDGE`, opposite-end preference) already exists — it just needs "is this over a cell?" added to `free()` alongside "is this too close to another label?". This is a small change and it is the single most important line of code in the feature.

Test it directly: a hand-built concave present set, assert no anchor lands within a cell radius of a present cell.

### What needs no work (verified, not assumed)

- `pools.ts` flood-fills via `presentNeighbors(coord, board.present)` — generic.
- `hitTest` / `fitLayout` read `present` and bounds — generic; `fitLayout` already folds label anchors and dash tips into the fitted extent, so an asymmetric board with one-sided labels stays on canvas.
- `linesOf` groups by line index over whatever coords exist — a row with a hole comes back as one line with a gap, which is the intended reading (the total covers the whole row).
- `serialize.ts` writes `params` wholesale and rebuilds `present` from the cell list.
- Adjacency clues already count only present neighbours.

Each of these gets an assertion in the shaped-board test rather than a comment claiming it works.

### Interaction with 010

A row with a hole is exactly the case [010](../010-line-annotations/spec.md)'s segment logic exists for: a gap breaks a run. That rule is specified and built in 010 before any board can produce a gapped row, so the two cannot disagree. If 012 somehow lands first, 010's run logic must still be written gap-aware.

### Validation gate

`scripts/validate-shapes.ts`, mirroring `validate-curated.ts`, run in CI:

1. Every silhouette, at every declared size: region is non-empty, connected, no cell without a neighbour, above a minimum cell count.
2. Every silhouette × declared size × difficulty: a board generates, and `solve()` reports solved, unique, and on-tier.

Step 2 is the expensive one and the one that matters — it is the difference between "the shape looks fine" and "this shape can actually carry a puzzle".

## Risks

| Risk | Handling |
|---|---|
| Label lands over a cell of another row on a concave shape | `free()` also rejects anchors near present cells; direct test on a hand-built concave region |
| A silhouette produces unsolvable or badly-rated boards at some size | Generatability sweep in the CI gate; unsupported combinations declared and refused |
| Seed-string segment order ambiguous once 010 and 012 both land | Fix the order once, pin with a fingerprint test |
| Carved regions push candidate rejection up and generation gets slow | Measured by the sweep; `MAX_CANDIDATES` and the water-fraction window are the tuning knobs |
| Shapes make pools tiny and creature reveals rare | Minimum cell count per shape; check the pool-size distribution in the sweep |

## Sequencing

Build after [010](../010-line-annotations/spec.md) and [011](../011-perfect-solves/spec.md), before [013](../013-curated-page-two/spec.md). It is the riskiest of the five and the one most likely to want a second pass, so it should not be the thing blocking the cheap wins.
