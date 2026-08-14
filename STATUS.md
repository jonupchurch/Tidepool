# Tidepool — Status

_Snapshot; updated each work session. Last updated: 2026-08-13._

## Current phase

**Shipping.** All fifteen features are built and merged, and **build 24479382
(`Tidepool 1.0.1`) is live on the `default` branch of Steam app 5037710** —
downloaded, installed and launched from the Steam client. What remains before
release is store-page process on the partner site, not code.

Features 010–015 landed after that build went up, so **the live Steam build does
not contain them.** They ship with the next upload.

## Built

Features 001–015, in build order, each specced and planned via Spec-Kit before
implementation. Per-feature detail is in `CHANGELOG.md`; this is the index.

| | Feature | |
|---|---|---|
| 001 | Puzzle engine | generation, solver, uniqueness oracle, difficulty rating |
| 002 | Gameplay board | Canvas renderer, marks, undo/redo, autosave |
| 003 | App shell | Home, Splash, Pause, nav host |
| 004 | Board modes | Endless stream, curated ladder, seed entry |
| 005 | Shore Journal | 12 creatures, discovery, lifetime stats |
| 006 | Settings & themes | Day/Night Tide, live settings, save export/import |
| 007 | Tutorial | How to play |
| 008 | Persistence | `platform/` seam, versioned schemas, migration |
| 009 | Desktop packaging | Tauri wrap, native saves, offline fonts, CI artifacts |
| 010 | Line annotations | `{n}` and `-n-` on edge numbers, and the solver technique for them |
| 011 | Perfect solves | clean-solve tracking, lifetime total, curated marks |
| 012 | Irregular shores | named silhouettes — atoll, crescent, wedge, shoal |
| 013 | Curated page two | 36 more boards, found by a re-runnable search |
| 014 | Ambient music | music channel, its own switch, measured loop points |
| 015 | Master volume | one level for both channels, on Home and Pause |

Plus, since: all 12 creature portraits, audio, the About screen, the curated hex
map, HiDPI rendering, a root error boundary, 29 achievements, and the SteamPipe
release pipeline. **823 unit tests + 32 e2e green.**

## Release — what's left

All on the Steamworks partner site:

- **Store page** — submit for review. Valve requires the page to be live **two
  weeks before the release date**, so this is the critical path, ahead of
  anything in this repo.
- **Content survey / age rating.**
- **Cloud** — config only, no code. Root `WinAppDataRoaming`, subdirectory
  `com.gravytraining.tidepool`, pattern `save.json`. See
  `scripts/release-steam.md`.
- Store art and pricing: **done.**

Uploading a new build is `npm run release:steam -- --user <account>`, then Set
Build Live on the partner site. Bump the version in **both** `package.json` and
`src-tauri/tauri.conf.json` — they drift silently.

## Decisions on record

- **Steam achievements are deferred to a post-launch patch.** The 29
  achievements work in-game off the save; Steam does not mirror them, and there
  is no `steamworks` crate in `Cargo.toml`. The blocker is not the Rust wiring
  but that Steam wants an achieved *and* unachieved icon for each — 58 icons and
  29 hand-entered definitions. Steam accepts achievements added after release,
  so this costs nothing to defer.
- **WebView2 is unresolved and is a real decision.** Steam cannot install it
  (not on the Common Redistributables list) and the bare exe runs no
  bootstrapper. Shipping on the Evergreen runtime being present is defensible
  and is the current behaviour; the alternative is a ~180 MB fixed runtime
  staged beside the exe. The failure mode on a machine without it is silent.
  Options and costs are in `scripts/release-steam.md`.
- **Code signing stays deferred** pending a CA. Not needed for Steam — the
  client writes depot files without a Mark-of-the-Web tag, so SmartScreen never
  fires. It only matters for direct downloads.
- **Linux/Steam Deck is opportunistic**, per 009's spec. CI builds the artifacts
  on `ubuntu-22.04`; shipping them means a second depot and verifying webkit2gtk
  resolves inside the Steam Linux Runtime.
- **"Driftwood Garden" is approved, loop included.** Jon listened on 2026-08-13
  and heard it wrap cleanly at 2:15. This was the only claim in 014/015 that a
  test could not make — the channel, switch, volume and loop-point handling are
  all covered against a fake Web Audio, but how it *sounds* needed ears. The
  seamless wrap also confirms the loop arithmetic in `src/audio/music.ts`
  (encoder delay 576 samples + end padding read from the file's own Xing/LAME
  header, trimmed only if the decoder hadn't already). Don't re-open either as
  an outstanding item.

## Known rough edges

- `screenshot-5.png` has the mouse cursor captured in it.
- The small and vertical capsules are now the wordmark on transparency rather
  than illustrated tiles, so those two slots are mostly empty space — most
  visible on the vertical capsule. The illustrated versions are kept beside them
  as `*-scene.png` if that reads wrong on the live store page. Neither has been
  uploaded to the partner site yet.

## Blockers

- None.
