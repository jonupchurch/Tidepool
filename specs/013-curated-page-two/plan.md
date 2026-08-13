# Implementation Plan: Curated Page Two

**Branch**: `013-curated-page-two` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

## Summary

The curated pack is already a versioned manifest of groups and entries, merged with persisted progress into rows and laid out as six groups of six. Page two is three changes: the manifest gains **pages** (groups declare which page they belong to), entries gain an optional **clue set** and **silhouette** so a board can ask for the mechanics [010](../010-line-annotations/spec.md) and [012](../012-irregular-shores/spec.md) built, and the curated screen gains a pager.

The bulk of the work is not code. It is finding 36 seeds that validate as unique, guess-free, and on-tier across new mechanics and new shapes — which is why FR-013 makes that an automated search rather than a hand-picking exercise.

## Technical Context

**Language/Version**: TypeScript 5, strict. React 19 for the screen.

**Primary Dependencies**: None new. Depends on [010](../010-line-annotations/spec.md) and [012](../012-irregular-shores/spec.md) being merged and verified.

**Storage**: None new. `CuratedProgressRecord` is keyed by entry id and is page-agnostic, so a second page needs no schema change and existing progress keeps resolving.

**Testing**: Vitest for the pure manifest derivations (paging, grouping, lock resolution, the next-entry chain across a page boundary); Playwright for the pager and for a page-two board playing through to completion. `npm run validate:curated` is the shipping gate and must cover both pages.

**Target Platform**: Web + Tauri desktop. Unchanged.

**Performance Goals**: `validate:curated` runs the full generator + solver over 72 boards. It is already the slowest check in the repo; doubling it is acceptable but should be measured, and the seed search must be a separate script, not part of the gate.

**Constraints**: Page one bit-for-bit unchanged (FR-007). Every shipped board validates or the build fails (FR-008).

**Scale/Scope**: 1 content file, ~3 game modules, 1 screen, 1 new script, 2 e2e specs updated.

## Constitution Check

- **III. Conventions** — the manifest is already versioned with backward-compatible reads (`groupRows` handles a v1 pack with no groups at all). Pages follow that precedent: an absent page reads as page one. ✅
- **IV. Scope** — a second page using existing mechanics. No new creatures, no new layout, no hand-authored boards; all three named out of scope in the spec's assumptions. ✅
- **VIII. Testing** — the manifest derivations are pure and are where the page-boundary bugs will be; the pager and a full page-two playthrough need a browser. ✅
- **XI. Determinism & Solvability** — every shipped board goes through the same oracle gate that guards page one, extended to carry per-entry clues and shape. ✅

No violations.

## Project Structure

```text
src/content/
└── curated.json               # v3: groups gain `page`; entries gain optional `clues` + `shape`
src/game/board-source/
├── curated.ts                 # CuratedPage; pageRows(); nextCuratedEntry across pages; locks across pages
└── request.ts                 # BoardRequest gains optional clues + shape; toBoardParams passes them through
src/ui/curated/
└── CuratedScreen.tsx          # pager; per-page groups; per-page + overall tally
scripts/
├── find-curated-seeds.ts      # NEW: automated seed search per band, emits manifest entries
└── validate-curated.ts        # honour per-entry clues + shape
e2e/
├── curated.spec.ts            # pager
└── curated-chain.spec.ts      # next-board across the page boundary
```

**Structure Decision**: No new modules. Paging is a property of the existing manifest, and the pager is a control on the existing screen — inventing a page abstraction beyond a field on `CuratedGroup` would be more structure than the problem has.

## Design notes

### Manifest v3

`CuratedGroup` gains `page: number`; absent means page 1, so the shipped v2 pack reads unchanged. `CuratedEntry` gains optional `clues` and `shape`; absent means today's defaults, which is what keeps page one byte-identical (FR-007).

`loadCuratedPack()` already sorts groups and entries by `order`. Entry `order` stays globally unique and monotonic across pages, so `nextCuratedEntry` and `resolveLocks` — both of which sort the flat entry list — keep working across the boundary with no change. That is the cheapest way to satisfy FR-011 and FR-012, and it is worth stating in the manifest's own comment so a later editor does not restart numbering per page and quietly break both.

### The two quiet edges

Called out in the spec because both look fine on page one while being wrong across the boundary:

- **Next-board chain.** `nextCuratedEntry` walks the sorted flat list, so it already crosses pages given globally-ordered entries. What needs a test is the *end* of page two returning null, and the transition from the last board of page one to the first of page two.
- **Gating.** `resolveLocks` counts unsolved entries ahead of your frontier over the same flat list. Same story: correct by construction if ordering is global, wrong the moment someone pages the list first. Test it with gating enabled across the boundary, even though gating ships off.

### Per-entry clues and shape

`toBoardParams` currently attaches a fixed `DEFAULT_CLUES` to every request. It gains optional pass-through: an entry's declared clue set and silhouette flow into `BoardParams`, and absent fields fall back to today's defaults. `isBoardRequest` validates the new optional fields when present — same posture as everywhere else in this file, which validates rather than trusts.

This is also what `validate-curated.ts` needs in order to gate the new boards honestly; without it the validator would check a different board from the one that ships.

### Seed search

`scripts/find-curated-seeds.ts`, modelled on the existing `find-trailer-seed.ts`: for a requested band (size, difficulty, shape, clue set), walk candidate seed codes, generate, solve, and keep those that come back solved, unique, and rated exactly at the requested tier. Emit ready-to-paste manifest entries.

Worth building properly rather than scripting once: the pack will be regenerated whenever a mechanic changes, and 36 boards found by hand cannot be redone. It should also report what it rejected and why — a band that yields nothing is a signal about the generator, not just a failed search.

### The screen

`CuratedScreen` currently renders `groups.slice(0, RING.length)` — six groups on a hex ring, laid out in hex units and emitted as percentages. Paging filters the groups by page before that slice; the geometry is untouched.

The pager itself: previous/next plus a current-page indicator, keyboard operable, with the page change announced (FR-003, and feature 006's accessibility posture). The header tally shows the current page's progress with the overall figure alongside, so FR-005's two numbers are both present without a second screen.

### Content shape

Page two is weighted deeper than page one — page one runs Calm through the tiers from a Medium base; page two should start around where page one ends and climb, which in practice means mostly Tricky and Deep. The exact distribution falls out of what the seed search can actually find at each band, which is why FR-010 is written as a distribution rather than a per-board rule.

Mechanics arrive gradually: a group that introduces row annotations on otherwise-familiar boards, then a group that introduces shapes, then boards that combine them. A player should never meet two new things on the same board.

## Risks

| Risk | Handling |
|---|---|
| Entry ordering restarted per page, silently breaking chain + gating | Global monotonic `order`, stated in the manifest comment, tested across the boundary |
| Seed search finds nothing at a band (e.g. Deep + atoll + annotations) | Search reports rejections with reasons; fall back to a neighbouring band rather than shipping an off-tier board |
| `validate:curated` runtime doubles and slows CI | Measure; keep the search out of the gate; parallelise the validator if it becomes the bottleneck |
| Page one changes by accident via a shared default | Fingerprint test over page-one boards, same technique as [010](../010-line-annotations/spec.md) |
| Pager unreachable on a small window | Playwright at the smallest supported size, both pages |

## Sequencing

Last of the five. Hard dependency on [010](../010-line-annotations/spec.md) and [012](../012-irregular-shores/spec.md) — it is the feature those two exist to serve. Building it earlier would mean shipping a page of boards that cannot yet use the mechanics that justify it.
