# Tidepools — Status

_Snapshot; updated each work session. Last updated: 2026-07-24._

## Current phase

**Implementing (001 + 008 + 002 + 003 complete).** Engine (`src/core/`), the persistence seam (`src/platform/`), the gameplay board (`src/game/` + `src/render/` + `src/ui/gameplay/`), and the app shell (`src/ui/shell/` — Home/Splash/Pause + routing) are built, tested, and verified — **287 unit tests + 6 e2e green**. The app now boots to a warm Home, routes into the game, resumes in-progress boards, and pauses safely. Next in the build order: **004 board modes** (curated sets + endless progression behind Home's entries).

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
- **All 9 features tasked** — full `tasks.md` for 001–009 (313 tasks total).

## Next — implementation (build order)

- **004 Board Modes** — curated sets + endless progression behind Home's Play/Curated/Endless entries; replaces the shell's fresh-seed placeholder with real board-source behavior. Then 005/006 journal + settings.
- Then: 005/006 journal + settings → 007 tutorial → art/audio → 009 Tauri/Steam.
- **Deferred seams to revisit:** GameplayScreen's "Next board" + the shell's Play/New-board use a placeholder fresh-seed (wire to 004 board source); control/hover/nudge defaults use local values (wire to 006 settings); Night Tide uses provisional tokens (006 owns the final palette); crab.png is a 1.9 MB unoptimized splash asset (optimize before Tauri).
- Self-host fonts (Bricolage + Nunito) before the Tauri build (currently Google Fonts).

## Blockers

- None.
