# Implementation Plan: Tutorial / How to Play

**Branch**: `007-tutorial` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

## Summary

One interactive onboarding flow: an ordered list of steps over fixed tiny boards, each teaching one mechanic and gating advance on the correct action. It reuses Gameplay's board renderer + input (constrained to the lesson's allowed cells) and the nudge feedback, ending with the creature reward and a hand-off to a real board. Replaces both mockup flows.

## Technical Context

**Language/Version**: TypeScript (strict), React 19.

**Primary Dependencies**: Gameplay renderer/input (002); engine (001) for fixed boards; persistence (008) for onboarding state.

**Storage**: Onboarding completion flag via `src/platform`.

**Testing**: Vitest for the step machine (advance-on-correct, skip, restart, completion); Playwright e2e for the full guided flow incl. the `-n-` step and the reward.

**Target Platform**: Browser SPA; later Tauri webview.

**Performance Goals**: Instant, tiny boards; reduced-motion honored.

**Constraints**: Never hard-blocks (skip always available); deterministic fixed boards so steps always align.

**Scale/Scope**: One flow, ~4–6 steps, a handful of authored/fixed-seed boards.

## Constitution Check

- **III. Conventions** — step machine in `src/game` (pure, tested); tutorial UI in `src/ui`; reuses `src/render` rather than a parallel board impl. ✅
- **IV. Scope** — one consolidated flow; no new board tech (reuses Gameplay + engine). ✅
- **VIII. Testing** — step machine unit-tested; guided flow e2e (incl. the previously-untaught split clue). ✅

No violations.

## Project Structure

```text
src/game/tutorial/
├── steps.ts          # ordered step definitions (concept, board ref, required cells/actions)
├── flow.ts           # step machine: advance-on-correct, skip, restart, complete (pure, tested)
└── *.test.ts
src/content/
└── tutorial-boards.ts # fixed/authored tiny boards (or fixed seeds) per step
src/ui/tutorial/
├── TutorialScreen.tsx # coaching card + constrained board + progress dots
```

**Structure Decision**: A pure `flow.ts` step machine drives a constrained instance of Gameplay's renderer/input — teaching happens on the *real* board component, so the lesson matches the game exactly and there's no second board implementation to maintain (fixes the mockups' duplication).

## Design notes

- **Constrained input**: each step exposes only the cells/actions it teaches; a wrong action triggers the shared nudge and does not advance (FR-002).
- **Split-clue step**: an authored board where a `-n-` clue is the crux, requiring the player to place waters non-adjacently — the interactive teach that was missing.
- **Fixed boards**: authored or fixed-seed via the engine so guided expectations never drift.
- **First-run offer**: shell checks onboarding state; offers once, always skippable.

## Quickstart (validation)

- `npm run test` — step machine: advances only on correct action, skip exits, restart resets, completion fires reward.
- `npm run test:e2e` — run the full flow: each mechanic taught, the `-n-` step requires a non-adjacent placement, completion shows a creature and offers a real board; Skip mid-flow reaches the game.
