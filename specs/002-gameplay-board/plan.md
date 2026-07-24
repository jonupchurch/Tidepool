# Implementation Plan: Gameplay & Board

**Branch**: `002-gameplay-board` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

## Summary

The playable screen: a Canvas 2D renderer draws the engine's hex board on a wet-sand canvas; a play-session layer tracks marks, undo/redo, pool-completion, and board-completion; React chrome wraps it (top bar, panels, toggles). Generation runs off the main thread via a Web Worker around the engine. Progress auto-saves through the persistence seam. The reward loop (creature on solved pool) and the calm completion panel deliver the game's payoff.

## Technical Context

**Language/Version**: TypeScript (strict), React 19.

**Primary Dependencies**: `src/core` (engine, 001); React; Canvas 2D (no extra lib in v1). A Web Worker wrapper around `core/generate`.

**Storage**: None directly — auto-save/restore delegated to `src/platform` (008).

**Testing**: Vitest for `src/game` play-session logic (marks, undo/redo, pool/board completion — pure, high-signal); Playwright e2e for the click-to-mark → reward → complete flow.

**Target Platform**: Browser (main thread render + worker generation); later Tauri webview.

**Performance Goals**: ~60fps interaction on a ~250-cell board; redraw on change (dirty regions), not a full repaint every frame.

**Constraints**: `src/game` stays DOM-free and pure (testable); rendering/input isolated in `src/render`; respect reduced-motion + colorblind settings.

**Scale/Scope**: One screen; boards ~30–250 cells; one canvas renderer + one session model.

## Constitution Check

- **XI. Determinism** — generation delegated to the deterministic engine; the session adds no randomness. ✅
- **III. Conventions** (`stacks/tidepools.md`) — board on Canvas 2D behind `src/render`; session logic in `src/game` (no DOM); screens in `src/ui`; no engine coupling to DOM. ✅
- **IV. Scope** — v1 excludes audio assets, final creature art, and settings UI (feature 006); those are seams/placeholders. ✅
- **VIII. Testing** — session logic unit-tested (pure); golden path e2e via Playwright. ✅

No violations → no Complexity Tracking.

## Project Structure

```text
src/game/
├── session.ts        # PlaySession: marks, undo/redo, pool/board completion (pure, tested)
├── pools.ts          # connected-water-pool enumeration + creature mapping (uses engine helper)
└── *.test.ts
src/render/
├── board-renderer.ts # Canvas 2D draw of cells/clues/line totals/animations
├── hit-test.ts       # pointer → cell mapping; hover
└── animations.ts     # ripple / shimmer / creature-hop (reduced-motion aware)
src/ui/gameplay/
├── GameplayScreen.tsx    # layout: top bar + board canvas + panels
├── TopBar.tsx            # seed label, progress/waterline, pause, undo/redo, toggles
├── CompletePanel.tsx     # "The tide's in." Next / Journal / Home
└── PoolToast.tsx         # "A crab joins your journal"
src/workers/
└── generate.worker.ts    # off-thread wrapper around core/generate
```

**Structure Decision**: Split render (Canvas, imperative) from session (pure logic) from chrome (React), per the module conventions. The worker isolates generation so the UI never blocks (spec FR / SC-004). The `PlaySession` is the pure heart and the primary unit-test target.

## Design notes (research)

- **Rendering**: Canvas 2D is sufficient for ≤250 hexes; keep the renderer behind `src/render` so a WebGL/Pixi swap is possible later. Draw only on state change; animate via `requestAnimationFrame` gated by reduced-motion.
- **Completion detection**: compare `PlaySession.marks` against the engine board's hidden solution. Pool = connected water component (engine helper); a pool completes when all its cells are correctly water and none of its bounding rocks are mis-marked as water. Track a `revealed` set to fire each creature once (mirrors the working mockup logic).
- **Save shape**: `PlaySession` serializes to `{ seedParams, marks, revealed }`; history need not persist (restore lands you mid-board with a fresh undo stack) — confirmed simple default; deep undo persistence is out of scope v1.
- **Creature mapping**: pools sorted by size → creature type/rarity; shared table with Journal (005).

## Quickstart (validation)

- `npm run test` — `session.ts` specs: mark/cycle/clear, undo/redo correctness, pool-complete fires once, board-complete detection, restore-from-save round-trip.
- `npm run test:e2e` — load a fixed small board, mark it to completion, assert a creature appears and the "tide's in" panel shows Next/Journal/Home.
