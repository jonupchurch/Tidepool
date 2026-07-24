# Tidepools — Status

_Snapshot; updated each work session. Last updated: 2026-07-24._

## Current phase

**Engine built (001 complete) + all features tasked.** The deterministic puzzle engine (`src/core/`) is implemented, tested (106 green), and verified. Every remaining feature (002–009) now has a full `tasks.md` (277 tasks total, test-first per Constitution VIII). Ready to implement in build order — **008 persistence seam is next.**

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
- **001 Engine implemented + verified** — `src/core/`: RNG → hex geometry → board/clues → technique solver + uniqueness oracle → difficulty rater → clue reducer → generation pipeline → serialization + public API. 106 unit/contract tests green; typecheck + build pass. All 36 tasks in `specs/001-*/tasks.md` done. See CHANGELOG for the SC-001…SC-006 verification.

## Next — implementation (build order)

- **008 Persistence & platform seam** — the `SaveStore` interface + web backend; unblocks every stateful feature. Run `/speckit-tasks` then implement.
- Then: 002 gameplay → 003/004 shell + modes → 005/006 journal + settings → 007 tutorial → art/audio → 009 Tauri/Steam.
- `/speckit-tasks` per feature to generate the ordered task list before coding it.
- Self-host fonts (Bricolage + Nunito) before the Tauri build (currently Google Fonts).

## Blockers

- None.
