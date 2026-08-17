# Implementation Plan: Framed Parity (`{+}` / `-|-`, and marks on edges)

**Branch**: `019-framed-parity` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

> **Note on artifacts.** A single `plan.md`, matching [010](../010-line-annotations/plan.md)
> and [018](../018-even-odd-clues/plan.md). The research that would fill
> `research.md` was done as measurement before the spec; the data model is the
> type refactor described below; `core/` has no external contract.

## Summary

018 bolted parity on as a second, parallel clue shape: `ParityClue` beside
`CountClue`, `ParityConstraint` beside `ExactConstraint`, with the framing fields
living only on the exact side. That was right for one narrow slice and it is the
wrong shape for this one.

The spec's insight — a clue is a **face** (quantity) and a **framing**
(arrangement), and the two are orthogonal — is also the refactor that makes the
code small. Hoist the framing into the shared base, keep the face as the only
discriminated part, and most of this feature stops being new code and becomes
*deleting the guards that currently prevent the combination*:

```
applyConnectivity:      if (c.kind !== 'exact') return false   ← delete
applyLineConnectivity:  if (c.kind !== 'exact') return false   ← delete
```

…replaced by a one-line predicate asking whether a candidate water count
satisfies this constraint's face. Both passes already enumerate arrangements and
count water; neither cares *why* a count is admissible.

The genuinely new work is four things: `LineClue` becoming a face-carrying union
like `AdjacencyClue` already is, informativeness recomputed against a set of
counts rather than one, reduction's three-rung ladder, and presenting six forms
as a grid rather than a list.

## Technical Context

**Language/Version**: TypeScript 5, strict. `src/core/` stays DOM-free
(`core/purity.test.ts`).

**Primary Dependencies**: None new.

**Storage**: No schema change. `ClueToggles.evenOdd` already rides in
`BoardParams`; this feature adds no field, because it extends the same toggle.

**Testing**: Vitest, Playwright. The load-bearing tests are the two differential
sweeps (ring enumeration and the row DP, each against brute force over the new
admissibility rule) plus the fingerprint table.

**Target Platform**: Web + Tauri desktop. Unchanged.

**Performance Goals**: No regression in `core/perf.test.ts` (2000 ms for
Large/Deep). The row DP's state space grows — see "Generalising the DP" — from
`(total+1)×3×2` to `(cells+1)×3×2`, which for a 13-cell row is 84 states. The
reduction ladder adds a third solve attempt per clue plus a new pass over line
clues; 018's ladder measured 0–50 ms per board against the budget.

**Constraints**: Principle XI. Boards still uniquely solvable and guess-free;
every seed **that does not use this toggle** still produces its existing board.

**Scale/Scope**: ~9 engine files, 2 renderer files, 3 UI files. No new modules,
no new screens, no persistence migration, no new seed segment.

## Constitution Check

- **III. Conventions** — the whole plan is "make the new thing the same shape as
  the old thing": `LineClue` becomes a face union exactly as `AdjacencyClue`
  already is, framing moves to the shared base so both faces carry it identically,
  and the render forms reuse the existing braces and dashes. ✅
- **IV. Scope** — parity subtraction, other clue sites, curated content and
  density caps all stay out (spec non-goals). The `ClueFace` refactor is in scope
  because the feature cannot be built cleanly without it, not as tidying. ✅
- **V. Verify** — golden path is a Deep board showing all four framed forms and
  completing; edge case is the same board with the toggle off, byte-identical. ✅
- **VIII. Testing** — the two generalised passes are branching logic over a small
  state space, which is exactly where differential tests against brute force
  carry real signal. 010 and 018 both did this and both caught real bugs. ✅
- **XI. Determinism & Solvability** — the binding constraint, with one wrinkle
  this feature has and 018 did not: it **intentionally moves boards**. See
  "Determinism: the one thing that legitimately changes". ✅

No violations.

## Project Structure

```text
src/core/
├── board.ts        # ClueFace; AdjacencyClue = ClueFace & framing;
│                   # LineClue becomes a face union; hasParityFace()
├── clues.ts        # framingInforms() over a face; parity line helpers
├── techniques.ts   # framing hoisted to ConstraintBase; admits() predicate;
│                   # applyConnectivity + applyLineConnectivity generalised
├── solver.ts       # technique attribution for a framed parity deduction
├── generate.ts     # line clues may take a parity face
└── reduce.ts       # the three-rung ladder, for tiles AND lines
src/render/
├── board-renderer.ts   # clueText + lineText share one face×framing formatter
└── line-labels.ts      # width class for a 1-char mark vs `{+}`
src/ui/gameplay/
├── how-to-play-content.tsx  # the grid replaces the flat list
└── HowToPlay.tsx            # + tutorial/HowToPlayScreen.tsx — render the grid
```

**Structure Decision**: No new modules. `serialize.ts` needs the `LineTuple`
widening but no new concepts — it already discriminates a cell's face by
`typeof`.

## Design notes

### The refactor that is the feature

Today the framing fields sit on `ExactConstraint` only, which is what forces the
two `kind !== 'exact'` guards. Move them up:

```ts
interface ConstraintBase {
  cells: string[]
  source: 'adjacency' | 'line'
  ring?: (string | null)[]        // was on ExactConstraint
  connectivity?: Connectivity     // was on ExactConstraint
  adjacent?: boolean[]            // was on ExactConstraint
}
interface ExactConstraint  extends ConstraintBase { kind: 'exact';  water: number }
interface ParityConstraint extends ConstraintBase { kind: 'parity'; parity: 0 | 1 }
```

and give the quantity question one name:

```ts
/** Does a candidate water count satisfy this constraint's FACE? */
function admits(c: Constraint, water: number): boolean {
  return c.kind === 'exact' ? water === c.water : water % 2 === c.parity
}
```

`applyConnectivity` becomes `if (!admits(c, waterCount)) continue` in place of
`if (waterCount !== c.water) continue`, and loses its guard. That single
substitution *is* FR-003: an arrangement survives only if it satisfies the face
**and** the run count, because the loop already tests the run count separately.

Do the same on the type side:

```ts
// The `?: never` arms are load-bearing — see below.
type ClueFace = { count: number; parity?: never } | { parity: Parity; count?: never }
type AdjacencyClue = ClueFace & { connectivity?: Connectivity }
type LineClue = ClueFace & { axis: Axis; index: number; from: 'start' | 'end'
                             connectivity?: Connectivity }
```

TypeScript distributes the intersection over the union, so both faces get the
framing for free, and `isParityClue` generalises to `hasParityFace` — usable on
cells and lines alike, because they are now the same idea.

**Checked, because the obvious form is wrong.** The natural
`{ count: number } | { parity: Parity }` does **not** stop a clue carrying both:
excess-property checking against a union permits any property present in *any*
member, so `{ count: 4, parity: 'even' }` type-checks. Verified with a
`@ts-expect-error` that came back unused. That matters because `hasParityFace`
would read such an object as a parity clue and silently ignore its count. The
`?: never` arms make it a genuine compile error; verified the same way, and
narrowing still works through the intersection.

Note this is a latent hole in **018 as shipped** too — `CountClue | ParityClue`
admits an object with both. Nothing constructs one today, so it is not a live
bug; the `?: never` form closes it as a side effect of this refactor rather than
needing its own fix.

### Generalising the DP

`applyLineConnectivity` bounds its state space by the target total:
`stateCount = (c.water + 1) * RUN_STATES * 2`, and `step()` prunes with
`if (water + 1 > c.water) return -1`. A parity face admits every count of the
right parity, so the bound becomes the row length:

```ts
const maxWater = c.kind === 'exact' ? c.water : cells.length
```

with `step()` pruning against `maxWater` and the backward seeding at `viable[n]`
testing `admits(c, water)` instead of `water === c.water`. For a 13-cell row
that is 84 states rather than 8192 arrangements — still far cheaper than the
brute force it replaces.

**The trap to watch**: the existing code uses `c.water` in *three* roles — the
state bound, the pruning limit, and the acceptance test. They are the same number
today and they are not the same concept. Conflating them is how a parity row
silently accepts a wrong total.

### Informativeness over a set of counts (FR-004)

Both existing rules assume a single known total, and neither survives the move:

- `connectivityInformative(waterCount, presentNeighbors)` is a count-window
  heuristic (`2 ≤ w ≤ pn − 2`). Over a parity face the achievable counts are a
  *set*, so the window is meaningless. Replace with the exact question, which is
  cheap on a 6-slot ring: enumerate the ≤2⁶ arrangements the face admits and ask
  whether both run-classes appear. **Leave the count-face path on the existing
  heuristic** — changing it would move every board in existence, which is the
  same reason 010 left it alone.
- `lineConnectivityInforms(length, total, adjacent)` already asks the exact
  question by enumeration, pruning on `placed > total`. Generalise its target to
  a face and the pruning to `maxWater`.

### Reduction: a three-rung ladder, now on lines too

018's pass tries one weakening. This tries two, weakest first (FR-007):

```
for each surviving clue (tile or line), in a seeded order:
   skip unless the face may be weakened at all (018's canShowParity: ≥2
     neighbours, count > 0 — and the zero rule now applies to rows as well)
   skip if the clue's VALUE is doing no work (018's decorative check)
   try  bare parity        → keep if the board still solves
   else try framed parity  → keep if the board still solves, attaching the
                             framing only where it informs (FR-004)
   else restore the count
```

Weakest-first is what keeps numbers on the board. Framed parity survives on ~58%
of ring clues, so preferring it — or trying it first — would produce boards where
the count is the rare form. Measured density is the risk here, not scarcity.

Two ordering subtleties:

- The existing `annotation` item kind strips `{}`/`--` from a line total during
  the removal loop. That runs **before** the weakening pass, so a line arrives at
  the ladder either framed or bare, and the ladder may re-frame a bare one. That
  is coherent but it means "minimal" is now a lattice rather than a set — worth
  saying out loud in the spec's terms rather than pretending otherwise.
- Line clues have no reveal side-effect (a line clue carries no cell state), so
  the delete-control on rows is clean, unlike 018's cells. The measurement relied
  on this; the implementation gets it for free.

### Determinism: the one thing that legitimately changes

This feature **moves boards on purpose** — every `evenOdd` board changes, because
reduction now has more forms to reach for. That is acceptable for exactly one
reason: 018 has never been released, so no player holds one of those seeds.

Consequences to handle deliberately:

- The 5 `evenOdd` rows in `fingerprints.test.ts` must be **recaptured**, and that
  recapture is the one place in this feature where updating the table is the
  correct fix rather than a red flag. Say so in the commit.
- The other 44 rows must stay green untouched. They are what proves the
  `ClueFace` refactor and the generalised passes did not leak into ordinary
  boards — a refactor of this size is exactly the sort that could.
- **No new seed segment.** One toggle, so `rngSeedString` is unchanged, and the
  order assertion added in 018 keeps guarding it.
- If 018 ships before this lands, all of the above stops being true and the
  feature needs its own toggle and segment. That is the spec's Sequencing risk.

### Rendering: one formatter, two sites

`clueText(clue)` and `lineText(label)` are already the same function twice over —
identical braces, identical dashes, different field names. With `ClueFace` they
collapse into one:

```ts
function faceText(face: ClueFace): string   // '4' | '+' | '|'
function framed(text: string, c?: Connectivity): string   // '{4}' | '-+-' | '+'
```

Two things to settle by looking, not reasoning — 018's `E`/`O` prediction was
overturned by a render, so this is not a formality:

- **A bare `|` in the margin.** Edge labels have no tile behind them and sit
  among arrows and struck-off numbers. 018's fix for a lone `|` was extra weight,
  which worked *on a hex*. It may not be enough here.
- **Label width.** `MIN_GAP` is tuned for a bare number and scaled by
  `ANNOTATED_GAP_SCALE = 1.45` for `-10-`. `{+}` is three glyphs so it inherits
  that correctly, but a bare `+` is *narrower* than a two-digit number — so the
  existing scale is conservative rather than wrong, and label placement on a
  board mixing `7` and `+` and `{+}` needs a look at Large.

### Technique attribution

A framed parity deduction fires inside `applyConnectivity` /
`applyLineConnectivity`, which record `'connectivity'` / `'line-connectivity'`.
Add `'parity'` alongside when the constraint's face is a parity, so
`techniquesUsed` stays honest about what the board needed. All three are already
Deep-tier, so `rateDifficulty` needs no change — but `rating.test.ts`'s rank map
does, and it is typed `Record<Technique, number>` now (018), so the compiler will
say so.

## Risks

| Risk | Handling |
|---|---|
| The `ClueFace` refactor leaks into ordinary boards | The 44 non-`evenOdd` fingerprint rows must stay green with no recapture; that is the acceptance test for the refactor |
| A clue silently carrying two faces, its count ignored | The plain union does not prevent this — checked. Use the `?: never` arms, and keep a `@ts-expect-error` assertion in the test suite so the protection cannot be refactored away unnoticed |
| `c.water`'s three conflated roles in the DP | Named explicitly above; differential test against brute force over every total, both parities, both run classes |
| Density — six forms, framed parity surviving ~58% | FR-007's weakest-first ladder; then look at a real Large board, as 018 did, before adding any cap |
| A bare `\|` unreadable in the margin | Settle by rendering, not reasoning. Fallback is to frame every edge mark, or to keep bare marks on tiles only |
| Six forms overwhelm players | Taught as face × framing — two rules, not six glyphs. If the grid does not carry it, that is a signal to cut `-+-`/`-\|-` rather than to write more copy |
| Recapturing `evenOdd` fingerprints becomes a habit | It is correct exactly once, because 018 is unreleased. Commit message must say why, or the next person reads it as precedent |
| Built on an unplaytested mechanic | Not a code risk and cannot be handled here. See the spec's Sequencing risk |

## Sequencing

Each step committable and green on its own:

1. **Baseline.** Confirm 018's suite green (988 unit, 45 e2e) and record it.
2. **`ClueFace` refactor, no behaviour change.** Types (with the `?: never` arms
   and a `@ts-expect-error` test pinning them) plus the framing hoist in
   `Constraint`; `admits()` added but the two guards still in place. All 49
   fingerprint rows must be green **including the `evenOdd` ones** — at this step
   nothing has moved yet, which is what makes the refactor reviewable in
   isolation.
3. **Generalise the two passes.** Delete the guards, wire `admits()`, widen the
   DP bound. Differential tests for both. Boards still do not change: nothing yet
   *produces* a framed parity clue.
4. **`LineClue` face union + generation.** Line clues can carry a parity face.
5. **Informativeness over a face**, ring and row.
6. **The reduction ladder**, tiles then lines. `evenOdd` boards move here —
   recapture those 5 fingerprint rows, and only those.
7. **Serialization** — `LineTuple` widening plus round-trip tests.
8. **Render** — the shared formatter, then the two look-at-it questions.
9. **Teaching** — the grid, both surfaces, and the e2e that reads it.
10. **Verify** — full suite, e2e, build, curated + shapes revalidation, diff
    readback.

Independent of any other feature. Nothing in the curated pack changes.
