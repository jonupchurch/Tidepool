# Tidepool — Status

_Snapshot; updated each work session. Last updated: 2026-08-17._

## Current phase

**Shipping.** All nineteen features are built and merged.

**Live on `default`: build 24786984 (`Tidepool 1.3.0`)** — every feature
through 019, promoted 2026-08-17.

**`Tidepool 1.3.1` is being prepared** — hover text on the Home glyph row, so
the sound-effects drop says what it is.

**`Tidepool 1.2.1` (build 24766604) was never promoted and is now skipped.** It
was uploaded 2026-08-16 with feature 017 and superseded before it went live, so
no player ever ran it. 1.3.0 carried its contents forward — players moved from
1.2.0 across three releases at once: 017's effects switch, 018's even/odd marks,
and 019's framed forms.

Release history: 1.0.1 (24479382) → 1.1.0 (24743146, features 010–015) → 1.2.0
(24766362, feature 016 + three bug fixes) → 1.2.1 (24766604, feature 017,
uploaded but skipped) → **1.3.0 (24786984, features 018–019, LIVE)** → 1.3.1
(hover text, in preparation).

`setlive` is deliberately empty in the VDF, so an upload never reaches players
on its own — promotion is always a separate step on the partner site
(Builds → Set Build Live).

## Built

Features 001–019, in build order. 001–015 and 018–019 were each specced and
planned via Spec-Kit before implementation; 016 and 017 were scoped with a
mini-spec, and 016 was written up afterwards. Per-feature detail is in `CHANGELOG.md`; this is the index.

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
| 016 | Varied shores | the Endless tide gains the silhouettes and the `{n}`/`-n-` edge numbers |
| 017 | Effects switch | the two sound channels are independently silenceable |
| 018 | Even & odd clues | a stone may show `+` / `\|` for the parity of its water, withholding the count |
| 019 | Framed parity | the marks reach the edge numbers, and take `{}` / `--`: `{+}`, `-+-`, `{\|}`, `-\|-` |

Plus, since: all 12 creature portraits, audio, the About screen, the curated hex
map, HiDPI rendering, a root error boundary, 29 achievements, and the SteamPipe
release pipeline. **986 unit tests + 45 e2e green.**

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
Build Live on the partner site. Bump the version in **all five** places first —
`package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`,
`src/ui/about/about.ts` and `src/platform/schemas.ts`. They drift silently, but
`npm run test` pins them to each other, so a missed one fails the suite rather
than shipping. Full runbook: `scripts/release-steam.md`.

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
- **No Settings screen; the switches are the settings.** Feature 006 shipped its
  *model* — `resolveSettings`, the persisted record, live application — but never
  a screen, so `sound.ambient` and `sound.sfx` are levels nothing can reach and
  several comfort/control fields are likewise unreachable. Surfaced 2026-08-16
  when the effects switch (017) was added. Jon's call: **the pair of channel
  switches plus the master volume slider is enough**; balancing the two channels
  against each other is not worth a screen. Revisit only if a player asks for it.

- **Code signing stays deferred** pending a CA. Not needed for Steam — the
  client writes depot files without a Mark-of-the-Web tag, so SmartScreen never
  fires. It only matters for direct downloads.
- **Linux/Steam Deck is opportunistic**, per 009's spec. CI builds the artifacts
  on `ubuntu-22.04`; shipping them means a second depot and verifying webkit2gtk
  resolves inside the Steam Linux Runtime.
- **"Driftwood Garden" is approved, and the loop is now an inner region.** Jon
  approved the music on 2026-08-13 but found the wrap an abrupt switch. The
  cause was the composition, not the container: measured from the WAV master the
  track has a 3.55 s fade-in and a 1.34 s fade-out, so looping the whole file
  fell to **complete silence for about a second** at every wrap (an 86 dB hole).
  The engine now loops **12.54 s → 124.54 s** — 112 s, exactly 14 of the track's
  8 s phrases — with a 4 s crossfade baked into the buffer, so the join is
  sample-continuous and the level never drops below a normal musical minimum.
  **Jon confirmed by ear on 2026-08-13 that it now wraps seamlessly.** The intro
  is heard once per session; the outro is never heard, which is correct for a
  bed. A track authored to loop needs no entry in `LOOP_REGIONS`.

## Known rough edges

- `screenshot-5.png` has the mouse cursor captured in it.
- The small and vertical capsules are now the wordmark on transparency rather
  than illustrated tiles, so those two slots are mostly empty space — most
  visible on the vertical capsule. The illustrated versions are kept beside them
  as `*-scene.png` if that reads wrong on the live store page. Neither has been
  uploaded to the partner site yet.

## Blockers

- None.
