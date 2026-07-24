# Tidepools — Status

_Snapshot; updated each work session. Last updated: 2026-07-24._

## Current phase

Project scaffold complete and verified. Ready to start the Spec-Kit feature chain (engine first).

## Done

- Reviewed `resources/` design package (brief, style guide, 11 screen mockups).
- Chose stack: Vite + React 19 + TS + Tailwind v4 + Canvas 2D; Tauri for Steam (see `PLAN.md`).
- `git init` + GitHub repo (github.com/jonupchurch/Tidepool); Spec-Kit toolkit bootstrapped.
- Constitution → v2.1.1 (ask-over-assume, TL;DR brevity, Principle X: living artifacts).
- Scaffolded the app on branch `chore/project-scaffold`: Vite 8 + React 19 + TS (strict) + Tailwind v4, module skeleton `src/{core,game,render,ui,platform}`, Vitest + Playwright. **Verified: typecheck + build + unit + e2e all green.**
- Wrote `stacks/tidepools.md` stack pack.
- Decided: no database for v1 — seeds + localStorage/IndexedDB behind the `platform/` seam.

## Next

- Merge `chore/project-scaffold` → `main`.
- Self-host fonts (Bricolage + Nunito) before the Tauri build (currently Google Fonts).
- Decide whether to add the seed-determinism invariant as a constitution principle.
- Start the Spec-Kit chain: `/speckit-specify` → `/speckit-plan` across the feature set (engine first).

## Blockers

- None.
