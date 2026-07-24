# Tidepools — Project Plan

Living roadmap. Per-feature detail lives in `specs/<feature>/` (Spec-Kit).
Companions: `STATUS.md` (where we are) · `CHANGELOG.md` (what happened) ·
`.specify/memory/constitution.md` (how we work).

## Vision

A cozy, seed-deterministic hex-based logic puzzle game (Hexcells-like, re-themed
as tide pools) for eventual release on Steam. Read the shoreline's clues to
deduce water vs. rock; solved pools bloom into hand-drawn creatures.

## Locked decisions

- **Stack:** Vite + TypeScript + Canvas board, wrapped in **Tauri** for the Steam build.
- **Web-first, then wrap** (not a rewrite). Local-first: all state in localStorage/IndexedDB, no backend.
- **Seed-determinism invariant:** every board is fully seed-determined and solver-verified to have a unique, guess-free solution. (Constitution XI.)
- **Connectivity clues = local / Hexcells-style:** `{n}` = the counted water cells are consecutive among themselves (adjacent around the clue cell, or no gaps along the line); `-n-` = they are not all consecutive. Not global connected-components.
- **Steam:** achievements + Auto-Cloud saves are enough; in-game overlay not required.
- **Ruled out:** C#/MonoGame, Godot, Unity, Next.js.

## Module architecture

`core/` (pure deterministic engine: RNG → generator → solver → reducer → difficulty)
· `game/` (play session, undo/redo, saves) · `render/` (Canvas board) ·
`ui/` (screens) · `platform/` (web vs. tauri seam).
Tests: **Vitest** (engine) + **Playwright** (e2e).

## Feature set — all specced + planned (Constitution VII) ✅

Every feature below has a `spec.md` + `plan.md` under `specs/`. Detail lives there; this is the map.

| # | Feature | What it covers |
|---|---------|----------------|
| 001 | **Puzzle Engine** | Deterministic generate → solve → reduce → rate; the shared board/clue model. Load-bearing. |
| 002 | **Gameplay & Board** | The playable Canvas board: marking, undo/redo, pool/board completion, reward loop. |
| 003 | **App Shell** | Home, Splash, Pause, navigation; resume + stats. |
| 004 | **Board Modes** | Endless stream, Curated pack (oracle-validated manifest), Enter-a-seed. |
| 005 | **Shore Journal** | Creature collection over one shared catalog; discovery records. |
| 006 | **Settings & Themes** | Grouped settings + accessibility + Night Tide dark mode (owns theme tokens). |
| 007 | **Tutorial** | One consolidated teach-by-doing onboarding (incl. the `-n-` split lesson). |
| 008 | **Persistence & Platform** | The `SaveStore` seam (web backend now, Tauri later); versioned + migratable. No DB. |
| 009 | **Desktop Packaging** | Tauri wrap for Steam; native save backend, achievements + Auto-Cloud, self-hosted fonts. |

**Clarified engine scope (001):** filled hex field via a present-cell set (irregular later); difficulty rated by solver technique + depth; water-number clues out of v1; on-demand off-thread generation.

## Build order (dependency order)

001 Engine → 008 Persistence seam → 002 Gameplay → 003 App Shell + 004 Board Modes → 005 Journal + 006 Settings/Themes → 007 Tutorial → art + audio pass → 009 Tauri/Steam packaging → Steam release prep.

## Known gaps (from `resources/` review)

- Real generator/solver unbuilt (mockups use hardcoded solution grids).
- Creature art: only the crab exists; all others are placeholders.
- Night Tide dark mode specced but unbuilt.
- Journal ↔ Curated creature/seed mappings disagree (fix when wired to shared state).
