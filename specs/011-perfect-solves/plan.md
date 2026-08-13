# Implementation Plan: Perfect Solves

**Branch**: `011-perfect-solves` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

## Summary

`PlaySession` already keeps `errorsMade` — a running tally of wrong marks placed, counted at placement so undo/redo replays never re-count it. Completion currently throws that number away for Endless boards and keeps it only per curated entry. This feature carries it one step further: `boardsPerfect` on the lifetime stats record, incremented when a board completes with `errorsMade === 0`.

The only part with real design content is the one-time backfill (FR-007). Record migrations are pure and per-namespace, so the `stats` migration cannot read `curatedProgress`. The backfill therefore runs at boot, guarded by a persisted flag, not by the schema version.

## Technical Context

**Language/Version**: TypeScript 5, strict.

**Primary Dependencies**: None new.

**Storage**: `StatsRecord` v1 → v2: adds `boardsPerfect: number` and `perfectSeeded: boolean`. Read-path migration via the existing `MIGRATIONS` table — the first real `vN → vN+1` step in the codebase (every namespace has only had `legacy(0) → 1` so far), so it is also the step that proves that machinery works.

**Testing**: Vitest. Migration round-trips, backfill idempotency, and the completion branch are all pure and directly testable. One Playwright pass for the complete-panel line.

**Target Platform**: Web + Tauri desktop. Unchanged.

**Performance Goals**: Backfill is one extra record read on the first boot after upgrade. Negligible.

**Constraints**: Must not change how any board plays (FR-010). Must not double-count across restarts (FR-007).

**Scale/Scope**: 1 schema file, 1 migration, 2 game modules, 3 UI surfaces.

## Constitution Check

- **III. Conventions** — follows the established shape exactly: pure model in `journal.ts`, persistence next door in `journal-store.ts`, storage only via the `SaveStore` seam (guarded by `journal-store.guard.test.ts` and `platform/no-direct-storage.test.ts`). ✅
- **IV. Scope** — counting and showing. No achievements, no unlocks, no gating; named as out of scope in the spec's assumptions. ✅
- **VIII. Testing** — migration and backfill are exactly where a unit test carries signal; the complete-panel line is a one-line render check. ✅
- **XI. Determinism & Solvability** — untouched; no engine code changes. ✅

No violations.

## Project Structure

```text
src/platform/
├── schemas.ts        # StatsRecord v2: boardsPerfect, perfectSeeded; CURRENT_VERSION.stats = 2; validator; default
└── migrate.ts        # stats: { 1: v1 -> v2 }
src/game/
├── journal.ts        # JournalStats.boardsPerfect; recordBoardSolved(store, { perfect })
└── journal-store.ts  # load/saveStats carry the new field; seedPerfectFromCurated(store)
src/ui/
├── gameplay/GameplayScreen.tsx   # pass session.errorsMade === 0 at completion
├── gameplay/CompletePanel.tsx    # one extra line when perfect
├── journal/StatsFooter.tsx       # show the perfect total
└── curated/CuratedScreen.tsx     # mark entries whose best run was clean
```

**Structure Decision**: No new modules. `seedPerfectFromCurated` lives in `journal-store.ts` because it is persistence reconciliation, not a pure derivation — the pure part (counting clean entries from a progress map) sits in `journal.ts` where it can be tested without a store.

## Design notes

### What "perfect" reads from

`PlaySession.errorsMade` increments in `applyMark` when `delta.correct === false`, and undo does not decrement it. That is the semantics FR-003 asks for, already built — no session change is needed. `GameplayScreen` already reads `s?.errorsMade ?? 0` when reporting a solve to the shell, so the value is in hand at exactly the moment `recordBoardSolved` fires.

Signature becomes `recordBoardSolved(store, { perfect: boolean })` rather than a bare positional boolean, so the call site reads as what it means.

### The backfill, and why it is not a migration

The obvious-looking move — have the `stats` v1 → v2 migration count clean curated entries — cannot work: `migrateRecord` is pure, takes one raw record, and has no store access. Forcing it would break the property that makes migrations testable.

Instead:

1. Migration sets `boardsPerfect: 0`, `perfectSeeded: false`.
2. At boot, if `!perfectSeeded`, read `curatedProgress`, count entries with `errors === 0` **explicitly present**, add that to `boardsPerfect`, set `perfectSeeded: true`, save once.
3. Entries whose `errors` is `undefined` were solved before mistakes were tracked and are not counted (FR-008) — the game does not award credit it has no evidence for.

`perfectSeeded` defaults to `false` for brand-new players too. The backfill then counts zero and flips the flag — one wasted read on first launch, in exchange for the flag meaning one thing everywhere instead of two. A default of `true` would be wrong for the (real) case of a player with curated progress but no stats record.

Idempotency is the thing to test: run the backfill twice, assert the total is unchanged.

### Where it shows

- **StatsFooter** — a fourth entry in the existing row, same voice and emoji treatment (`✨ N perfect`).
- **CompletePanel** — the panel's `<p>` currently always reads "Every pool is settled." When perfect, add one line; when not, the panel is byte-identical to today (FR-005). This needs a new optional prop rather than the panel reaching for session state.
- **CuratedScreen** — `CuratedRow.errors` is already merged in and already summed for the header tally, so a per-tile clean mark is a render change with no data plumbing. Distinguish it by more than colour, in keeping with the colourblind-safe rule feature 006 set.
- **Home** — `getHomeStats` is the shell's read model. Adding the perfect total there is optional and not required by any FR; skip it unless it earns its place.

### Ordering against the other features

Independent of all four others. It touches no engine code and no shape or clue logic, so it can be built and merged in any order — including in parallel with [010](../010-line-annotations/spec.md) — and is the cheapest of the five to finish.

One interaction worth noting: [013](../013-curated-page-two/spec.md) adds 36 curated entries. The backfill flag means those are counted as they are solved, not retroactively, which is correct — but it does mean the backfill must ship *before* page two, or a player who solves page-two boards cleanly before upgrading past this feature would have them counted at backfill time as well as at solve time. Building 011 first removes the question entirely.

## Risks

| Risk | Handling |
|---|---|
| Backfill runs twice and double-counts | Persisted `perfectSeeded` flag; idempotency test running it twice |
| First real schema migration in the codebase has a bug | Round-trip tests: v1 record → v2, missing field, malformed field, and a v3-shaped record still `refused` rather than clobbered |
| Perfect count quietly becomes a pressure mechanic | No achievement, no streak, no sound; one line on the panel. Recorded in the spec's assumptions so it is a decision, not a drift |
| Resumed boards judged only on marks since resume | Accepted and documented, not silently inherited — fixing it means putting mistake counts in the save record for marginal gain |

## Sequencing

Build early — ideally first or second. Cheap, self-contained, and removes the double-count question before [013](../013-curated-page-two/spec.md) adds new curated entries.
