# Implementation Plan: Settings & Themes

**Branch**: `006-settings-themes` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

## Summary

A settings model (one versioned object) + a React Settings screen + the theme token system. Settings persist via the platform seam and are read live by consumers (Gameplay, Home). Themes are two CSS-variable token sets (Daylight, Night Tide) plus Auto (OS `prefers-color-scheme`), applied by the shell via a `data-theme` attribute. Export/import operates on the whole save blob.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Tailwind v4.

**Primary Dependencies**: persistence (008) for storage + save blob; App Shell (003) for theme application; consumers (002, 003, 004).

**Storage**: Settings object + save blob via `src/platform`.

**Testing**: Vitest for settings defaults/merge/validation + save-blob export/import round-trip + reset guard; Playwright e2e for live-apply, Night Tide across screens, and colorblind cue presence.

**Target Platform**: Browser SPA; later Tauri webview (Auto theme works in both).

**Performance Goals**: Instant live application of any setting.

**Constraints**: Every setting has a first-run default; malformed imports never corrupt existing data; colorblind-safe uses a non-color cue.

**Scale/Scope**: One screen, one settings schema, two theme token sets.

## Constitution Check

- **II. Validated boundaries** — imported save blobs are untrusted input: validate against the schema/version before applying; reject safely. ✅
- **III. Conventions** — theme tokens as Tailwind v4 `@theme` / CSS variables (per `stacks/tidepools.md`); settings model in `src/game`, screen in `src/ui`, storage via `src/platform`. ✅
- **IV. Scope** — this feature owns settings values + theme tokens; it does not store data (008) or apply routing (003). ✅
- **VIII. Testing** — settings/merge/import logic unit-tested; a11y + theme e2e. ✅

No violations.

## Project Structure

```text
src/game/settings/
├── schema.ts         # Settings type + defaults + version + merge/validate (pure, tested)
├── save-blob.ts      # export/import of the full save (validated, versioned, tested)
└── *.test.ts
src/ui/theme/
├── tokens.css        # Daylight + Night Tide token sets (CSS vars / @theme)
└── useTheme.ts       # resolve Daylight/Night/Auto → data-theme
src/ui/settings/
├── SettingsScreen.tsx
└── controls/         # Toggle, Slider, Segmented, Group (from the component kit)
```

**Structure Decision**: Settings values + the theme token *definitions* live in this feature (single source of truth); the App Shell only *applies* the resolved theme. The save blob logic sits here because Data/export-import is a Settings surface, but it round-trips through persistence (008).

## Design notes

- **Theme**: Night Tide is a *designed* palette (deep teal-navy ground, glowing water, coral held), not an inversion — token values come from the style guide's dark set. Auto uses `matchMedia('(prefers-color-scheme: dark)')`; the shell stamps `data-theme` and CSS variables switch.
- **Colorblind-safe**: adds a non-color cue to cell states (e.g., a texture/glyph on rock vs water) — a render flag consumed by `src/render`.
- **Save blob**: `{ version, settings, saves, journal }`; import validates version + shape, rejects otherwise, leaves current save intact (Constitution II).
- **Live apply**: settings are a reactive store; consumers subscribe. No "save" step needed beyond Done.

## Quickstart (validation)

- `npm run test` — defaults present for every field; merge tolerates partial/older objects; save-blob export→import round-trips; malformed import rejected; reset requires confirm flag.
- `npm run test:e2e` — change a control mapping and see it live in Gameplay; select Night Tide and assert dark tokens on multiple screens; enable colorblind-safe and assert a non-color cue on cells; Auto follows an emulated OS dark preference.
