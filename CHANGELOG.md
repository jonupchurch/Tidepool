# Changelog

Dated log of **actual code/feature changes**, newest first. Process/setup work
isn't tracked here — see `STATUS.md` and the commit history. Will adopt
versioned release notes once Steam builds start.

## 2026-07-25 — How to play, live settings + Night Tide, first sounds

### Added

- **How to play screen** (007), replacing the placeholder. The rules live in one
  place (`how-to-play-content`) and render twice — quietly in the rail beside the
  board, and as the menu screen — so the two can't drift apart. *Scope: this is
  the agreed descope of 007 — the rules as a reference screen, not the
  interactive step-by-step tutorial the spec describes.*
- **A way back to the dismissed rail.** Closing it was a one-way door with
  nothing left on screen to restore it; a small low-contrast "?" now takes its
  place, and the show/hide choice persists either way.
- **Night Tide, designed** (006 US2) — replaces the provisional dark tokens with
  a real palette: deep teal-navy ground, water that keeps its glow, coral held
  back as a signal colour. `useTheme` resolves Day / Night / Auto and keeps
  following the OS under Auto. A high-contrast axis layers on either theme.
- **Live settings** — a pure model (`game/settings.ts`) that resolves any
  persisted shape into a complete `Settings` (missing fields default, numbers
  clamp, unknown values are rejected), plus a reactive store that notifies
  synchronously so a change applies everywhere at once.
- **The first two sounds**: `water.mp3` (drip) and `rock.mp3` (stone drop), plus
  `npm run check:audio` — which events have a clip, and any file whose name isn't
  an event id and so can never play.

### Fixed

- **The first sound of every session was silently swallowed.** Clips only begin
  decoding when the audio context is created — on the very gesture that asks for
  the first sound — and `play` returned silently when the buffer wasn't ready. A
  play arriving mid-decode now fires once the buffer lands, unless the moment has
  passed (500ms). Measured in a real browser: two correct marks produced one
  sound before, two after.
- **Theme and mute were stored twice** (`shellPrefs` *and* the settings record)
  and could disagree. The settings record is now the single source of truth.
- **Gameplay read settings once at mount**, so a change mid-board never applied.
  It now reads the live store.

### Changed

- **There is no Settings screen.** Per decision, Home's mute + theme toggles are
  the whole surface and everything else takes its default. Removed with it: the
  Settings route, its Home entry, and the Pause overlay's Settings action — so
  US1 and US4 of spec 006 (grouped options; save export/import + reset) are not
  built. The model keeps the comfort/accessibility fields because gameplay reads
  them and they're where a future surface would plug in.
- **The OS `prefers-reduced-motion` is now honoured automatically**
  (`useEffectiveSettings`), so accessibility didn't leave with the screen. The
  setting can still force it on; the system preference alone is enough.
- Cell-size scaling (FR-004) is deliberately **not** offered: the board fits
  itself to the viewport, so scaling up needs pan/scroll to be usable. The field
  exists in the model, waiting on that.

### Verified

- **521 unit + 23 e2e** green; typecheck and build pass. New e2e covers the rail
  hiding, coming back, and the choice surviving a reload, plus How to play from
  Home. New unit tests cover settings resolution/merge, the store's live
  notification and persistence, theme resolution under Auto with no OS signal,
  and the first-sound regression.
- Note: **Vite doesn't reliably pick up files replaced in `public/` after it
  starts** — three portraits appeared missing in the browser while `check:art`
  read them fine from disk. Restart the dev server; that mismatch is the tell.

## 2026-07-25 — Creature art: all 12 portraits, discovered by convention

### Added

- **All 12 creature portraits.** The catalog's art is complete.
- **Art is found by convention** — `public/img/<id>.png`, matching how the audio
  scaffold discovers `<id>.mp3`. Nothing in `creatures.json` declares art, so a
  new portrait needs no catalog edit; a file that isn't there yet fails to load
  and falls back to the styled placeholder, so partial art is never a broken
  image (FR-008).
- **`npm run check:art`** — which creatures have a portrait, which are still
  placeholders, and which exceed the desktop-build budget. Reads PNG dimensions
  from the IHDR chunk, so it needs no image library.
- **Build-time portrait optimization.** Portraits are exported at full
  resolution (~1.5–2 MB) but render at 64px in the journal and 96px on the
  splash. A Vite plugin rewrites only the copies emitted into `dist/`, scaling
  the longest edge to 512px and recompressing — **20.9 MB → 1.4 MB**, verified
  against the production build with no visible difference. Source art is left
  exactly as exported. `sharp` loads lazily and a failure only warns: an
  optimization must never hard-fail a build.

### Notes

- `hermitcrab.png` was renamed to `hermit.png`. Art matches on creature **id**,
  and ids are baked into saved data (journal keys, curated `earnedCreatureId`),
  so the file moves rather than the id.
- **Rarity labels don't match observed frequency.** Sampling 288 generated
  boards: Nautilus ("Legendary", 15+ cells) appears on **74.7%** of boards
  because nearly every board has one sprawling pool, while Sea Urchin ("Rare",
  exactly 9) appears on **9.7%** — the true rarest in the game. The reward
  mapping is just `minSize` thresholds in `creatures.json`, so retuning is
  cheap, but it would reshuffle which creature existing saves earned. Deferred,
  not forgotten.

## 2026-07-25 — Correct cells lock; back to the map on completion

### Added

- **"Curated shores" on the completion panel** — finishing a curated board offers
  a step back to the coastline alongside Next board / Journal / Home, instead of
  routing through Home. The shell supplies the action only for boards launched
  from the ladder; an Endless board has no map to return to and the button stays
  absent (both covered by e2e).

### Changed

- **A correctly marked cell can no longer be changed by clicking** — neither
  cleared nor overwritten — so settled work can't be knocked out by a stray
  click (`PlaySession.isLocked`). Given clue cells count as locked too. Wrong
  marks stay fully editable; correcting one settles it. Undo/redo still reach
  everything: the lock is about clicks, not about rewriting history.

### Verified

- **489 unit + 21 e2e** green; typecheck passes. A new e2e settles one water and
  one rock cell, clicks each again with both buttons, and asserts nothing moved
  and no mistake was counted. Two existing tests set their state up by flipping a
  correct mark (breaking a completed pool; un-completing a solved board) — both
  now express the same invariant a way the rules still allow.

## 2026-07-25 — Curated shores: a 36-board ladder on a hex map

The curated set becomes the game's authored progression: six groups of six,
chained, mistake-tracked, and promoted to a first-class Home destination.

### Fixed

- **Chaining curated boards recorded only the first completion.** `curatedId`
  lived on the shell's launch entry, but "Next board" advanced the board *inside*
  `GameplayScreen` without telling the shell — so it stayed pinned to the entry
  you first selected and every later completion re-recorded that one. Worse, the
  boards you actually played came from the Endless stream, not the ladder.
  "Next board" now goes through the shell (`onNextBoard`), which walks the
  curated ladder and returns to the map off its end.
- **The TopBar reflowed the board mid-play.** The "⚠ N to fix" chip appearing
  changed the header's height, resizing the canvas and shifting every cell under
  the cursor — one mis-click begat more. The header is now fixed-height and
  non-wrapping.

### Added

- **36 curated boards** (was 8) in six groups — Shallows, Tide Pools, Kelp
  Forest, Coral Garden, Open Shoal, The Trench. Medium through the middle,
  escalating to Large at the end; difficulty never steps backwards. Every seed is
  verified to solve uniquely, guess-free, and rate *exactly* on-tier. Manifest v2
  gains a `groups` array (optional, so a v1 pack still renders).
- **The map is a hex of hexes of hexes** — six groups on a hex ring, each group a
  ring of six tiles, each tile a board. Every ring is hollow and its hole carries
  that ring's label: the group's name and band, the overall tally at the centre.
  Names wrap and centre inside the hex rather than truncating.
- **Curated mistake tracking.** Each entry keeps the *fewest* mistakes of any
  run, so replaying a board cleanly clears it for good and a sloppier replay
  never adds them back. A board still carrying mistakes wears a dashed coral ring
  (an SVG overlay — a CSS border would be cut away by the hex clip-path). Curated
  only: Endless boards show the live counter and store nothing.
- **Curated shores is a primary Home destination** with its own progress, no
  longer a secondary link.
- **A quiet how-to rail** left of the board: what a plain number means, `{n}` vs
  `-n-`, and what the edge numbers count. Dismissed for good via the settings
  seam. It's a layout sibling, not an overlay — as an overlay its close button
  sat on the canvas and swallowed clicks meant for cells.

### Verified

- **482 unit + 18 e2e** green; typecheck passes; all 36 boards pass the CI oracle
  gate. A new e2e chains three curated boards without returning to the map and
  asserts each records its own completion — the exact reported bug. Another
  fumbles a board, checks the mistake is recorded, replays it clean, and checks
  the record clears.
- Two dev-hook weaknesses fixed while chasing the above: cell centres and line
  labels are now getters (the board re-lays out on pane resize, so snapshots went
  stale), and `ready` is retired when a board starts loading (it stayed true
  across a board change, so e2e read the outgoing board's cells).
- Note: the **per-creature journal count already existed** (`journal.ts`
  increments on re-find; `CreatureCard` renders "Found ×N") — verified rather
  than rebuilt.

## 2026-07-25 — Row-total affordances, HUD counters, solved-board cleanup

Second playtest pass on the same session: make the margin totals self-explaining
and give the HUD the counters that were missing.

### Added

- **Direction dash on every row total** — a short stroke along that row's axis,
  so its direction reads at a glance without toggling the guide. Drawn on the
  *outer* side of the number (totals now sit snug to the board, and a dash must
  never stray over a hex — both enforced by test).
- **Right-click a total to strike it off** — greys it out as "satisfied";
  right-click again restores it. Independent of the guide toggle and of the
  swap-buttons setting. View-only, like guides: not persisted, resets per board.
- **Pools counter is back**, as its own counter — unambiguous now that water is
  counted in cells beside it.
- **Running error tally** (`session.errorsMade`) in the counter row, counted as
  wrong marks are placed. Distinct from the existing "⚠ N to fix" chip, which is
  the *outstanding* set and clears on correction; the tally never counts down.
  Undo/redo replays don't re-count it. In-memory only — not in the save record.

### Changed

- **Clue tiles get a darker outline** (`deepPool`, matching their numeral —
  `rock` on `driftwood` was near invisible).
- **Crowded totals move to the opposite end of their own row** rather than being
  pushed further out. A row total is equally true at either end, so this spreads
  labels across both margins instead of stacking them in one — and they stay
  snug (>80% sit right on the edge even with every line clued).
- **Cells are hit-tested before labels**, and the label target is kept inside its
  clearance from the board, so a snug label can't steal a mark from the edge hex.

### Fixed

- **Solving a board no longer leaves it resumable.** Completion now clears the
  in-progress record instead of saving it, so Home offers no "continue" for a
  finished board — and reopening the app can't land back on the completion panel.

### Verified

- **433 unit + 16 e2e** green; typecheck passes. New e2e cover right-click
  strike-off (independent of the guide toggle, never marks the board) and
  solve → Home → reload offering no resume. Confirmed by screenshot on a
  Large · Tricky board.

## 2026-07-25 — HUD counter in cells + unambiguous row totals

A playtest follow-up: the water counter was reporting a unit nobody was
reading it in, and the margin line totals didn't say which row they belonged to.

### Fixed

- **"1 pool left" with half the board unmarked** — the TopBar's water counter
  reported connected *pools* remaining while the stone counter reported *cells*.
  Pool sizes are lopsided (one Large board runs `[57,13,5,5,4,3,1]`), so finishing
  the small pools parked the readout at "1 pool left" with ~50 water cells still
  to mark. Now counts water cells (`waterRemaining`), mirroring `stonesRemaining`.
  Pool completion still drives creature reveals and the journal — it's just no
  longer the progress readout. This supersedes the 2026-07-24 note that the
  counters were "correct": each was self-consistent, but the mixed units made the
  pair unreadable.
- **Line totals ambiguous / overlapping** — totals were placed by pushing radially
  outward from the board centre, a direction unrelated to the row's own axis, so
  they drifted off their line and stacked at the corners. Each total is now
  anchored in the empty hex slot its row continues into, one step back along that
  row's own axis; collisions slide further out along the same axis, never
  sideways, so position alone identifies the row (`render/line-labels.ts`).
- **Labels rendering off-canvas** — they sit outside the board, which `fitLayout`
  reserved no room for. It now accepts extra points to fit; anchors resolve in
  axial space (scale-free) so they exist before a hex size does.

### Added

- **Click a total → a row guide** — clicking a line total draws a thin stroke down
  that row and tints the number; clicking again clears it. Guides accumulate,
  are view-only (never persisted), and reset with a new board.

### Verified

- 15 new unit tests (counter units, label collinearity/spacing/on-canvas fit,
  hit-testing, guide geometry) — full suite **425 unit + 14 e2e** green; typecheck
  passes. A new e2e drives real clicks through toggle-on → off → accumulate and
  asserts a label click never marks the board. Placement + guides confirmed by
  screenshot on a Large · Tricky board.
- Note for future work: **Calm boards carry no line clues at all** (the reducer
  strips them, since forced-count alone solves those boards). Line-total work must
  be exercised on Tricky/Deep.

## 2026-07-24 — Audio scaffold: drop-in SFX

Sound plumbing wired to every game event; silent until sound files are added.

### Added

- **Audio engine** (`src/audio/`) — a small Web Audio player (`getAudioEngine`)
  that decodes each present clip once and plays overlapping-safe SFX through a
  master gain (mute + volume honored from the 008 settings). Degrades to a silent
  no-op where Web Audio is unavailable (tests / SSR).
- **Build-time asset discovery** — sound files are auto-bundled from
  `src/assets/audio/` via `import.meta.glob` (no manifest, and no runtime 404s for
  files that don't exist yet). Drop `<id>.mp3` in and it's picked up on the next
  reload; the folder README maps each id → event.
- **Triggers** (`GameplayScreen`) — water/rock on a correct mark, `mistake` on a
  wrong one, `poolComplete`/`boardComplete` on reveals, and `undo`/`redo`. The
  audio context unlocks on the first pointer gesture (browser autoplay policy).

### Verified

- 6 audio unit tests (gain resolution, catalog, silent-fallback contract) — full
  suite **407 unit** green; typecheck + build pass; the gameplay e2e (zero console
  errors) confirms the wired path stays clean with no sound files present.

## 2026-07-24 — Board visuals: water/stone motifs + clearer mistake feedback

A playtest follow-up: legible tile art and an unmistakable error indicator.

### Added / Changed

- **Tile motifs** — water cells now sit on a pale-blue fill (`--color-water`)
  with a waves motif; stone cells show a boulder (`public/waves.svg` +
  `public/boulder.svg`, drawn on the Canvas via `render/sprites.ts`, clipped to
  the hex). Given clue cells keep their numerals.
- **Visible mistake flag** — a wrong mark now gets a bold coral ring on the board
  (not just the old faint tint) plus a "⚠ N to fix" chip in the TopBar, so a cell
  marked against the solution is obvious.

### Verified

- The pools/stones counters were reported as "not updating"; an e2e probe
  confirmed they are correct (pools → 0 once all water is marked, stones → 0 once
  all rocks are; a wrong mark moves neither — by design). The real gap was the
  near-invisible mistake feedback, now fixed. Full suite **398 unit + 13 e2e**
  green; typecheck + build pass; visuals confirmed via screenshot.

## 2026-07-24 — Shore Journal: creature collection (feature 005)

The low-pressure meta-progression: a warm field-guide of tide-pool creatures that
fills as you play. Resolves the mockups' creature/seed conflict with one shared
catalog.

### Added

- **Shared creature catalog** (`src/content/creatures.json` + `src/game/creatures.ts`)
  — the single source of creature identity (id, name, rarity, warm description,
  art) *and* the pool-size → creature reward mapping used by Gameplay's pools, so
  seed→creature and journal state can never disagree (FR-007). Grown to 12
  creatures along a Common→Legendary curve; `creatureForPool`/`creatureDef`/
  `CREATURES` preserved for existing consumers, `creatureUnlock` added.
- **Journal model** (`src/game/journal.ts`, pure) — `buildJournalView`
  (per-creature found/silhouette + "X of Y found"), `filterCards`
  (All/Found/Missing), and the discovery branch (`applyDiscovery`: first find sets
  first-found seed + count 1, a re-find increments and preserves the seed).
- **Persistence + recorder** — `journal-store.ts` adapts the 008 `SaveStore` seam
  (`journal` discoveries + `stats`); `recordDiscovery`/`recordBoardSolved`
  accumulate gentle lifetime totals (boards solved, pools filled, creatures
  found). Wired into Gameplay on forward pool completion (undo/redo can't inflate).
- **Shore Journal screen** (`src/ui/journal/`) — responsive card grid (found →
  art or a styled placeholder + name + rarity + description + discovery detail;
  unfound → labelled silhouette, FR-008), "X of Y found" header, warm empty +
  "shore's full" states, All/Found/Missing filter, and a display-only stats
  footer. Replaces the app-shell Journal placeholder.

### Verified

- 35 new journal unit tests (catalog + unlock partition, read model, filters,
  record branch, recorder through a store, card states, screen grid/filter/
  footer/empty/full) — full unit suite **397 green** — plus 2 new e2e
  (solve → Journal shows the creature found at this seed; discovery persists
  across reload). typecheck + build + the curated oracle pass. Full e2e **13
  green**. SC-001–SC-005 covered. Stat accrual (boards/pools) was wired at the
  gameplay→discovery boundary so the footer reflects real play, not zeros.

## 2026-07-24 — Board modes: Endless, Curated & Seed entry (feature 004)

Every way to start a board — all producing a seed handed to Gameplay. A thin,
pure `board-source` layer; determinism stays in the engine.

### Added

- **board-source layer** (`src/game/board-source/`, purity-guarded) — the
  `BoardRequest {seed,size,difficulty}` funnel (`toBoardParams`/`launchBoard`),
  the deterministic Endless stream (`nextSeed`/`createEndlessStream`,
  reproducible from `{startSeed,index}`), the total `parseSeedEntry` (gentle on
  bad input), and curated load/merge/gating.
- **Endless** — the shell's "Next board" now advances the stream via `nextSeed`
  (deterministic, shareable), and last size/difficulty persists (008).
- **Curated shores** (`src/content/curated.json` + `CuratedScreen`) — a bundled,
  oracle-blessed pack of 8 seeds along a Calm→Deep curve; ordered coastline with
  name, difficulty, copyable seed, and completion (earned creature) that persists
  via the 008 CuratedProgress namespace. Gentle optional gating (open by default).
- **Seed entry** (`SeedEntry`) — type/paste a seed to jump to that exact board;
  Home reuses it with inline gentle validation.
- **CI oracle gate** (`scripts/validate-curated.ts` + `npm run validate:curated`
  + `.github/workflows/ci.yml`) — every curated seed must be unique, guess-free,
  and on-tier or the build fails (SC-002 made structural).
- **GameplayScreen `onSolved` seam** — reports the largest-pool creature so the
  shell records curated completion.

### Verified

- 55 board-source/screen tests (incl. per-seed curated determinism + endless
  reproducibility) — full unit suite **353 green** — plus 6 new e2e (endless
  retarget + deterministic Next, curated select→solve→persist, seed valid/
  invalid). typecheck + build + the curated oracle pass. SC-001/002/003/004/005
  covered. (Standalone `EndlessPicker`/`ModeSelect` were consolidated into Home,
  which already hosts the mode controls, to avoid duplicate UX.)

## 2026-07-24 — App shell: Home, Splash & Pause (feature 003)

The connective tissue: a calm Home that routes into the game, a warm Splash, a
soft Pause, and the navigation between them. The app now has a real front door.

### Added

- **Navigation host** (`src/ui/shell/`) — `AppShell` hosts a pure bounded-history
  nav reducer (`nav.ts`), swaps screens with a calm cross-fade (reduced-motion
  gated), applies the theme app-wide via `data-theme`, and wires the Gameplay
  launch/resume/pause handoff. Warm placeholders stand in for the not-yet-built
  screens (Curated/Journal/Settings/Tutorial).
- **Home** (`HomeScreen.tsx`) — warm shoreline landing: primary Play at the
  last-used size/difficulty, the Endless size/difficulty picker, seed entry
  (jump to a friend's board), secondary entries, a "Continue your pool" resume
  card (shown iff a board is in progress), light stats, and mute + Day/Night
  toggles. Renders correctly with zero saved data.
- **Splash** (`SplashScreen.tsx`) — wordmark + crab + a themed pool loader + a
  rotating flavor tip; dismisses to Home when ready (no progress bar).
- **Pause** (`PauseOverlay.tsx`) — a soft scrim over the frozen board with
  Resume / New board / Restart / Settings / Home and a "board is saved" line.
- **Shell persistence adapter** (`shell-store.ts`) — prefs, last-used play,
  resume snapshot, and Home stats, all read/written through the 008 `SaveStore`
  seam (never `localStorage` directly). Provisional Night Tide tokens in
  `index.css` (final palette owned by 006).
- **GameplayScreen seam** — `resume` + `onPause` props so the shell controls
  fresh-vs-restore and opens Pause; board seed + in-flight autosave exposed on
  the dev hook for deterministic e2e.

### Verified

- 69 new tests (nav reducer, shell-store, Home, ResumeCard, Splash, Pause,
  toggles/theme, a11y sweep, token guard) — full unit suite **287 green** — plus
  Playwright e2e for cold-open → Play (SC-001), leave→reopen→resume (SC-002),
  Pause → Resume / Home-saved (SC-003), and Night persists across reload
  (SC-004). SC-005 (warm zero-state) covered in unit. typecheck + build pass.

## 2026-07-24 — Gameplay & board (feature 002)

The playable screen: render a board and deduce it. The full "one more pool" loop.

### Added

- **Play session** (`src/game/session.ts`) — pure `PlaySession` over an engine
  board: marks (left=water / right=rock, cycle/clear, given-cell guard),
  pool-completion reveal tracking (fires once, reverts on unmark, no duplicates),
  board-completion detection, undo/redo history, and serialize/restore to the
  008 InProgressBoard shape (only player state; board regenerates from the seed).
- **Pools + creatures + highlight** (`src/game/`) — connected-water-pool
  flood-fill via engine adjacency, deterministic pool-size → creature table
  (shared with 005), and hover-informs computation.
- **Off-thread generation** (`src/game/board-loader.ts` + `src/workers/`) — a Web
  Worker runs the engine so the UI never janks (sync fallback for tests).
- **Canvas renderer** (`src/render/`) — pointy-top hex layout + fit-to-viewport,
  theme-palette drawing, colorblind-safe cell styles, `{}`/`--` clue framing,
  line totals, hover highlight, pool creatures, and reduced-motion animations.
- **Gameplay screen** (`src/ui/gameplay/`) — the React host wiring pointer
  marks, hover highlight, pool-reward toast, the "The tide's in." completion
  panel (Next/Journal/Home), undo/redo (buttons + Ctrl+Z/Ctrl+Shift+Z),
  continuous autosave/restore through the 008 seam, next-board (004 seam
  placeholder), and a reduced-motion-gated mis-mark nudge. Mounted as the app root.

### Verified

- 79 new tests (game logic, render geometry/a11y, interaction perf) — full unit
  suite 218 green — plus a Playwright golden-path e2e in chromium: mark a board
  to completion → creature reveal → completion panel, zero console errors.
- SC-001 (pool reward once + reverts), SC-002 (complete iff all correct), SC-003
  (exact restore), SC-004 (hit-test hot path), SC-005 (no stuck state — every
  mark reversible) covered. typecheck + build pass (worker bundled).

## 2026-07-24 — Persistence & platform seam (feature 008)

The single storage/OS seam (`src/platform/`) every stateful feature will use —
a swappable `SaveStore` with a web backend now and a Tauri backend later.

### Added

- **`SaveStore` seam** (`save-store.ts`) — async `get`/`set`/`remove`/`exportAll`/
  `importAll` + namespaced versioned keys (`tp:v{N}:{namespace}`) + typed
  per-namespace accessors that apply defaults, validation, and migration.
- **Schemas** (`schemas.ts`) — versioned record shapes for the seven namespaces
  (in-progress board, settings, journal, stats, curated progress, onboarding,
  shell prefs) with default factories + shape validators; `SaveBlob` type.
- **Web backend** (`web-backend.ts`) — localStorage for small records, IndexedDB
  (idb-keyval) for the in-progress board; microtask-coalesced writes (autosave
  debounce, last-write-wins); instant reads via an in-memory cache; graceful
  quota handling.
- **Memory backend** (`memory-backend.ts`) — for tests + the disabled-storage
  fallback; a reusable contract harness proves both backends interchangeable.
- **Migration** (`migrate.ts`) — per-namespace forward migration; newer-version
  records refused and preserved, never corrupted.
- **Export/import** (`blob.ts`) — whole-save round-trip; malformed/newer blobs
  rejected atomically with current data intact.
- **Backend selection** (`index.ts`) — web when storage works, in-memory
  fallback otherwise; documented Tauri seam for feature 009.

### Verified

- 53 platform tests green (contract on both backends, restart survival,
  in-progress-board round-trip via the engine, export/import, migration,
  degradation) + the SC-002 scan (no storage/OS calls outside `src/platform`).
  Full suite 159 green; typecheck + build pass.
- In-progress boards store only `{ request, marks, revealed }` — the board is
  regenerated from the seed via the engine (tiny, drift-proof saves).

## 2026-07-24 — Puzzle engine (feature 001)

The deterministic core (`src/core/`) that produces and validates every board.

### Added

- **Seeded RNG** (`rng.ts`) — portable `cyrb128` + `sfc32`, integer-stable across
  JS engines; no ambient randomness (Constitution XI).
- **Hex geometry** (`hex.ts`) — axial pointy-top coords, a fixed 6-neighbour ring
  order (load-bearing for connectivity clues), the 3 line axes, and the
  present-cell region generator (topology as data).
- **Board model + clues** (`board.ts`, `clues.ts`) — adjacency counts, local
  Hexcells-style `{}`/`--` connectivity from the ring, and line/edge totals.
- **Solver / oracle / rater** (`techniques.ts`, `solver.ts`, `difficulty.ts`) — a
  fixpoint technique catalog (forced-count, line-total, connectivity,
  subset-overlap) that proves guess-free solvability + derives a Calm/Tricky/Deep
  rating, plus an independent bounded backtracking uniqueness counter.
- **Clue reduction** (`reduce.ts`) — seeded greedy reduction to a minimal,
  guess-free clue set, gated per difficulty tier.
- **Generation pipeline** (`generate.ts`) — seed → layout → clues → verify →
  reduce → rate, advancing through seed-derived candidates until the requested
  tier is met (else the closest, honestly rated).
- **Serialization** (`serialize.ts`) — canonical board form (round-trips
  deep-equal) + `WORD-NNNN` seed codes.
- **Public API** (`index.ts`) — `generateBoard`, `solve`, `serializeBoard` /
  `deserializeBoard`, `seedToRng` / `nextInt`, `formatSeed` / `parseSeed`.

### Verified

- 106 unit/contract tests green (Vitest); `typecheck` + `build` pass.
- Determinism (SC-001), 100% solvable + unique (SC-002), minimal clue sets
  (SC-003), 100% tier-match on the sampled batch (SC-004, target ≥95%), and a
  Large (~169-cell) board generates + verifies in well under the 2 s budget
  (SC-005, ~0.02–0.25 s observed).
