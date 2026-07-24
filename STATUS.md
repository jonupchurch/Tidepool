# Tidepools — Status

_Snapshot; updated each work session. Last updated: 2026-07-24._

## Current phase

**Planning complete** — all 9 features (001–009) specced + planned under `specs/`. Ready to start implementation (engine first). No code written yet.

## Done

- Reviewed `resources/` design package (brief, style guide, 11 screen mockups).
- Chose stack: Vite + React 19 + TS + Tailwind v4 + Canvas 2D; Tauri for Steam (see `PLAN.md`).
- `git init` + GitHub repo (github.com/jonupchurch/Tidepool); Spec-Kit toolkit bootstrapped.
- Constitution → **v2.2.0**: ratified with Principle XI (Determinism & Solvability, non-negotiable); earlier v2.1.x added ask-over-assume, TL;DR brevity, and Principle X (living artifacts).
- Locked the signature mechanic: connectivity clues use **local / Hexcells-style** semantics (not global connected-components).
- Scaffolded the app on branch `chore/project-scaffold`: Vite 8 + React 19 + TS (strict) + Tailwind v4, module skeleton `src/{core,game,render,ui,platform}`, Vitest + Playwright. **Verified: typecheck + build + unit + e2e all green.**
- Wrote `stacks/tidepools.md` stack pack.
- Decided: no database for v1 — seeds + localStorage/IndexedDB behind the `platform/` seam.
- Scaffold merged to `main`.
- **Specced + planned all 9 features (001–009)** via Spec-Kit (engine got specify→clarify→plan; the rest specify→plan). Feature map + build order in `PLAN.md`.

## Next — implementation (engine first)

- **001 Engine** — implement `src/core/` (RNG → generator → solver → reducer → difficulty) test-first with Vitest; the contract tests in `specs/001-*/contracts/` are the target. First real CHANGELOG entry lands here.
- Then follow the build order: 008 persistence seam → 002 gameplay → 003/004 shell + modes → 005/006 journal + settings → 007 tutorial → art/audio → 009 Tauri/Steam.
- `/speckit-tasks` per feature (starting with the engine) to generate the ordered task list before coding it.
- Self-host fonts (Bricolage + Nunito) before the Tauri build (currently Google Fonts).

## Blockers

- None.
