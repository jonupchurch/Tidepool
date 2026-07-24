# Tidepools — Status

_Snapshot; updated each work session. Last updated: 2026-07-24._

## Current phase

Project scaffold complete and verified. Ready to start the Spec-Kit feature chain (engine first).

## Done

- Reviewed `resources/` design package (brief, style guide, 11 screen mockups).
- Chose stack: Vite + React 19 + TS + Tailwind v4 + Canvas 2D; Tauri for Steam (see `PLAN.md`).
- `git init` + GitHub repo (github.com/jonupchurch/Tidepool); Spec-Kit toolkit bootstrapped.
- Constitution → **v2.2.0**: ratified with Principle XI (Determinism & Solvability, non-negotiable); earlier v2.1.x added ask-over-assume, TL;DR brevity, and Principle X (living artifacts).
- Locked the signature mechanic: connectivity clues use **local / Hexcells-style** semantics (not global connected-components).
- Scaffolded the app on branch `chore/project-scaffold`: Vite 8 + React 19 + TS (strict) + Tailwind v4, module skeleton `src/{core,game,render,ui,platform}`, Vitest + Playwright. **Verified: typecheck + build + unit + e2e all green.**
- Wrote `stacks/tidepools.md` stack pack.
- Decided: no database for v1 — seeds + localStorage/IndexedDB behind the `platform/` seam.

## Next

- Merge `chore/project-scaffold` → `main`.
- Start the Spec-Kit chain: `/speckit-specify` → `/speckit-plan` across the feature set (engine first).
- Self-host fonts (Bricolage + Nunito) before the Tauri build (currently Google Fonts).

## Blockers

- None.
