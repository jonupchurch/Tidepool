# Implementation Plan: Desktop Packaging — Tauri + Steam

**Branch**: `009-desktop-packaging` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

## Summary

Wrap the completed Vite/React web build in **Tauri** to ship a native Steam binary. Add a Tauri backend for the platform seam (native storage) and a thin Steam layer (achievements + Auto-Cloud). Self-host fonts/assets for offline. Set up a repeatable build + SteamPipe upload. No gameplay code changes — it's a wrap.

## Technical Context

**Language/Version**: TypeScript (existing app) + **Rust** (Tauri shell). Requires the Rust toolchain (new prerequisite).

**Primary Dependencies**: Tauri; a Steamworks binding (Rust `steamworks` crate exposed via Tauri commands, or a JS binding); the existing `SaveStore` interface (008).

**Storage**: Native file storage via Tauri (implements `SaveStore`) + Steam Auto-Cloud file patterns.

**Testing**: Manual/CI build verification (binary launches, offline play); Steam features validated in a Steam test environment; a check that the web build remains buildable + unaffected. Existing Vitest/Playwright suites still run against the web build.

**Target Platform**: Windows (primary), macOS, Linux/Steam Deck (opportunistic). Tauri uses the OS webview (WebView2 / WKWebView / webkitgtk).

**Performance Goals**: Small binary (~10–20 MB + system webview); instant launch; identical runtime perf to web.

**Constraints**: Web build stays first-class + unaffected (FR-009); overlay not relied upon; graceful degradation with Steam absent.

**Scale/Scope**: One Tauri project + one native `SaveStore` backend + a small Steam layer + a release pipeline.

## Constitution Check

- **III. Conventions** — Steam/native code confined to `src-tauri/` + the platform seam; no leakage into game/ui (stack pack rule). ✅
- **IV. Scope** — packaging + native backend + Steam only; zero gameplay change. ✅
- **VIII. Testing** — build/launch/offline verified; Steam features tested in the Steam env; web suites continue to guard the game. ✅
- **XI. Determinism** — unaffected; the engine is unchanged and still runs in the webview/worker. ✅

No violations.

## Project Structure

```text
src-tauri/                 # Tauri (Rust) shell — gitignored build output under target/
├── tauri.conf.json        # window, bundling, allowlist, asset config
├── Cargo.toml
└── src/
    ├── main.rs            # app entry
    └── steam.rs           # Steamworks: achievements, presence; Auto-Cloud is file-pattern config
src/platform/
└── tauri-backend.ts       # SaveStore impl over Tauri fs/commands (selected by index.ts on desktop)
public/fonts/              # self-hosted Bricolage + Nunito (replaces Google Fonts <link>)
scripts/
└── release-steam.md/.ts   # build + SteamPipe upload steps
```

**Structure Decision**: A standard Tauri layout wrapping the existing Vite front end. The only front-end change is swapping the Google Fonts `<link>` for self-hosted fonts and letting `src/platform/index.ts` select `tauri-backend` when running under Tauri. Everything else is the same bundle. Steam lives in `src-tauri/` (Rust) and behind the seam.

## Design notes

- **Backend selection**: `src/platform/index.ts` detects the Tauri runtime and picks `tauri-backend`; browser keeps `web-backend`. Same `SaveStore` contract (008), so no consumer changes (FR-003).
- **Achievements**: `AchievementMap` ties game events (first creature, N boards solved, all creatures, first Deep board, etc.) to Steam IDs; unlock calls go through the native layer, no-op when Steam is absent.
- **Cloud saves**: Steam **Auto-Cloud** (file-pattern config in the partner site) syncs the save directory — near-zero code. App-level Cloud API only if finer control is later needed.
- **Fonts/offline**: bundle Bricolage + Nunito under `public/fonts` with `@font-face`; remove the external `<link>` (also fixes the stack-pack follow-up). Verify zero network requests at runtime.
- **Overlay**: documented as non-functional for a webview app; nothing depends on it.
- **Prerequisite**: install the Rust toolchain before this phase; add Steam partner app/depot IDs.

## Quickstart (validation)

- Build: `npm run tauri build` (after `tauri` is added) → native binary; launch it and play a board **offline**.
- Saves: make progress, relaunch the binary → restored via `tauri-backend`; confirm no game/ui diffs enabled it.
- Steam (test env): trigger an achievement → unlocks; second machine → Auto-Cloud restores the save.
- Web unaffected: `npm run build` + Playwright still green against the web build.
- Release: run the SteamPipe upload script → versioned build in the depot.
