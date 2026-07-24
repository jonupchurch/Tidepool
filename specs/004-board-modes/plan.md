# Implementation Plan: Board Modes — Endless, Curated & Seed Entry

**Branch**: `004-board-modes` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

## Summary

A thin `board-source` layer that turns each mode into a `BoardRequest {seed,size,difficulty}` for Gameplay: Endless derives a reproducible seed stream; Curated reads a bundled, oracle-validated manifest of blessed seeds; Seed-entry parses/validates player input. Plus the Curated Shores list/path screen. All determinism comes from the engine; these modes only choose seeds.

## Technical Context

**Language/Version**: TypeScript (strict), React 19.

**Primary Dependencies**: `src/core` (engine + oracle); persistence (008) for curated progress + last endless prefs; Gameplay (002) as consumer.

**Storage**: Curated manifest = static bundled JSON asset; progress via `src/platform`.

**Testing**: Vitest for endless-stream determinism, seed parsing/validation, curated-progress logic; a build/CI test that runs the engine oracle over every curated manifest entry; Playwright e2e for picker→board, curated→board, seed→board.

**Target Platform**: Browser SPA; later Tauri webview.

**Performance Goals**: Mode selection is instant; board generation cost is the engine's (off-thread).

**Constraints**: No unsolvable curated board may ship (CI-enforced); seed parsing is total (never throws to the user — gentle messages).

**Scale/Scope**: 3 modes + 1 screen (Curated) + a manifest of ~N curated boards.

## Constitution Check

- **XI. Determinism** — endless stream + seed entry are pure seed math over the deterministic engine; curated seeds are oracle-validated pre-ship. ✅
- **III. Conventions** — board-source logic in `src/game` (pure), Curated screen in `src/ui`; no DOM in the source layer. ✅
- **IV. Scope** — modes don't generate/solve (engine does), don't render boards (gameplay does), don't own storage (platform does). ✅
- **VIII. Testing** — determinism + parsing unit-tested; **curated manifest validated by the oracle in CI** (a standout test that prevents shipping a broken level). ✅

No violations.

## Project Structure

```text
src/game/board-source/
├── request.ts        # BoardRequest type + helpers
├── endless.ts        # deterministic next-seed stream (pure, tested)
├── seed-entry.ts     # parse/validate a human seed token (pure, total, tested)
├── curated.ts        # load manifest + merge progress (pure, tested)
└── *.test.ts
src/content/
└── curated.json      # shipped manifest of blessed seeds (oracle-validated in CI)
src/ui/curated/
└── CuratedScreen.tsx # coastline path/list: name, difficulty, seed, completion, lock
scripts/
└── validate-curated.ts  # CI: run engine oracle over every curated entry
```

**Structure Decision**: A pure `board-source` module (no DOM) that all three modes funnel through, so Gameplay has a single entry point. The curated manifest is data, validated by an engine-oracle CI script — the manifest can grow without code changes, and a bad seed can never ship.

## Design notes

- **Endless derivation**: `next(seed) = hashStep(seed)` (deterministic); a stream is `{startSeed, size, difficulty, index}`. Reproducible and shareable ("this stream from CORAL-4417").
- **Seed token**: parse `WORD-NNNN` (+ optional size/difficulty suffix). A bare token uses current prefs; a full token overrides — so a shared board reproduces exactly (SC-003). Total function → `{ ok, request } | { ok:false, reason }`.
- **Curated manifest**: `{ version, entries: [{ id, name, seed, size, difficulty, order }] }`. Earned creature is derived (by solved board's largest pool) and shown on completion. Progress merged from persistence.
- **Oracle CI gate**: `scripts/validate-curated.ts` calls `generateBoard`/`solve` for each entry and fails the build if any isn't uniquely solvable at its stated difficulty — makes SC-002 structurally guaranteed.

## Quickstart (validation)

- `npm run test` — endless stream reproduces a fixed sequence; seed parsing accepts valid / rejects invalid with a reason; curated progress merge.
- CI — `validate-curated.ts` passes (every curated board uniquely solvable).
- `npm run test:e2e` — Endless picker → board; Curated entry → exact board → solve marks it complete; seed entry → identical board; bad seed → gentle message, no load.
