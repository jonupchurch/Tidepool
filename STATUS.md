# Tidepools — Status

_Snapshot; updated each work session. Last updated: 2026-07-24._

## Current phase

**Implementing (001 + 008 + 002 + 003 + 004 complete).** Engine (`src/core/`), persistence seam (`src/platform/`), gameplay board (`src/game/` + `src/render/` + `src/ui/gameplay/`), app shell (`src/ui/shell/`), and board modes (`src/game/board-source/` + `src/content/curated.json` + `src/ui/curated/`) are built, tested, and verified — **353 unit tests + 11 e2e green**, plus a CI oracle gate over the curated pack. Endless is a deterministic stream, Curated is an oracle-blessed pack with persisted completion, and any seed jumps to its exact board. Next in the build order: **005 shore journal** + **006 settings/themes**.

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
- **001 Engine implemented + verified** — `src/core/`: RNG → hex geometry → board/clues → technique solver + uniqueness oracle → difficulty rater → clue reducer → generation pipeline → serialization + public API. 106 unit/contract tests green. All 36 tasks done.
- **008 Persistence & platform seam implemented + verified** — `src/platform/`: `SaveStore` interface + typed accessors, versioned schemas, web (localStorage + IndexedDB) + in-memory backends, migration, export/import, backend selection. 53 tests green incl. the SC-002 no-leak scan. All 31 tasks done.
- **002 Gameplay board implemented + verified** — `src/game/` (PlaySession, pools, creatures, highlight, off-thread loader), `src/render/` (Canvas renderer + layout/hit-test), `src/ui/gameplay/` (screen + chrome). Marks, pool reward, board completion, undo/redo, autosave/restore, next-board, comfort aids. 79 tests + a chromium golden-path e2e. All 37 tasks done. Exposed engine hex adjacency from `core/index.ts`.
- **003 App shell implemented + verified** — `src/ui/shell/`: `AppShell` nav host (pure bounded-history reducer, calm cross-fade, `data-theme`), Home (Play + Endless picker + seed entry + resume card + stats + mute/theme toggles), Splash (crab + loader + rotating tips), Pause overlay (Resume/New/Restart/Settings/Home), and the shell-store adapter over 008. 69 tests + 4 new e2e (cold-open Play, resume, pause, theme-persist). All 37 tasks done. Added `resume`/`onPause` seam props to GameplayScreen; provisional Night Tide tokens (006 owns final).
- **004 Board modes implemented + verified** — `src/game/board-source/` (pure, purity-guarded): `BoardRequest` funnel, deterministic Endless stream (`nextSeed`), total `parseSeedEntry`, curated load/merge/gating. `src/content/curated.json` (8 oracle-blessed seeds) + `CuratedScreen`; CI oracle `scripts/validate-curated.ts` (`npm run validate:curated` + `.github/workflows/ci.yml`). Home reuses `SeedEntry`; shell "Next board" advances the stream; curated completion recorded via GameplayScreen's new `onSolved` seam. 55 tests + 6 e2e. All 37 tasks done (standalone EndlessPicker/ModeSelect consolidated into Home).
- **All 9 features tasked** — full `tasks.md` for 001–009 (313 tasks total).

## Next — implementation (build order)

- **005 Shore Journal** — creature catalog + persisted discovery records; the Journal screen + lifetime stats. Fills Home's Journal placeholder + resolves the mockups' creature/seed data conflict.
- **006 Settings & Themes** — settings model + Settings screen + the real Day/Night Tide token system (replaces the provisional Night tokens; adds Auto/OS) + save export/import.
- Then: 007 tutorial → art/audio → 009 Tauri/Steam.
- **Deferred seams to revisit:** control/hover/nudge defaults use local values (wire to 006 settings); Night Tide uses provisional tokens (006 owns the final palette); curated gating ships OFF with no runtime toggle (wire one if a curved pack opts in); crab.png is a 1.9 MB unoptimized splash asset (optimize before Tauri).
- Self-host fonts (Bricolage + Nunito) before the Tauri build (currently Google Fonts).

## Blockers

- None.
