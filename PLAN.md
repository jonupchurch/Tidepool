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

## Feature set — plan all before building (Constitution VII)

1. **Engine** (generator / solver / reducer / difficulty) — load-bearing; first.
2. Board + gameplay screen
3. Home / main menu
4. Endless tide (difficulty picker)
5. Curated shores (level pack)
6. Shore journal (creature collection)
7. Settings (+ Night Tide dark mode)
8. Tutorial / how-to-play (consolidate the two mockups into one)
9. Splash + pause
10. Tauri / Steam packaging

## Build order (high level)

Engine + shared data models → gameplay board → screens → persistence/platform seam
→ Night Tide dark mode → art + audio → Tauri wrap + Steamworks → Steam release prep.

## Known gaps (from `resources/` review)

- Real generator/solver unbuilt (mockups use hardcoded solution grids).
- Creature art: only the crab exists; all others are placeholders.
- Night Tide dark mode specced but unbuilt.
- Journal ↔ Curated creature/seed mappings disagree (fix when wired to shared state).
