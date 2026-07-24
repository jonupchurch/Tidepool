# Tidepools — Design & Build Brief

A context pack for fleshing out **Tidepools**, a cozy, logic-based tide-pool puzzle game in the spirit of Hexcells and Cross Set. This document is written to be used piece by piece: each major section is a self-contained prompt you can paste into Claude Design (or any design/codegen tool) to generate the brand, the visual style, and each individual screen. Copy the section you need; they're written to stand alone.

**Locked decisions (from the brief):**
- **Aesthetic:** Cozy illustrated — hand-drawn tide-pool creatures that appear as you solve.
- **Structure:** Primarily endless discrete boards (an infinite stream of small procedurally generated pools), **plus a set of curated levels** (a hand-tuned intro/difficulty-curve pack). Everything is **deterministic and seed-based** — every board, curated or generated, is defined by a seed so it's reproducible and shareable.
- **Platform:** Desktop-first web (mouse + hover), responsive-friendly but optimized for larger screens.
- **Stack:** Next.js + TypeScript, hostable on Vercel. Optional Rust→WASM engine for generation/solving (not required for v1).

---

## 1. The Game — Core Concept & Rules

**One-line pitch:** A calm, no-timer deduction game where you read the shoreline's clues to figure out which cells are submerged tide pools and which are exposed rock — and little creatures come to life in the pools you solve.

**The fantasy:** You're reading a stretch of rocky coast at low tide. Some outcrops are visible; from them you can deduce where the water sits. Fill in the pools correctly and the shore comes alive.

**Structure — how you play it:** Two ways in, one engine underneath.
- **Curated shores:** a hand-tuned set of boards with a gentle difficulty curve, for onboarding and for players who want a designed experience (like a Hexcells campaign). Each curated board is just a fixed seed the designer picked and blessed.
- **Endless tide:** an infinite stream of procedurally generated boards at a chosen size/difficulty, for idle "one more pool" play.
- **Everything is a seed.** Every board — curated or endless — is fully determined by a seed. The same seed always produces the same board on any machine. This makes boards reproducible, testable, shareable ("try seed `CORAL-4417`"), and lets curated packs be authored simply by hand-picking good seeds. There is no hidden randomness at play time; the puzzle is 100% deterministic and logic-solvable.

### Board
- A grid of **hexagonal cells** (hex reads as more organic than squares and echoes Hexcells' feel). Each cell is one of two hidden states you deduce:
  - **Water** (submerged tide pool) — the cells you're finding.
  - **Rock** (exposed) — the cells you rule out.
- The player marks each cell as water or rock. Left-click = water, right-click = rock (configurable). Marking is free and reversible; there is no penalty loop.

### Clues (all deterministic — every board has exactly one solution reachable by pure logic, no guessing)
- **Rock number cells:** some rock cells are pre-revealed and show a number = how many of their (up to 6) neighbors are water.
- **Water number cells:** occasionally a water cell shows a number = water cells among its neighbors, for extra deduction paths.
- **Connectivity clues (the Tidepools signature):** a number can be annotated to describe how the counted water cells are grouped —
  - `{n}` (bracketed) = those water cells all belong to **one connected pool**.
  - `-n-` (dashed) = those water cells are **split across separate pools** (not all touching).
  - This is the mechanic that gives the game its identity: "pools" are connected bodies of water, and reasoning about connectivity is the fun. (Directly analogous to Hexcells' connected/disconnected clue notation, re-themed as tide pools.)
- **Edge / line totals:** along the border, a number projects down a row or diagonal = total water cells in that line. These are the workhorse clues that make bigger boards tractable.

### Difficulty levers (for the generator)
- Board size (small ~30 cells → large ~150 cells).
- Density of pre-revealed clues (fewer clues = harder).
- Whether connectivity and line-total clues are present.
- The *depth* of deduction required (naked singles only → contradiction chains). Rate difficulty by which techniques the solver needs.

### The reward loop (cozy illustrated payoff)
- When a pool is **fully and correctly resolved**, it gently animates: water shimmers in, and a small hand-drawn creature appears — a crab, anemone, starfish, snail, limpet, or urchin. Bigger pools get bigger or rarer critters.
- No score, no stars required — the creatures *are* the reward. Optional: a "shore journal" that logs which creatures you've discovered across all boards (a light meta-collection to pull players back).

### Feel / pillars (hold these for every design decision)
- **Low cost per move.** Every click is a tiny, safe, reversible commitment.
- **No timer, no fail spiral.** You can walk away mid-board and return to the exact state.
- **Endless supply.** There is always "one more pool."
- **Quiet, warm, tactile.** Soft sounds, gentle motion, nothing urgent.

---

## 2. Brand Identity — Prompt

> **Use this to generate the brand: logo, name treatment, tone, and mascot direction.**

Create a brand identity for **Tidepools**, a cozy logic-puzzle game for desktop web. The mood is warm, calm, and inviting — think a quiet morning at a rocky beach at low tide, a mug of tea, no rush. It should feel hand-made and charming, not corporate or slick.

- **Name:** "Tidepools" (one word). Wordmark should feel hand-lettered or set in a rounded, friendly display face, with a subtle watery or pooled detail (e.g., the "oo" as two little pools, or a soft ripple beneath the word).
- **Mascot / motif:** a small, endearing tide-pool creature — a hermit crab is the front-runner — used as an icon/favicon and as a friendly presence on empty states and loading screens. Secondary creatures: anemone, starfish, snail, urchin, limpet.
- **Voice & tone:** gentle, encouraging, unhurried, lightly whimsical. Never gamer-hype, never stern. Copy examples: "Take your time." · "The tide's out — see what's hiding." · "Nicely done. Something moved in."
- **Feel words:** cozy, tactile, watercolor, low-tide, hand-drawn, serene, tidy-satisfying.
- **Avoid:** neon, aggressive gradients, competitive/esports styling, dark UI as default (offer dark mode, but the brand's home is warm daylight).

Deliver: primary wordmark, app icon/favicon (hermit crab), a one-line tagline, and a short brand voice guide (3–4 dos and don'ts with example copy).

---

## 3. Visual Style — Prompt

> **Use this to generate the design system: palette, typography, illustration style, component look.**

Design a cohesive visual style system for **Tidepools** (cozy illustrated, desktop-first web game, Next.js).

**Illustration style:** soft hand-drawn / gentle watercolor with visible warmth — rounded organic edges, subtle paper or wet-sand texture, no hard outlines. Creatures are cute but not cartoonish-loud; picture children's-book-tide-pool-field-guide.

**Palette (warm daylight primary; these are starting points, refine for contrast/accessibility):**
- Wet sand / background: `#F3E9D8`
- Driftwood (secondary surface): `#E4D3B8`
- Tide blue (water cells): `#5FA8C4` with a lighter fill `#9FD1E0`
- Deep pool (accent / hover): `#2E7A96`
- Sea-glass green (secondary accent): `#8FC0A9`
- Coral (highlight / celebratory): `#F08A6B`
- Rock / exposed cell: `#C9B89A` → `#A8926E` (warm taupe, clearly distinct from water)
- Foam / text-on-dark & UI whites: `#FBF7EF`
- Ink (primary text): `#3B3226` (soft warm near-black, not pure black)

**Dark mode ("night tide," optional but designed):** deep teal-navy background `#152A32`, water cells glow softly, sand tones become muted slate, coral stays as the warm accent. Should feel like a moonlit shore, still calm.

**Typography:** a rounded, friendly sans for all UI and clue numbers (candidates: Fredoka, Quicksand, Nunito, Baloo 2). Clue numbers must be highly legible at small sizes and inside hex cells. A hand-lettered or soft display face for the logo and big headers only.

**Cells & board:** hexagonal cells with soft rounded corners and a slight inner shadow so they feel like tactile tiles you could press. Clear, calm visual language:
- Unknown cell: neutral driftwood tile.
- Marked water: tide-blue fill with a faint ripple/shimmer.
- Marked rock: warm taupe with a subtle pebble texture.
- Clue cell: number centered; connectivity clues shown with `{ }` or `– –` framing the number.
- Hover (desktop): gentle lift + slightly deeper edge; cursor feels magnetic to cell centers.

**Motion:** everything eases slowly (200–400ms, soft ease-out). Water fills with a ripple; creatures fade/hop in. Nothing snaps or flashes. Respect `prefers-reduced-motion`.

**Component kit to define:** buttons (primary coral, secondary sea-glass, ghost), toggles/switches, sliders, segmented controls (for difficulty/size), modal/overlay panels (rounded, paper-textured), tooltips, the board container, and the creature "journal" card.

Deliver: color tokens (light + dark), type scale, cell state visuals, button and control styles, and 2–3 sample creature illustrations (hermit crab, anemone, starfish).

---

## 4. Screens

Each screen below is written as its own prompt. Feed them one at a time. They share the brand (§2) and style (§3) — reference those tokens.

### 4.1 Loading / Splash Screen — Prompt

> Design the loading screen for **Tidepools**.

A warm, calm splash on a wet-sand background. Centered wordmark "Tidepools" with the hermit-crab icon. Beneath it, a **hand-drawn loading indicator that fits the theme** — e.g., a tide slowly filling a little pool from empty to full, or the hermit crab ambling across the sand, or ripples expanding. Include a rotating gentle tip/flavor line ("Numbers count the water next door." · "Pools like to hold hands — that's what the { } means." · "There's always a right answer. Take your time."). No progress percentages needed unless load is long; if shown, style it as a rising waterline. First-load version may include a soft one-line "made with care" credit. Keep it quiet — this sets the unhurried tone before the player even starts.

### 4.2 Home / Main Menu — Prompt

> Design the home screen for **Tidepools** (desktop-first).

An inviting landing scene: a subtly illustrated stretch of shoreline as the backdrop (parallax-friendly but calm). The wordmark sits top-center or upper-left. Primary actions as large, soft buttons:
- **Play** (big coral primary) — drops into an endless board at the player's last difficulty.
- **Curated Shores** — opens the hand-tuned level pack: a calm list/map of designed boards with a difficulty curve and simple completion marks. This is the "campaign" entry point.
- **Endless Tide** / difficulty picker — a segmented control or small panel for board **size** (Small / Medium / Large) and **difficulty** (Calm / Tricky / Deep). A lightweight preferences strip, not a level grid.
- **Enter a Seed** — a small field to type or paste a seed and jump straight to that exact board (supports sharing boards with friends). Since everything is seeded, this is a first-class feature, not a hidden one.
- **Shore Journal** — opens the creature collection (see 4.6).
- **Settings** (gear).
- **How to Play** (a soft ghost link).
Show a small "boards solved" tally and maybe the most recent creature discovered, as a gentle pull. A resume affordance ("Continue your pool") if a board is in progress. Bottom corner: mute toggle, dark-mode toggle. Everything breathes — lots of soft space, no clutter.

### 4.3 Gameplay Screen — Prompt

> Design the core gameplay screen for **Tidepools** (desktop, mouse + hover).

The board is the hero — a hexagonal grid centered in the viewport on a wet-sand canvas. Around it:
- **Top bar (minimal):** small board label/seed, a subtle progress indicator (e.g., "pools found: 3/5" or a filling waterline), a pause/menu button, and undo/redo. No timer displayed (optional stopwatch only if the player opts in via settings).
- **The board:** hex cells per the style system. Left-click marks **water**, right-click marks **rock**; clue cells show numbers with `{ }` / `– –` connectivity framing; edge/line totals sit just outside the relevant rows/diagonals. On hover, the target cell lifts gently and any cell/line it directly informs can softly highlight (a teaching aid; make it toggleable). Mis-marks are allowed and simply correctable — if you want a soft-feedback mode, an incorrect mark can give a gentle nudge (a faint ripple of doubt) rather than a punishing error.
- **Reward moment:** when a pool completes, water ripples in and a creature appears in place with a soft sound. Keep it delightful but brief.
- **Board complete:** the whole shore settles, creatures are all present, and a calm panel slides up: "The tide's in. [Next board] [Journal] [Home]." Immediately offer the next board to preserve the "one more" rhythm.
- **Idle-friendly:** state auto-saves continuously; leaving and returning restores the exact board. No move is ever lost.

Provide: default state, a mid-solve state (some water/rock marked, hover highlight active), the pool-complete micro-moment, and the board-complete panel.

### 4.4 Settings — Prompt

> Design the settings panel for **Tidepools** (rounded modal or full page).

Grouped, calm, few options — respect the low-key tone. Suggested groups:
- **Sound:** master volume slider, SFX toggle, ambient shore/waves toggle (soft loop), music toggle.
- **Visuals:** theme (Daylight / Night Tide / Auto), reduce motion, high-contrast cell mode, colorblind-safe water/rock palette, cell size scale.
- **Controls:** swap left/right click mapping, tap-to-cycle mode (unknown→water→rock) for trackpad/touch, confirm-before-clear.
- **Assist:** show hover highlight of related clues (on/off), gentle mis-mark feedback (on/off), show line-total helper counts (on/off). Frame these as comfort options, never "easy mode" shaming.
- **Play:** default board size & difficulty, optional stopwatch display, reset progress (with a soft confirm).
- **Data:** since this is client-side by default, note local save; optional "export/import save" for moving between machines.
Layout as tidy sections with rounded toggles/sliders from the component kit. One primary "Done" button; changes apply live.

### 4.5 Pause / In-Board Menu — Prompt

> Design the pause overlay shown from the gameplay top bar.

A soft translucent scrim over the frozen board with a small centered panel: **Resume**, **New Board**, **Restart this board**, **Settings**, **Home**. Include a tiny reassurance line ("Your board is saved."). Keep it light — pausing here is really just "step away," so it should feel safe and frictionless.

### 4.6 Shore Journal (Creature Collection) — Prompt

> Design the "Shore Journal" collection screen.

A gentle field-guide of the tide-pool creatures the player has discovered across all boards. Grid of illustrated cards; undiscovered creatures shown as faint silhouettes ("not yet found"). Each discovered card: creature illustration, a warm one-line description, and maybe how many times/where first found. This is the light meta-progression that gives endless play a sense of accumulation without adding pressure. Optional gentle stats footer (boards solved, pools filled, creatures found).

### 4.8 Curated Shores (Level Pack) — Prompt

> Design the curated level-pack screen for **Tidepools**.

A calm, browsable set of hand-tuned boards arranged along a gentle difficulty curve — imagine walking down a coastline, each stop a designed puzzle. Present as a soft vertical list or a light illustrated map/path (not a busy grid of stars). Each entry shows a name, a small difficulty marker (Calm / Tricky / Deep), a completion state (uncompleted / solved, with the creature earned peeking out), and — because everything is seeded — the board's seed shown subtly so players know these are shareable, reproducible boards. Locking is optional and gentle (a soft "solve a couple more to unlock the next stretch") or fully open; keep the tone unhurried. Entry from here loads that exact seed. This is the authored counterpart to Endless Tide.

### 4.7 How to Play / Tutorial — Prompt

> Design a short, optional how-to-play flow.

Two or three calm illustrated cards, or better, an interactive first board that introduces one concept at a time: (1) rock numbers count neighboring water, (2) mark water vs rock, (3) `{ }` means one connected pool / `– –` means separate pools, (4) edge totals. Teach by doing on a tiny guaranteed-solvable board rather than walls of text. Skippable, revisitable from the menu.

---

## 5. Technical Context — for the Build

> Reference notes so generated code targets the right stack. Not a screen prompt.

**Framework & hosting**
- **Next.js (App Router) + TypeScript**, deployed on **Vercel**. The game is fully client-side playable; no backend is required for v1.
- Rendering: prefer **Canvas** (or a lightweight WebGL layer) for the hex board so large boards stay smooth; use React/DOM for all chrome (menus, settings, journal). SVG is acceptable for small boards but Canvas scales better to ~150 cells with hover/animation.
- State/persistence: **localStorage** (or IndexedDB) for save state, settings, and journal — this is what makes "walk away and come back" work with zero server. Offer export/import of the save blob for cross-device.

**Seeds are the backbone (design this in from day one)**
- A **seed fully determines a board.** Seed → seeded RNG → layout → clues → reduction, all deterministic, so the same seed yields the identical board on every machine, every time. No wall-clock or ambient randomness anywhere in generation or play.
- This one decision gives you, for free: **curated packs** (just a blessed list of good seeds), **endless mode** (advance the seed), **shareable boards** ("play seed `CORAL-4417`"), **reproducible bug reports**, and a **test oracle** (regenerate any board deterministically in CI).
- Make seeds human-friendly where they're surfaced (e.g., short word-number codes) but store the full seed + difficulty/size params so a board is unambiguously reconstructable. Curated levels = a small JSON manifest of `{ name, seed, size, difficulty, ordering }`.

**The engine (the important part)**
- **Deterministic generation with a guaranteed unique solution.** The proven pattern:
  1. Generate a candidate water/rock layout (seeded RNG — reproducible and shareable by seed).
  2. Compute all clue values (neighbor counts, connectivity `{ }`/`– –`, line totals).
  3. Run a **logic solver** that only uses human-style deduction techniques (naked singles, line-total constraints, connectivity contradictions, etc.).
  4. **Reduce clues:** remove pre-revealed clues one at a time, keeping a clue only if the solver can *still* reach a unique solution without it. This yields a minimal, guess-free board.
  5. **Rate difficulty** by which techniques the solver had to use and how deep the chains went.
- Keep generator, solver, and renderer as separate modules. The solver doubles as your difficulty rater and your test oracle.
- **Rust→WASM is optional.** Pure TypeScript is fine for board sizes in this range and keeps the build simple on Vercel. Reach for a Rust/WASM core only if you later want very large boards, heavy batch pre-generation, or the solver becomes a bottleneck — the clean module split means you can swap the TS solver for a WASM one without touching the UI. Recommend shipping v1 in TypeScript.
- Consider **pre-generating** a pool of boards per difficulty at build time (or on a simple serverless route) and/or generating on the client in a **Web Worker** so generation never blocks the UI.

**Accessibility & polish**
- Full keyboard navigation of the board, `prefers-reduced-motion` and `prefers-color-scheme` support, colorblind-safe water/rock distinction (not color alone — use texture/icon too), and legible clue numerals at small sizes.

---

## 6. How to Use This Pack

1. **Brand first** — paste §2 to establish name treatment, hermit-crab mascot, tagline, voice.
2. **Then style** — paste §3 to lock palette, type, cell visuals, and the component kit.
3. **Then screens** — paste §4.1–4.7 one at a time, referencing the style tokens, in roughly this order: Loading → Home → Gameplay → Settings → Pause → Journal → Tutorial.
4. **Then build** — hand §1 (rules) + §5 (tech) to the codegen step so the engine and screens match. Build the solver/generator early and test it hard; it's the load-bearing wall of the whole game.

*Working title "Tidepools" throughout — swap freely if a better name surfaces during branding.*
