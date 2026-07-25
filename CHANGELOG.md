# Changelog

Dated log of **actual code/feature changes**, newest first. Process/setup work
isn't tracked here — see `STATUS.md` and the commit history. Will adopt
versioned release notes once Steam builds start.

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
