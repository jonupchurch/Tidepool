# Implementation Plan: App Shell — Home, Splash & Pause

**Branch**: `003-app-shell` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

## Summary

The React shell that hosts and navigates between screens, plus the Home, Splash, and Pause surfaces. A lightweight in-app view state routes between Home / Gameplay / Curated / Journal / Settings / Tutorial; Home renders entry points, light stats, and a resume card; Splash covers load; Pause overlays a frozen board. Theme + mute prefs are applied here and persisted via the platform seam.

## Technical Context

**Language/Version**: TypeScript (strict), React 19.

**Primary Dependencies**: React; Tailwind v4 tokens; reads persistence (008) and journal (005); triggers board-modes (004) and gameplay (002).

**Storage**: Shell prefs (theme, mute) + resume snapshot via `src/platform` (008); shell owns none directly.

**Testing**: Vitest for view-state/navigation reducer + resume-visibility logic (pure); Playwright e2e for cold-open → Play, resume, and Pause→Resume flows.

**Target Platform**: Browser SPA; later Tauri webview.

**Performance Goals**: Instant navigation; splash dismisses as soon as the target is ready.

**Constraints**: Client-side only (no server routes); warm empty states with zero saved data; reduced-motion aware.

**Scale/Scope**: ~4 shell surfaces (Home, Splash, Pause, nav container) + a small view-state store.

## Constitution Check

- **III. Conventions** — screens in `src/ui`; prefs/resume via `src/platform`; theme tokens from Settings; no business logic in components beyond wiring. ✅
- **IV. Scope** — shell does not own board-source behavior, theme token definitions, stats data, or saves — all delegated. ✅
- **VIII. Testing** — navigation + resume-visibility are pure and unit-tested; primary flows e2e-tested. ✅
- **I/VI** — cross-feature seams named up front. ✅

No violations.

## Project Structure

```text
src/ui/shell/
├── AppShell.tsx        # view-state host + screen switch + transitions
├── nav.ts             # view-state model + reducer (pure, tested)
├── HomeScreen.tsx     # landing: Play, entries, stats, resume card, toggles
├── SplashScreen.tsx   # wordmark + crab + themed loader + rotating tips
├── PauseOverlay.tsx   # Resume / New board / Restart / Settings / Home
├── ResumeCard.tsx     # in-progress board summary (reads persistence)
└── *.test.ts
```

**Structure Decision**: A single `AppShell` holds view state and swaps screens (no external router needed for v1; a small pure reducer in `nav.ts` is the tested unit). Home composes controls owned elsewhere (board-modes picker, journal stat) via their exported components/services, keeping the shell thin.

## Design notes

- **Navigation**: enum of views + a reducer; transitions are CSS/opacity, reduced-motion gated. A real URL router is deferred (not needed for a desktop game; easy to add if web-demo deep links are wanted).
- **Resume visibility**: derived purely from a persistence query (`getInProgressBoard()`), so it's trivially unit-testable and correct on cold start.
- **Theme application**: shell writes a `data-theme` attribute / token set; the actual token values are owned by Settings (006). This keeps Night Tide's definition in one place.
- **Splash**: reuses the crab asset; tips array cycles on an interval (cleared on unmount); no progress percentage.

## Quickstart (validation)

- `npm run test` — `nav.ts` reducer (transitions, back), resume-card visibility (present iff in-progress board), pref persistence.
- `npm run test:e2e` — cold open → Play reaches a board in ≤2 clicks; leave mid-board → resume card restores it; Pause → Resume returns to the exact board; Night toggle persists across reload.
