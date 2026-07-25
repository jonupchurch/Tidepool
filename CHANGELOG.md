# Changelog

Dated log of **actual code/feature changes**, newest first. Process/setup work
isn't tracked here — see `STATUS.md` and the commit history. Will adopt
versioned release notes once Steam builds start.

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
