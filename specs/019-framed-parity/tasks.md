---
description: "Task list for the Framed Parity feature"
---

# Tasks: Framed Parity — marks on edges, and `{}` / `--` on marks

**Input**: Design documents from `specs/019-framed-parity/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md). Builds directly on
**018 even-odd-clues** (the `parity` technique, `canShowParity`'s zero rule, the
`evenOdd` toggle and its `|eo1` seed segment) and **010 line-annotations** (the
`{}`/`--` vocabulary, the `annotation` removal item, the row DP). Nothing in the
curated pack changes; no new seed segment; no persistence migration.

**Tests**: INCLUDED. Constitution VIII requires them — the generic template's
"tests optional" default does **not** apply. Four tests are load-bearing rather
than supporting: the two differential sweeps (T010, T011), the `?: never` pin
(T005), and the fingerprint table throughout.

**Organization**: Phase 1 puts the guards in place, Phase 2 is the shared engine
spine, then one phase per user story in priority order.

> **Note on phase shape.** Phase 2 is large, for the same reason 018's was and one
> more besides. The `ClueFace` refactor breaks compilation at every site that
> reads a clue's value, and Principle IX requires every commit to build and pass —
> so those sites land together rather than as per-story tasks that could never be
> committed independently. What makes it reviewable is the acceptance test stated
> at its checkpoint: **all 49 fingerprint rows green, including the 5 `evenOdd`
> ones**. At the end of Phase 2 nothing has moved yet, which is exactly what
> proves a refactor of this size did not leak.

> **Note on the two fingerprint recaptures.** This feature moves `evenOdd` boards
> on purpose, and it does so twice — once when lines start carrying bare parity
> (T020) and once when the framed rung lands (T027). The plan flagged that
> recapturing "becomes a habit" as a risk, so both recaptures are their own task,
> both must touch **only** the 5 `evenOdd` rows, and T027 also writes the reason
> into the table itself (T028) so the next person reads a record rather than a
> precedent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md (only on user-story-phase tasks)
- Paths are exact. Engine work lands in `src/core/`, rendering in `src/render/`,
  teaching in `src/ui/gameplay/`

---

## Phase 1: Setup — guards and a before-picture

**Purpose**: This feature deliberately changes boards, which means the fingerprint
table cannot simply be trusted to stay green — it has to be *partitioned* into the
rows that must not move and the rows that will. Do that before touching anything,
or the first red run is ambiguous.

- [X] T001 Record the baseline: run `npm test`, `npm run typecheck`, `npm run build` and `npm run validate:curated`; note the passing counts in the commit message. Confirm `src/core/fingerprints.test.ts` is green first.
- [X] T002 Partition the `FROZEN` table in `src/core/fingerprints.test.ts`: mark the 5 `evenOdd` rows with a comment naming them as the rows this feature is *expected* to move, and the other 44 as the rows that prove the refactor did not leak. No hash changes — this is a comment-only edit that makes every later red run readable at a glance.
- [X] T003 [P] Write a throwaway probe under the scratchpad that reports, for served Deep `evenOdd` boards across 5 seeds × 3 sizes, the count of each clue form (plain number, `{n}`, `-n-`, `+`, `|`) on tiles and on edge totals. Record the numbers in the commit message as the before-picture for SC-005. This is measurement, not a shipped test.

**Checkpoint**: guards partitioned, before-picture recorded, nothing behaved differently. Commit here.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make a clue's *face* (quantity) and *framing* (arrangement)
orthogonal, in the types and in the solver, and generalise the two enumeration
passes to reason from a face rather than from a number. **No user story can begin
until this is complete, and no board may move within it.**

- [X] T004 In `src/core/board.ts`, introduce `ClueFace` as `{ count: number; parity?: never } | { parity: Parity; count?: never }` and redefine `AdjacencyClue` as `ClueFace & { connectivity?: Connectivity }`. The `?: never` arms are load-bearing: the natural `{count} | {parity}` union does **not** prevent a clue carrying both, because excess-property checking against a union permits any property present in any member. Replace `isParityClue` with `hasParityFace` (same predicate, name now honest for lines too) and keep `CountClue`/`ParityClue` only if something still needs them by name.
- [X] T005 Add `src/core/clue-face.test.ts` pinning the type contract with `@ts-expect-error` on `{ count: 4, parity: 'even' }`, plus positive assertions that narrowing still works through the intersection (a `ClueFace & {connectivity}` narrows to the count arm and to the parity arm). Verify the `@ts-expect-error` is *used* — an unused one is a silently passing test, which is how the wrong union shape got as far as the 019 plan.
- [X] T006 In `src/core/techniques.ts`, hoist `ring`, `connectivity` and `adjacent` from `ExactConstraint` up to `ConstraintBase`, so both faces carry framing identically. Add `admits(c, water)` — `c.kind === 'exact' ? water === c.water : water % 2 === c.parity` — as the single place the quantity question is asked.
- [X] T007 Repair the compile fallout from T004 across every site that reads a clue's value: `src/core/serialize.ts`, `src/core/reduce.ts`, `src/core/solver.ts`, `src/render/board-renderer.ts`, and the test files the compiler names. Mechanical rename only — no behaviour change, and `npm run typecheck` clean is the definition of done.
- [X] T008 Generalise `applyConnectivity` in `src/core/techniques.ts`: delete the `if (c.kind !== 'exact') return false` guard and replace `if (waterCount !== c.water) continue` with `if (!admits(c, waterCount)) continue`. Widen `connectivityPass`'s filter from `c.kind === 'exact' && c.connectivity` to just `c.connectivity`. That substitution *is* FR-003 — the loop already tests the run count separately, so an arrangement now survives only if it satisfies the face **and** the framing.
- [X] T009 Generalise `applyLineConnectivity` in `src/core/techniques.ts`. `c.water` currently plays three distinct roles that happen to be the same number — the state-space bound, `step()`'s pruning limit, and the acceptance test at `viable[n]`. Separate them: bound and prune against `maxWater = c.kind === 'exact' ? c.water : cells.length`, and accept via `admits(c, water)`. Delete the `kind !== 'exact'` guard and widen `lineConnectivityPass`'s filter. Conflating the three is how a parity row would silently accept a wrong total.
- [X] T010 Add a differential test in `src/core/framed-parity.test.ts`: for every partial ring state (3^6 assignments) × both parities × both framings, compare `applyConnectivity`'s forced cells against brute-force enumeration of all arrangements satisfying the face and the framing. Control: the same sweep with the framing dropped must force strictly fewer cells, proving both halves are being used.
- [X] T011 Add the row counterpart in the same file: for rows of length 3–8, every water pattern, both parities, both framings, and a hole pattern to exercise `adjacent`, compare the DP's forced cells against brute-force enumeration. This is the test that catches a mis-separated `maxWater`.
- [X] T012 In `src/core/techniques.ts`, record `'parity'` alongside `'connectivity'` / `'line-connectivity'` when the constraint that fired carries a parity face, so `techniquesUsed` stays honest about what a board needed. Update `rating.test.ts`'s `Record<Technique, number>` rank map if the compiler asks; `rateDifficulty` needs no change since all three are already Deep-tier.

**Checkpoint**: **all 49 fingerprint rows green with no recapture, including the 5 `evenOdd` rows.** Nothing yet *produces* a parity face on a line or a framing on a mark, so no board may have moved. This is the acceptance test for the whole refactor — commit here.

---

## Phase 3: User Story 1 - A parity mark on an edge total (Priority: P1) 🎯 MVP

**Goal**: A row's total can withhold its number and show `+` / `|` instead. Measured at 40.1% of edge totals with a 0% delete-control, so every one of them carries real information.

**Independent Test**: Load a Deep `evenOdd` board and confirm at least one edge total renders as a parity mark, that the board still passes the unique-and-guess-free oracle, and that the same seed with the toggle off is unchanged.

- [X] T013 [US1] In `src/core/board.ts`, redefine `LineClue` as `ClueFace & { axis: Axis; index: number; from: 'start' | 'end'; connectivity?: Connectivity }`, renaming `total` to `count` so both clue sites share one face vocabulary. The rename is invisible to `serializeBoard` — `LineTuple` is positional — so the fingerprint table is the proof it changed nothing.
- [X] T014 [US1] In `src/core/techniques.ts`, teach `setup()` to build a `ParityConstraint` for a line clue carrying a parity face, mirroring what it already does for an adjacency clue. Until reduction emits one this path is unreachable, which is deliberate: it lands and is tested before anything produces it.
- [X] T015 [US1] Generalise `lineConnectivityInforms` in `src/core/clues.ts` to take a face rather than a single total, pruning against `maxWater` as in T009. It already asks the exact question by enumeration, so this is a target substitution, not a new algorithm. Add unit tests for a parity target, including the case where a row admits both framings at one count but only one across the whole parity class.
- [X] T016 [US1] Extend reduction's weakening pass in `src/core/reduce.ts` to line clues, rung 1 only (bare parity). Two things carry over from 018 and one does not: the zero rule now applies to rows (`canShowParity`'s reasoning is identical — a row of no water must not read `+`), the Deep-only `allowed.has('parity')` gate still guards it, and the decorative check is **unnecessary for lines** because a line clue has no reveal side-effect, so deleting it is a clean control. Say that in a comment; it is why the 40.1% measurement was trustworthy.
- [X] T017 [US1] Widen `LineTuple` in `src/core/serialize.ts` to `[Axis, number | 'e' | 'o', ...]`-shaped — the same `typeof` discrimination `CellTuple` already uses for its face slot — and round-trip a board carrying a parity-faced line.
- [X] T018 [US1] In `src/render/board-renderer.ts`, teach `lineText` the parity faces. Keep `src/render/line-labels.ts`'s gap rule as it is: a bare mark is one glyph, exactly like a digit, so `MIN_GAP` is already right and `ANNOTATED_GAP_SCALE` still applies to anything framed. Note in a comment that a text-length-derived gap would be more precise and would move every existing label, which is why it is not being done.
- [X] T019 [US1] In `src/ui/gameplay/GameplayScreen.tsx`, extend the dev hook's `lineLabels` entries with the text the label actually prints, alongside the existing `total` (which becomes null for a parity face). Existing e2e reading `connectivity` and `total` must keep working — `e2e/endless-shores.spec.ts` and `e2e/row-guides.spec.ts` both do.
- [X] T020 [US1] Recapture **only** the 5 `evenOdd` fingerprint rows in `src/core/fingerprints.test.ts`. The other 44 must still be green untouched. Commit message must state why this is correct rather than alarming: 018 has never been released, so no player holds one of these seeds.
- [X] T021 [US1] Add `e2e/framed-parity.spec.ts` with the US1 case: a Deep `evenOdd` board shows at least one parity mark on an edge total, read from the rendered label text rather than from params, and the board's own `evenodd` label still round-trips through seed entry.

**Checkpoint**: US1 complete and playable on its own — edge totals can withhold their number. Commit here.

---

## Phase 4: User Story 2 - A framed parity mark (Priority: P1)

**Goal**: `{+}`, `-+-`, `{|}`, `-|-` — on a tile and on an edge total alike. Measured at 66.9% of ring clues against an 8.8% control, so ~58% is genuine; this is where parity earns its place on a long row.

**Independent Test**: Load boards across a sample and confirm all four framed forms appear, read from what the renderer produced, and that every board passes the oracle.

- [X] T022 [US2] Add a face-aware ring informativeness rule in `src/core/clues.ts` (FR-004). `connectivityInformative`'s `2 ≤ w ≤ pn − 2` window is meaningless over a parity face, where the achievable counts are a *set*. Ask the exact question instead — enumerate the ≤2^6 ring arrangements the face admits, and require both run-classes to appear. **Leave the count-face path on the existing heuristic**: changing it would move every board in existence, which is the same reason 010 left it alone.
- [X] T023 [US2] Add rung 2 to the ladder in `src/core/reduce.ts`, for tiles and lines: after bare parity fails, try framed parity, attaching the framing only where T022/T015 say it informs; restore the exact count if neither survives. Order is load-bearing (FR-007) — weakest first. Framed parity survives on ~58% of ring clues, so trying it first would make the plain number the rare form. Comment the ordering and why.
- [X] T024 [US2] Collapse `clueText` and `lineText` in `src/render/board-renderer.ts` into one shared `faceText(face)` + `framed(text, connectivity)` pair, as the plan describes. They are already the same function twice over — identical braces, identical dashes, different field names — and with `ClueFace` they become one. Extend `src/render/board-renderer.test.ts` to cover all six forms at both sites.
- [X] T025 [US2] Extend `src/core/serialize.ts` so a parity face and a framing can coexist in both `CellTuple` and `LineTuple`. `CellTuple`'s slot 4 is currently documented as exclusive to count clues — that comment is now wrong and must change with the code.
- [X] T026 [US2] Round-trip test in `src/core/serialize.test.ts` for all six forms at both clue sites, asserting deep equality of cells and lines rather than string equality of the whole payload (`serializeBoard` echoes `params`, so an absent toggle and an explicit `false` differ as strings while describing the same board — the trap 018 hit).
- [X] T027 [US2] Recapture the 5 `evenOdd` fingerprint rows for the second and final time. Same rule: the other 44 untouched.
- [X] T028 [US2] Write the reason into `src/core/fingerprints.test.ts` beside the `evenOdd` rows — that they were recaptured twice during 019, and that this was legitimate exactly once because 018 was unreleased. Without this the table reads as precedent for recapturing whenever it goes red, which is the opposite of what it is for.
- [X] T029 [US2] Add an SC-005 test asserting numbers remain the most common clue face on a Deep board, tiles and edges counted together, and re-run T003's probe to compare the form mix against the before-picture. If parity outnumbers number, FR-007's ordering is wrong and that is a code bug, not a tuning question.
- [X] T030 [US2] Extend `e2e/framed-parity.spec.ts`: all four framed forms reachable across a sample, read from rendered text; and a regression that a board below Deep carries no parity form even with the toggle forced on (SC-004).

**Checkpoint**: US1 and US2 both work. The full six-form vocabulary is live. Commit here.

---

## Phase 5: User Story 3 - Learn the grid, not six new glyphs (Priority: P2)

**Goal**: A player meeting `-|-` for the first time derives it from two rules they already have.

**Independent Test**: Read the How to play surfaces and confirm the composition rule is stated once and covers every form.

- [X] T031 [US3] Restructure `src/ui/gameplay/how-to-play-content.tsx`: replace the flat `CLUE_FORMS` list with the face × framing grid from the spec, and state the composition rule once. Fold today's separate `EDGE_RUNS` and `EVEN_ODD` paragraphs into it rather than adding a third — six forms as six bullet points is the wall this task exists to avoid.
- [X] T032 [US3] Render the grid on both surfaces — the rail beside the board and the How to play screen — via whichever components consume `CLUE_FORMS` today. Update the existing content tests that assert on the old flat list.
- [X] T033 [P] [US3] Fix the pre-existing 016 gap named during 018 review: the How-to-play screen's Play button ignores shore, edge hints and even/odd (`src/ui/shell/AppShell.tsx`, the `Tutorial` case). One line, and it is squarely in scope now that this feature adds a form a player will first meet on that page.

**Checkpoint**: the vocabulary is teachable. Commit here.

---

## Phase 6: User Story 4 - Share the exact board (Priority: P3)

**Goal**: The label still names every input that distinguishes the board.

- [X] T034 [US4] Confirm — with a test, not by reading — that no board-label or seed-entry change is needed, because this feature adds no toggle and no seed segment. Assert that `evenodd` in a label still produces the framed-parity board and that `rngSeedString` is byte-identical to 018's for the same params, so 018's order assertion still guards it.

**Checkpoint**: sharing intact.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T035 Run `src/core/perf.test.ts` and confirm Large/Deep generation stays inside the 2000 ms budget. The ladder now attempts up to three forms per clue plus a new pass over line clues; if it regresses, the cheap fix is to skip rung 2 where rung 1 already succeeded, which the ordering already does.
- [X] T036 **Look at a real board** — the two questions the plan says must be settled by rendering rather than reasoning, since 018's `E`/`O` prediction was overturned by exactly this step. (a) Does a bare `|` read as a clue in the margin, with no tile behind it and among arrows and struck-off numbers? (b) Do labels still place cleanly at Large on a board mixing `7`, `+`, `{+}` and `-10-`? Fallbacks if not: frame every edge mark, or keep bare marks on tiles only.
- [X] T037 Run `npm run validate:curated` and the silhouette revalidation; confirm unchanged. Nothing in the curated pack uses `evenOdd`, so any movement here is a leak from the refactor and must be chased, not accepted.
- [X] T038 Full verification: `npm test`, `npm run typecheck`, `npm run build`, `npx playwright test`. Then break two guards on purpose and confirm they bite — invert `admits`'s parity arm (the differential sweeps must fail) and swap the ladder's two rungs (the SC-005 density test must fail).
- [X] T039 [P] Update `CHANGELOG.md` in the repo's existing voice.
- [X] T040 Read back the whole diff for scope creep and convention drift before merging.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: no dependencies.
- **Phase 2 (Foundational)**: depends on Phase 1. **Blocks every user story** — the face/framing orthogonality is what US1 and US2 are both built from.
- **Phase 3 (US1)**: depends on Phase 2.
- **Phase 4 (US2)**: depends on Phase 2, and on T016 in Phase 3 — rung 2 extends the same ladder rung 1 creates.
- **Phase 5 (US3)**: depends on US1 + US2 existing, since it documents their forms.
- **Phase 6 (US4)**: depends on US1 + US2.
- **Phase 7 (Polish)**: depends on all of the above.

### Critical ordering within phases

- T004 → T005 → T007: the types, their pin, then the fallout. T007 is what makes the tree compile again, so it cannot be deferred past a commit.
- T008/T009 → T010/T011: generalise, then prove differentially. Writing the tests first is also fine and arguably better; what is not fine is landing the generalisation without them.
- T015/T022 (informativeness) → T023 (rung 2), because the ladder must not attach a framing that says nothing.
- T016 → T020 and T023 → T027: each board-moving task is immediately followed by its fingerprint recapture, so no commit is left red.

### Parallel Opportunities

- T003 is independent of T002.
- T010 and T011 are one file but two independent sweeps.
- T033 (the Tutorial Play fix) touches only `AppShell.tsx` and is independent of everything else.
- T039 (CHANGELOG) is independent of the verification tasks.

---

## Implementation Strategy

### MVP scope

**Phase 1 + Phase 2 + Phase 3 (US1)** — parity marks on edge totals. That alone is
the half of the ask with the measurement behind it, it is independently playable,
and it is a complete increment: the six-form vocabulary is not needed for a board
to withhold a row's total.

### Incremental delivery

1. Phases 1–2 → the refactor, with every board provably unmoved.
2. Phase 3 → edge totals can show `+` / `|`. **Playable. Stop and look at a board here** — this is where the "does a bare `|` read in the margin" question first has an answer, and a bad answer changes Phase 4's scope.
3. Phase 4 → the four framed forms. Playable.
4. Phases 5–6 → teachable and shareable.
5. Phase 7 → verified.

### The two places this can go quietly wrong

- **A board moving in Phase 2.** The 44 non-`evenOdd` fingerprint rows are the only thing standing between a large refactor and silently regenerating every board in existence. If they go red, the fix is never to recapture them.
- **Density.** Framed parity survives on ~58% of ring clues, so the failure mode is not scarcity but a board reading as mush. T029 is the assertion; T036 is the judgement.

## Notes

- Commit after each task or logical group; every commit must build and pass (Principle IX).
- The feature branch `019-framed-parity` already exists, with spec and plan committed.
- Non-goals stay out: parity subtraction, other clue sites, curated content using the new forms, a fourth tier, density caps.
