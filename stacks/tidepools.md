# Stack pack — Tidepools (Vite + React + TS + Canvas + Tauri)

Conventions for this repo. **Repo code wins** where it already sets a pattern
(constitution Principle III); this is the default to reach for otherwise.

## Defaults

- **Vite + React 19 + TypeScript (strict).** Client-side SPA, no SSR. Function
  components + hooks. No `React` import needed (`jsx: react-jsx`).
- **Tailwind v4** for chrome styling. Palette + fonts are CSS-first design
  tokens in `src/index.css` under `@theme` (e.g. `bg-sand`, `text-deep-pool`,
  `font-display`) — match the style guide; don't hardcode hex in components.
- **Canvas 2D** for the hex board (behind `src/render/`), not DOM/SVG. Keep it
  swappable to WebGL/Pixi later without touching `game`/`ui`.
- **Determinism is sacred.** Generation/solving use a seeded RNG only — never
  `Math.random()`, `Date.now()`, or ambient state in `core/`. Same seed → same
  board, everywhere, always.
- **npm** for packages. **Path alias `@/` → `src/`.**
- **No database.** The seed design + local storage cover v1. Persistence goes
  through `src/platform/` (localStorage/IndexedDB now, a Tauri impl later).

## Where things go

- `src/core/` — pure deterministic engine (RNG, generator, solver, reducer,
  difficulty). No DOM, no React, no I/O. The most-tested module.
- `src/game/` — play session over the engine: marks, undo/redo, pool
  completion, save/restore shape.
- `src/render/` — Canvas 2D board renderer + input hit-testing.
- `src/ui/` — React screens/chrome (Home, Settings, Journal, …) + Tailwind.
- `src/platform/` — the seam: `web` vs `tauri` implementations of save/load,
  achievements, file paths. Everything OS-specific lives here.
- Curated levels = a static bundled JSON manifest of `{name, seed, size,
  difficulty, ordering}` (seeds, not stored boards).

## Don't

- Don't put randomness or wall-clock time in `core/` — it breaks reproducibility.
- Don't import React/DOM into `core/` or `game/` (keep them portable + testable).
- Don't call `localStorage`/Tauri APIs outside `src/platform/`.
- Don't hardcode palette hex in components — use the Tailwind theme tokens.
- Don't reach for a database or backend — see Defaults.

## Verify (before "done")

- `npm run typecheck` and `npm run build` pass.
- `npm run test` (Vitest) green — especially `core/` logic + edge cases.
- `npm run test:e2e` (Playwright) covers the critical path you touched.
- For any `core/` change: a test asserting the same seed still yields the same board.

## Known follow-ups

- Fonts load from Google Fonts in `index.html`; **self-host Bricolage + Nunito**
  before the Tauri/Steam build so the app works fully offline.
