# Implementation Plan: Shore Journal — Creature Collection

**Branch**: `005-shore-journal` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

## Summary

A React screen over a shared creature catalog + persisted discovery records. Gameplay fires a discovery event on pool completion; a small journal model records first-found seed + count and exposes a read model (found/silhouette, counts, filters). A stats footer reads lifetime totals from persistence. The shared catalog is the single source of truth for creature identity + reward mapping, resolving the mockups' data conflict.

## Technical Context

**Language/Version**: TypeScript (strict), React 19.

**Primary Dependencies**: shared `creatures` catalog (also used by Gameplay 002); persistence (008).

**Storage**: Discovery records + stats via `src/platform` (008).

**Testing**: Vitest for the journal model (record first-found, increment, filter, count) — pure; Playwright e2e for discover-in-gameplay → appears-in-journal.

**Target Platform**: Browser SPA; later Tauri webview.

**Performance Goals**: Instant render for a catalog of tens of creatures.

**Constraints**: Missing art degrades to placeholder; warm empty + full states.

**Scale/Scope**: One screen + a small model + a shared catalog (~a dozen creatures).

## Constitution Check

- **III. Conventions** — catalog + journal model in `src/game` (pure), screen in `src/ui`, storage via `src/platform`. ✅
- **IV. Scope** — journal records/reads; it does not compute source-of-truth stats (persistence) or trigger discoveries (gameplay). ✅
- **VIII. Testing** — record/increment/filter logic unit-tested; golden path e2e. ✅
- Resolves a known mockup inconsistency via a single shared catalog. ✅

No violations.

## Project Structure

```text
src/game/
├── creatures.ts        # shared catalog: id, name, rarity, description, unlock (pool size), art?
├── journal.ts          # discovery model: record(firstFound,count), read model, filters (pure, tested)
└── *.test.ts
src/content/
└── creatures.json      # catalog data (art paths where available; crab only for now)
src/ui/journal/
├── JournalScreen.tsx   # grid + filter + count + stats footer
└── CreatureCard.tsx    # found card / silhouette / placeholder
```

**Structure Decision**: The creature catalog lives once in `src/game/creatures.ts` (+ `creatures.json` data) and is imported by both Gameplay's reward mapping and the Journal — one source of truth, so seed→creature and journal state can never disagree (fixes the mockup conflict).

## Design notes

- **Discovery flow**: Gameplay's pool-complete → `journal.record(creatureId, seed)`; journal writes/updates `{ found, firstFoundSeed, count }` via persistence. Read model derives found/silhouette + "X of Y."
- **Reward mapping**: pools sorted by size; size ranges map to creatures/rarity in the catalog (mirrors the working mockup's approach).
- **Art**: `CreatureCard` shows art if present, else a styled placeholder (crab is the only real asset now — PLAN tracks the art gap).
- **Stats footer**: reads `boardsSolved / poolsFilled / creaturesFound` from persistence; display-only.

## Quickstart (validation)

- `npm run test` — journal model: first find sets firstFoundSeed + count 1; refind increments; filters partition All/Found/Missing; count matches.
- `npm run test:e2e` — reveal a new creature in Gameplay, open the Journal, assert the card flips from silhouette to found with the correct seed and count.
