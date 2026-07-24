---
description: "Task list for the Desktop Packaging (Tauri + Steam) feature"
---

# Tasks: Desktop Packaging — Tauri + Steam

**Input**: Design documents from `specs/009-desktop-packaging/`

**Prerequisites**: plan.md, spec.md; cross-feature: the `SaveStore` seam from
`specs/008-persistence-platform/` (implemented natively here) and a complete
web build of the gameplay features (`specs/001`–`007`). External: the Rust/Tauri
toolchain and a Steam partner account + app/depot.

**Tests**: INCLUDED (adapted for packaging). Much of this phase is manual/CI
build verification — the tasks below cover: the native binary launching and
playing **offline**; a scan/test that the **web build stays buildable and
unaffected** (FR-009); the existing Vitest/Playwright suites still running green
against the web build; **zero external network requests** at runtime; Steam
features validated in a **Steam test environment**; and **graceful degradation**
when Steam is absent (Constitution VIII).

**Organization**: Grouped by the spec's user stories in priority order. This is
a **wrap, not a fork** — no gameplay code changes; the only front-end edits are
self-hosting fonts (`index.html` + `src/index.css`) and selecting the native
backend at the existing platform seam (`src/platform/index.ts`). Everything else
new lives under `src-tauri/`, `public/fonts/`, `scripts/`, and `docs/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md (Setup/Foundational/Polish carry no story tag)
- Paths are exact; new native code lives under `src-tauri/`, the seam under `src/platform/`

---

## Phase 1: Setup

**Purpose**: Toolchain, external accounts, and repo plumbing for a Tauri build

- [ ] T001 [P] Install the Rust toolchain (rustup + stable) and Tauri OS prerequisites (WebView2 runtime on Windows); record exact versions + install steps in `scripts/setup-tauri.md`
- [ ] T002 [P] Add Tauri (`@tauri-apps/cli`) as a devDependency and the `tauri` / `tauri:dev` / `tauri:build` npm scripts (no config yet) in `package.json`
- [ ] T003 [P] Register the Steam partner **App ID** + depot(s) and plan the achievement API-names + Auto-Cloud file patterns; capture the App ID, depot IDs, and mapping in `docs/steam-setup.md`
- [ ] T004 [P] Add Tauri build outputs (`src-tauri/target/`, `src-tauri/gen/`) to the ignore rules in `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: A Tauri project that wraps the **existing** Vite front end and boots the unchanged web bundle in a native window.

**⚠️ CRITICAL**: No user story work can begin until the shell boots the existing bundle unchanged.

- [ ] T005 Scaffold the Tauri project (`Cargo.toml` + `src/main.rs`) wrapping the existing Vite build, per plan.md, in `src-tauri/`
- [ ] T006 Configure the Tauri app: chromeless single window (title "Tidepools"), `beforeDevCommand`/`beforeBuildCommand` → Vite, `frontendDist` → Vite `dist`, bundle identifier + targets, in `src-tauri/tauri.conf.json` (depends on T005)
- [ ] T007 [P] Add an `isTauri()` runtime guard + the provider-selection hook (web backend remains the default; native branch is a TODO stub) at the platform seam in `src/platform/index.ts` — no game/ui consumer changes
- [ ] T008 Verify the **unchanged** Vite bundle boots inside the Tauri window via `npm run tauri dev` (game loads, web backend still works, no game/ui edits); record the smoke check in `scripts/setup-tauri.md` (depends on T005–T007)

**Checkpoint**: the existing web app runs inside a Tauri window with zero gameplay changes.

---

## Phase 3: User Story 1 — Native desktop build (Priority: P1) 🎯 MVP

**Goal**: The exact same web game runs as a native desktop binary — launches directly to the game with no browser chrome and is fully playable **offline**.

**Independent Test**: Build the Tauri app on a dev machine; launch the binary with the network disabled; play a board end-to-end; confirm behavior is identical to the web build.

- [ ] T009 [P] [US1] Author the offline-launch smoke checklist (write first): built binary launches chromeless to the game and a board is played end-to-end with the network disabled, in `scripts/verify-offline-launch.md`
- [ ] T010 [P] [US1] Set the Vite base to relative (`base: './'`) and confirm no absolute/CDN asset URLs so the bundle loads from disk under Tauri, in `vite.config.ts`
- [ ] T011 [P] [US1] Harden the release window config: no menu/devtools, sensible min size, single window, offline, in `src-tauri/tauri.conf.json`
- [ ] T012 [P] [US1] Implement the app entry that loads the bundled front end and opens directly to the game in `src-tauri/src/main.rs`
- [ ] T013 [US1] Build the native binary (`npm run tauri build`) and make T009 pass — the binary launches offline, a board is playable, and behavior matches web (SC-001); record evidence in `scripts/verify-offline-launch.md` (depends on T010–T012)

**Checkpoint**: MVP — a shippable native binary that launches to the game and plays fully offline.

---

## Phase 4: User Story 2 — Native saves via the platform seam (Priority: P1)

**Goal**: All progress persists through the existing `SaveStore` (008), now backed by native storage — **no game/ui code changes**, just a swapped backend.

**Independent Test**: Play, quit the native app, relaunch → exact progress restored via the Tauri backend; confirm no game/ui code changed to enable it.

- [ ] T014 [P] [US2] Contract test (write first): a `tauri-backend` satisfies the same `SaveStore` contract (`get`/`set`/`remove`/`exportAll`/`importAll`, namespaced+versioned keys) as the web/memory backends, in `src/platform/tauri-backend.test.ts`
- [ ] T015 [P] [US2] Add native file-storage Tauri commands (read/write/remove/list save files under the app data dir) in `src-tauri/src/main.rs`
- [ ] T016 [US2] Implement `tauri-backend.ts` — the `SaveStore` (008) over Tauri fs/commands, honoring the exact contract — in `src/platform/tauri-backend.ts` (depends on T015)
- [ ] T017 [US2] Select `tauri-backend` under Tauri by filling the T007 provider hook; web/tests unchanged, **no consumer edits**, in `src/platform/index.ts` (depends on T016)
- [ ] T018 [US2] Make T014 pass and run the no-consumer-change scan (game/ui diff clean; storage only via the seam, FR-003); verify relaunch of the native binary restores progress (SC-002); record in `scripts/verify-offline-launch.md` (depends on T017)

**Checkpoint**: desktop progress persists natively through the unchanged seam — the two P1 stories together are the complete P1 deliverable.

---

## Phase 5: User Story 3 — Steam achievements + cloud saves (Priority: P2)

**Goal**: The game unlocks Steam achievements at the right moments and syncs saves via Steam Auto-Cloud so progress follows the player across machines. (Overlay explicitly out of scope.)

**Independent Test**: In a Steam dev/test environment, trigger an achievement condition → it unlocks; move to another machine → Auto-Cloud restores the save.

- [ ] T019 [P] [US3] Add the `steamworks` crate dependency and the dev `steam_appid.txt` (for local Steam init) — in `src-tauri/Cargo.toml` and `src-tauri/steam_appid.txt`
- [ ] T020 [US3] Implement Steam init + achievement-unlock + presence bindings that **no-op when Steam is absent** (FR-008) in `src-tauri/src/steam.rs` (depends on T019)
- [ ] T021 [US3] Register the Steam Tauri commands (init, unlock-achievement) and call init on startup in `src-tauri/src/main.rs` (depends on T020)
- [ ] T022 [P] [US3] Define the `AchievementMap` (game events → Steam achievement API-names: first creature, N boards solved, all creatures, first Deep board, …) in `src/platform/achievements.ts`
- [ ] T023 [US3] Derive unlocks by observing seam writes (stats/journal thresholds) and forward them to the native Steam layer — **no gameplay code changes** — in `src/platform/achievements.ts` (depends on T022)
- [ ] T024 [P] [US3] Configure Steam **Auto-Cloud** file patterns for the native save directory (partner-site config) and document the synced paths in `docs/steam-setup.md`
- [ ] T025 [US3] Validate in a Steam test environment: each achievement condition unlocks; a save syncs across two machines via Auto-Cloud (SC-003); and everything **degrades gracefully with Steam absent** (SC-005); record results in `docs/steam-setup.md` (depends on T021, T023, T024)

**Checkpoint**: Steam achievements + cross-machine cloud saves work in the Steam env and no-op cleanly without Steam.

---

## Phase 6: User Story 4 — Offline assets + release pipeline (Priority: P2)

**Goal**: Fonts and all assets are bundled/self-hosted (no external fetches), and there is a repeatable build + SteamPipe upload pipeline producing versioned builds.

**Independent Test**: Disconnect the network, launch the app → fonts/assets render correctly with zero external requests; run the release pipeline → a versioned build uploads to a Steam depot.

- [ ] T026 [P] [US4] Zero-external-request test (write first): load the app with network interception and assert no request leaves the origin (all fonts/assets local), in `e2e/offline-assets.spec.ts`
- [ ] T027 [P] [US4] Download and add self-hosted **Bricolage Grotesque** + **Nunito** web fonts (woff2, only the weights the theme uses) under `public/fonts/`
- [ ] T028 [US4] Add `@font-face` declarations pointing at `public/fonts` while keeping the existing `--font-display` / `--font-sans` theme tokens, in `src/index.css` (depends on T027)
- [ ] T029 [P] [US4] Remove the Google Fonts preconnect + stylesheet `<link>` (resolves the stack-pack self-host follow-up) from `index.html`
- [ ] T030 [US4] Make T026 pass: rebuild and confirm fonts + all assets render offline with **zero external requests** (SC-004), in `e2e/offline-assets.spec.ts` (depends on T027–T029)
- [ ] T031 [P] [US4] Implement the build + SteamPipe upload pipeline (web build → `tauri build` → versioned artifact → `steamcmd` depot upload) in `scripts/release-steam.ts`
- [ ] T032 [US4] Write the release runbook (versioning, depot mapping, credentials, run steps) and produce one versioned build uploaded to the configured depot (SC-006), in `scripts/release-steam.md` (depends on T031)

**Checkpoint**: the build is fully self-contained (offline) and repeatably shippable to Steam.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T033 [P] Verify the **web build stays first-class and unaffected** (FR-009): existing `npm run test` (Vitest) + `npm run test:e2e` (Playwright) green against the web build, and the whole change touches only `index.html`, `src/index.css`, `src/platform/`, and the new `src-tauri/` / `public/fonts/` / `scripts/` — record in `scripts/verify-web-unaffected.md`
- [ ] T034 [P] Document the accepted **overlay-out-of-scope** decision + Steam-absent graceful degradation (local saves, no-op Steam calls) in `docs/steam-setup.md`
- [ ] T035 [P] Steam Deck (Linux/webkitgtk) opportunistic validation: binary launches, input/scaling + controller/cursor scheme checked; record findings in `scripts/setup-tauri.md`
- [ ] T036 Full gate: `npm run typecheck` + `npm run build` + `npm run test` + `npm run test:e2e` green and `npm run tauri build` yields a launchable offline binary; add the versioned release entry to `CHANGELOG.md` (depends on all)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2, blocking)** → **User Stories (Phases 3–6)** → **Polish (Phase 7)**.
- **Cross-feature (hard preconditions)**: this feature implements **008**'s `SaveStore` natively (US2) and wraps the completed web build of gameplay features **001–007** — all must be done on web first. It syncs the save blob defined by **006 Settings** via Steam Auto-Cloud (US3), and self-hosts the fonts flagged as a **stack-pack follow-up** (US4).
- **US1 (P1, MVP)** depends only on Foundational — it is the native offline build. **US2 (P1)** depends on Foundational + the 008 seam; together US1+US2 are the full P1 slice. **US3 (P2)** depends on the native shell (Foundational) + the seam (for save-write-derived achievements). **US4 (P2)** is largely independent (fonts + pipeline) and can proceed alongside US2/US3.
- Within a story, tests/checklists are authored first (T009, T014, T026) and the verification task closes the loop.

## Parallel Opportunities

- **Phase 1**: T001–T004 are four independent files → all parallel.
- **Phase 2**: T007 (front-end seam) runs parallel to the Rust scaffold (T005→T006); T008 gates on all three.
- **US1**: T010 (`vite.config.ts`), T011 (`tauri.conf.json`), T012 (`main.rs`), and the T009 checklist are four distinct files → parallel; T013 (build+verify) joins them.
- **US3**: T022 (`achievements.ts`) and T024 (Auto-Cloud config) run parallel to the Rust Steam chain (T019→T020→T021).
- **US4**: T026 (test), T027 (fonts), T029 (`index.html`), and T031 (pipeline) are independent; T028/T030/T032 depend on their inputs.
- **Polish**: T033, T034, T035 are different files → parallel; T036 is the final serial gate.

## Implementation Strategy (MVP first)

- **MVP = Phases 1–2 + US1 (through T013)**: a native binary that launches chromeless to the game and plays fully **offline**. Stop and validate here — it proves the entire wrap strategy end-to-end.
- Then **US2 (P1)** completes native persistence via the unchanged seam — this closes the complete P1 deliverable (a desktop build that plays and saves).
- Then layer the P2 value incrementally: **US3** (Steam achievements + Auto-Cloud, validated in the Steam env) and **US4** (self-hosted offline assets + the repeatable SteamPipe pipeline) — US4 can run in parallel with US3.
- Commit after each task or logical group (Constitution IX); the versioned release entry lands in `CHANGELOG.md` with the final gate (T036).

## Notes

- **Wrap, not fork**: zero gameplay code changes. The only front-end edits are self-hosting fonts (`index.html` + `src/index.css`) and selecting the native backend at `src/platform/index.ts`; all native/Steam code is confined to `src-tauri/` and the platform seam (FR-002, FR-003, FR-009).
- **Determinism (Constitution XI) is unaffected** — the engine is unchanged and still runs in the webview; saves store only player state + the seed request, regenerated by the engine.
- **Overlay is out of scope** (accepted): the Steam in-game overlay likely won't inject into a webview app; nothing depends on it. Achievements + Auto-Cloud are the integration value.
- **Graceful degradation** is a requirement, not a nicety: with Steam absent the game runs and saves locally via `tauri-backend`, and all Steam calls no-op (FR-008, verified in T025).
- Rust/Tauri toolchain + the Steam partner app/depot are external prerequisites set up in Phase 1 before any build.
