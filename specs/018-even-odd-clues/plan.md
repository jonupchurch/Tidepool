# Implementation Plan: Even and Odd Clues (`E` / `O` on stones)

**Branch**: `018-even-odd-clues` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

> **Note on artifacts.** This is a single `plan.md`, matching [010](../010-line-annotations/plan.md)
> — the nearest analog and the last engine-side clue mechanic — rather than the
> full `research.md` / `data-model.md` / `contracts/` / `quickstart.md` set. The
> research that would have filled `research.md` was done as measurement *before*
> the spec (see its "Measured constraints"), the data model is four type changes
> described below, and `core/` is an internal module with no external contract.
> Splitting that across four files would add ceremony, not signal (Principle IV).

## Summary

Give `AdjacencyClue` a second form: instead of a count, a stone may show the
**parity** of its water neighbours — `E` for even, `O` for odd. A new `evenOdd`
clue toggle, default off and Deep-only, gates it, and appends to the RNG seed
string only when on, so every board that exists today generates byte-identically.

The mechanic inverts how generation has worked. 010 and 012 *added* information
and let reduction strip what a tier could not use; parity *removes* information
from a clue reduction has already proved necessary. So it cannot be applied during
generation — the fully-clued board would stop being uniquely solvable and every
candidate would be rejected. It is applied instead as a **second reduction pass**:
after the existing removal loop finishes, walk the surviving clues and weaken the
ones the board can still be solved without.

The genuinely new machinery is small — one solver pass of roughly fifteen lines,
because the measurement killed the expensive version of the technique. Most of the
work is threading a second clue form through paths that assume a count exists.

## Technical Context

**Language/Version**: TypeScript 5, strict. Pure ES modules; `src/core/` is
DOM-free and enforced by `core/purity.test.ts`.

**Primary Dependencies**: None new.

**Storage**: No schema change. `ClueToggles` already rides inside `BoardParams`,
which is what `inProgressBoardRecord.request` persists, so a board using the
mechanic saves and resumes as itself. `settings.play` gains one optional boolean
alongside `edgeHints`, validated the same way.

**Testing**: Vitest for the engine (plus the existing contract / determinism /
purity / perf / fingerprint guards); Playwright for the rendered glyph. The
load-bearing guards are `fingerprints.test.ts` (FR-005) and a new inertness test
(FR-003).

**Target Platform**: Web + Tauri desktop. Unchanged.

**Performance Goals**: No regression in `core/perf.test.ts`. The weakening pass
measured 0–20 ms per board against the 2000 ms generate-and-verify budget; the
parity pass itself is O(constraints × ring) per fixpoint round, cheaper than the
2⁶ ring enumeration `applyConnectivity` already runs.

**Constraints**: Principle XI. Every board still uniquely solvable and guess-free;
every existing seed still produces its existing board.

**Scale/Scope**: ~7 engine files, 1 renderer file, 3 game/board-source files,
2 UI files, 1 help-content file. No new modules, no new screens, no persistence
migration.

## Constitution Check

- **III. Conventions** — every piece has an existing analog and copies its shape:
  `Parity` mirrors `Connectivity`, `parityInformative` mirrors
  `connectivityInformative`, `parityPass` mirrors `connectivityPass`, the toggle
  and its Deep gate mirror `edgeHints` / `edgeHintsApply`, and the seed segment
  mirrors `|lc1`. Nothing is invented where an analog exists. ✅
- **IV. Scope** — Endless at Deep only. Parity subtraction, parity on line
  totals, `E`+`{}` combinations, density tuning, and curated content are all named
  as non-goals in the spec and stay out. ✅
- **V. Verify** — the golden path is a Deep board that renders both glyphs and
  completes; the obvious edge case is the same board at Calm with a stale toggle.
  Both get run, not reasoned about. ✅
- **VIII. Testing** — the engine is exactly where unit tests carry signal. The
  parity pass gets a differential test against brute-force ring enumeration, the
  same way 010's DP did. ✅
- **XI. Determinism & Solvability** — the binding constraint, and the one this
  feature can most easily violate (see "The inertness trap"). Handled by an
  append-only seed segment, a structurally inert pass, and two regression tests. ✅

No violations.

## Project Structure

```text
src/core/
├── board.ts        # Parity type; AdjacencyClue becomes a UNION; ClueToggles.evenOdd;
│                   # Technique += 'parity'
├── clues.ts        # parityOf(), parityInformative(), adjacencyClue() unchanged
├── techniques.ts   # Constraint becomes a discriminated union; parityPass()
├── solver.ts       # TECHNIQUE_ORDER += 'parity'; propagate() runs the new pass
├── difficulty.ts   # allowedTechniquesFor('Deep') += 'parity'; rateDifficulty
├── generate.ts     # rngSeedString: |eo1 segment, pinned position
└── reduce.ts       # the weakening pass, after the removal loop
src/render/
└── board-renderer.ts   # clueText(): the E / O forms
src/game/board-source/
├── request.ts      # DEFAULT_CLUES unchanged; validate clues.evenOdd
├── shore.ts        # evenOddApply(difficulty); endlessClues() carries evenOdd
└── seed-entry.ts   # the `evenodd` / `noevenodd` token
src/game/
└── settings.ts     # play.evenOdd, default false
src/ui/
├── shell/HomeScreen.tsx        # the switch, gated on evenOddApply
└── gameplay/how-to-play-content.tsx
```

**Structure Decision**: No new modules. Every change lands in the file that
already owns that concern, which is what keeps the mechanic reviewable against its
connectivity twin.

## Design notes

### The inertness trap (the one that could break the game)

The first version of the measurement probe wrote a parity pass that also read
*exact* constraints' parities — an exact count implies a parity, so this looks
free and strictly more powerful. It is neither. Feeding exact constraints into
parity reasoning strengthens the solver for **every board in existence**, which
changes which clues `reduceClues` decides are necessary, which regenerates every
shipped curated board, every written-down seed, and every in-progress save.

So the pass must iterate **only parity constraints**. That makes it structurally
inert on any board with no `E`/`O` clue — not inert by careful gating that a later
edit could undo, but inert because the loop has nothing to iterate. FR-003 gets
its own test asserting the pass reports no progress on a spread of ordinary Deep
boards, so the property is pinned rather than assumed.

This is also why parity subtraction is out of scope beyond its cost: the
subtraction rule is exactly the rule that wants to read exact constraints.

### Determinism: the seed segment and its pinned position

`rngSeedString()` currently composes `${seed}|${size}|${difficulty}|c{0,1}l{0,1}`
then `|lc1` when row annotations are on, then `|s:{shape}` when the shape is not
the default. The function's own comment warns that two features each appending
"their own segment" is safe **only if that order is decided once and pinned**.

Even/odd is a clue toggle, so it belongs in the clue-toggle group — after `|lc1`,
before `|s:`:

```
off (today, forever):   COVE-0001|Medium|Calm|c1l1|#3
row annotations on:     KELP-0007|Large|Deep|c1l1|lc1|#3
even/odd on:            KELP-0007|Large|Deep|c1l1|eo1|#3
both, plus a shore:     KELP-0007|Large|Deep|c1l1|lc1|eo1|s:atoll|#3
```

**That guard does not currently exist.** `generate.ts` says the order is "decided
once and pinned … See `generate.test.ts`", but `generate.test.ts` holds only
validation, size and degeneracy tests, and nothing anywhere in `src/` asserts the
composition — grep for `lc1` finds one production line and no test. The comment
points at a test that was never written, which is exactly the situation that makes
a third optional segment dangerous.

Two things to add, and the comment to correct:

- A direct assertion on the composed string. `rngSeedString` is module-private, so
  either export it for test use or assert through a thin exported helper — the
  point is one test that fails loudly if the order ever changes.
- Rows in `fingerprints.test.ts` covering the new combinations (`eo1` alone,
  `lc1`+`eo1`, and both plus a shape). Its `FROZEN` table currently hardcodes
  `{connectivity, lineTotals}` inside its `fingerprint()` helper, so this needs
  the table widened to carry a clue set and optional shape per row — a small
  refactor, and the one that turns "pinned by a comment" into pinned.

### `AdjacencyClue` as a union, not an optional field

```ts
export type Parity = 'even' | 'odd'

export type AdjacencyClue =
  | { count: number; connectivity?: Connectivity }
  | { parity: Parity }
```

A union rather than `{ count?, parity? }`, deliberately: it makes it a *type
error* for the solver to read the count of a parity clue, which is the whole
point of the mechanic. The compiler then finds every read site — there are only
five in production (`clueText`, `encodeCell`, `setup`, plus the producer and
`core/test-helpers.ts`), which is what makes this change cheap.

`{ parity }` carries no `connectivity`, encoding the spec's decision that this
slice does not combine `E` with `{}`/`--`.

### Serialization: the clue-face slot

`CellTuple` is `[key, 'w'|'r', 0|1, count?, ('c'|'s')?]`, and `decodeCell` uses
`t[3] !== undefined` to mean "this cell has a clue". Rather than add a sixth slot
and leave a `null` hole in position 3, widen slot 3 to carry the clue *face*:

```ts
type CellTuple = [string, 'w' | 'r', 0 | 1, (number | 'e' | 'o')?, ('c' | 's')?]
```

`typeof t[3] === 'number'` discriminates. Every tuple ever written stays valid and
decodes identically, and slot 4 remains exclusive to count clues.

### The solver pass

```
for each parity constraint:
  tally known water and collect unknowns among its cells
  0 unknowns  -> if knownWater % 2 !== parity, contradiction
  1 unknown   -> force it: water iff (parity - knownWater) is odd
  otherwise   -> no deduction
```

The zero-unknown consistency check is not optional. `applyLineConnectivity`
already carries a comment explaining why the equivalent check matters there: a
fully-known set can still *violate* its clue, and saying so is what lets the
uniqueness counter prune a branch that has already gone wrong. Without it the
counter would count assignments the clue forbids and could call a board unique
when it is not.

Correctness gets pinned by a differential test against brute-force enumeration of
all 2⁶ ring arrangements: for every water count and both parities, the pass must
force exactly the cells that every valid arrangement agrees on. Cheap, and it is
the test that actually proves this.

`propagate()` in the uniqueness counter runs the new pass too (FR-007), for the
reason its existing comment already gives about the step budget.

### Why the trivial rule is the whole technique

Measured: restricting the technique to the one-unknown rule yields 97 weakenable
clues against 98 for the full subtraction version, across 284 clues. The
expensive rule buys one clue in 284 and is dropped.

Worth being explicit about what this means for play, because it sounds weaker than
it is. The solver defines what *guess-free* is guaranteed to mean, not what a
player is allowed to notice. A player who spots that an `E` stone shares five of
its six neighbours with a `3` and subtracts will get there faster; the board is
merely also solvable without that insight. That is strictly fine, and it is the
same relationship players already have with the game's other shortcuts.

### Difficulty and the Deep gate

`parity` joins the `Technique` union and `TECHNIQUE_ORDER` (after
`line-connectivity`), enters `allowedTechniquesFor('Deep')`, and `rateDifficulty`
treats it like `connectivity` → Deep. Calm and Tricky must **not** get it, or
reduction would produce boards that need it and then rate them below their tier.

The gate has to sit in front of `BoardParams`, not only in front of the UI —
`evenOddApply(difficulty)` mirroring `edgeHintsApply`, applied inside
`endlessClues`. 016's comment there records exactly why: the toggle feeds the RNG
seed string, so a stale `true` in settings would change which board a Calm seed
produces *in exchange for clues that reduction then strips anyway*. Same trap,
same handling.

### Reduction: a second pass, not new shuffle items

010 added a third item *kind* to reduction's seeded shuffle and had to argue that
this was safe because annotated lines only exist when the toggle is on. That
argument holds but it is subtle, and the shuffle is the highest-consequence RNG
consumer in the codebase.

Parity does not need it. The weakening pass runs **after** the removal loop, over
the clues that survived, in its own seeded order drawn from the same rng:

```
reduceClues():
  ... existing removal loop, untouched ...
  if (params.clues.evenOdd):
     for each surviving given clue cell, in a fresh shuffled order:
       if presentNeighborCount < 2: skip            # FR-006
       weaken count -> parity
       if not techniqueSolves(work, allowed): restore the count
```

The existing item list and its shuffle are then *provably* unchanged for every
board, because the new code is a branch a non-parity board never enters. That is
a much cheaper thing to prove than a reordering argument, and it is why the
measurement was taken against the already-minimal board.

Note the `allowed` set must contain `parity` for any weakening to survive, which
is another reason the Deep gate matters.

### Rendering: `O` is not `0` — and in this font, it very nearly is

> **Settled by looking.** Rendered against the digits in Bricolage Grotesque at
> 700 weight, `O` and `0` are near-indistinguishable at 26px. The marks are now
> `+` (even) and `|` (odd) — one stroke for odd, two crossed for even, which is
> also the mnemonic the How to play page uses. `|` was checked against `1`
> specifically: the font gives `1` a pronounced flag, so they do not collide,
> which contradicted the prediction below. A lone `|` does render lighter than
> its neighbours, so parity marks draw at 800 weight and 1.15× size.

`clueText()` gains two returns. The real work is that **a clue of `0` already
exists** — a stone with no water neighbours renders `0` — so an `O` glyph sits on
the same board as a zero, in the same numeral font, at the same size. Assuming
that reads is exactly the sort of thing to verify by looking rather than by
reasoning.

Handling: give parity glyphs a distinct treatment where the clue numeral is
actually drawn — `board-renderer.ts` hardcodes `palette.deepPool` and
`700 {size*0.9}px DISPLAY_FONT` for every clue face, so the branch (a different
colour token, weight, or size) belongs there. Note this is *not* a `cell-style.ts`
change: that module maps a cell's visual to tile fill and outline, not to the
numeral on top of it, so it never sees the difference between clue forms.

Then check it at the smallest cell size a Large board produces, in both themes. If
letter forms cannot be made unambiguous against a `0`, the fallback is a glyph
pair sharing no shape with a digit. Decide by looking at a real board, not by
reasoning about fonts.

### Label, token, and settings

The board label must name even/odd or it stops being a complete description of the
board (FR-009). One catch: `parseSeedEntry` splits tokens on `/` among other
separators, so `even/odd` would arrive as two tokens and could never round-trip.
The token is therefore the single word `evenodd`, with `even-odd` and `noevenodd`
also accepted — mirroring how `hints` already accepts `no-hints` alongside
`nohints`.

`settings.play` gains `evenOdd: boolean`, default `false`, validated with `bool()`
exactly as `edgeHints` is. `LastPlay` and the Home summary chips follow the
`edgeHints` pattern line for line.

## Risks

| Risk | Handling |
|---|---|
| Parity reasoning leaks into exact constraints and silently regenerates every board | The pass iterates only parity constraints, so it is inert by construction; pinned by a dedicated FR-003 test plus `fingerprints.test.ts` |
| Seed-segment position not pinned, so a board with two toggles differs by code path | Fixed order (`lc1` then `eo1` then shape). The guard `generate.ts` claims to have does not exist — write it, and widen the `FROZEN` table to cover multi-toggle boards |
| `O` misread as `0` on the board | Distinct visual treatment; verified by eye at Large in both themes, not assumed |
| Uniqueness counter blind to parity reports a board unique when it is not | `propagate()` runs the parity pass; the zero-unknown consistency check is mandatory, not an optimisation |
| A stale `evenOdd` preference changes a Calm or Tricky board | `evenOddApply` gate inside `endlessClues`, mirroring `edgeHintsApply`; test at all three tiers with the flag forced on |
| ~⅓ of clues showing E/O reads as mush | Named as a tuning question in the spec, not guessed at now; look at a real Large Deep board before deciding whether to cap density |
| Weakening pass doubles solve attempts per clue | Measured at 0–20 ms per board against a 2000 ms budget; `perf.test.ts` covers the regression |

## Sequencing

Engine first, in this order, each step committable and green on its own:

1. **Freeze before touching anything.** Confirm `fingerprints.test.ts` is green,
   then widen its table to carry a clue set / shape per row and add the missing
   seed-string order assertion — *before* any behaviour changes, so the guard is
   in place while the risky edits happen. This is what 010 did in its own first
   commit ("test(core): freeze board fingerprints before touching the
   generator"), and it is the reason this feature can move fast afterwards.
2. **Types + clue computation** — `Parity`, the `AdjacencyClue` union,
   `parityInformative`, and the five read sites the compiler flags.
3. **The solver pass** — `Constraint` union, `parityPass`, `propagate`,
   `TECHNIQUE_ORDER`, `allowedTechniquesFor`, `rateDifficulty`, plus the
   differential test and the inertness test.
4. **Generation** — the seed segment and the weakening pass in `reduceClues`. At
   the end of this step a Deep board with the toggle on should carry E/O clues
   and pass the oracle; re-run the measurement to confirm the shipped numbers
   match the probe's.
5. **Serialization** — the widened clue-face slot and its round-trip test.
6. **Render + teaching** — `clueText`, the visual treatment, `CLUE_FORMS`.
7. **Reach** — `evenOddApply`, `endlessClues`, request validation, the token,
   settings, and the Home switch.

Independent of any other feature. Nothing in the curated pack changes.
