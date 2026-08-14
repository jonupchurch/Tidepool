# Implementation Plan: Master Volume

**Branch**: `015-master-volume` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

## Summary

The audio graph for this feature already exists and shipped with 014. `master` is a gain node with `sfxGain` and `musicGain` connected beneath it, `Settings.sound.volume` already drives `master.gain.value` through `effectiveGain(muted, volume)`, and `AppShell` already pushes that setting into the engine on every change. **`sound.volume` has been the master volume all along — it has simply never had a control.**

So this feature is a UI change plus one setter. The engineering content is in three places, none of them the audio graph:

1. **The control itself.** This is the app's first range input, so it establishes the convention for one.
2. **Where it goes**, and the fact that the two placements share one component rather than growing two.
3. **Proving the "governs both channels" claim**, which is currently asserted only by the shape of the code and by `effectiveGain`'s unit tests — nothing tests that `sfxGain` and `musicGain` actually hang off `master`.

Point 3 is the part worth doing carefully. `effectiveGain` is tested; the *graph* is not. A refactor that connected `musicGain` straight to `ctx.destination` would leave every existing test green and silently make the master control effects only. That is exactly the regression this feature must not permit, so the fake Web Audio harness grows enough to record the graph.

## Technical Context

**Language/Version**: TypeScript 5, strict.

**Primary Dependencies**: None new.

**Storage**: None. `SettingsRecord.sound.volume` already exists, is already validated and clamped by `resolveSettings`, and already has a default (0.8). No schema version change, no migration.

**Testing**: Vitest + Testing Library for the control and the two surfaces; the fake Web Audio harness in `audio-engine.test.ts` for the graph assertion. Playwright for the keyboard path on a real browser, where a native range input actually responds to arrow keys.

**Target Platform**: Web + Tauri desktop. `accent-color` is supported by WebView2 and every browser target.

**Performance Goals**: A drag writes one settings record per 5% detent (~20 for a full sweep) to `localStorage`. Settings are not a blob namespace, so this is a small synchronous `setItem`, not an IndexedDB round trip.

**Constraints**: Must not change board behaviour (nothing here touches `core/` or `game/`). Must not modify any setting other than `sound.volume` (FR-010).

**Scale/Scope**: 1 new component, 2 surfaces wired, 1 setter in `AppShell`, 1 test-harness extension.

## Constitution Check

- **III. Conventions** — the control follows the icon-button cluster's existing shape on Home and the optional `music`/`onMusicChange` prop-pair shape already used by `PauseOverlay`. Colour comes from the existing `--color-tide` token via Tailwind's `accent-*` utility, not a new palette entry. ✅
- **IV. Scope** — master only. Per-channel sliders and the `changePrefs` theme-clobber are both *named* in the spec as separate work rather than folded in. ✅
- **VIII. Testing** — a slider's own logic is thin, so the tests that carry signal are the graph assertion (a real regression guard) and the two wiring tests, not a restatement that `<input>` holds a value. ✅
- **XI. Determinism & Solvability** — no `core/` change. `fingerprints.test.ts` is untouched and must stay green. ✅

No violations.

## Project Structure

```text
src/ui/shell/
├── VolumeSlider.tsx        # NEW — the control; the app's first range input
├── VolumeSlider.test.tsx   # NEW — role, name, percentage valuetext, muted hint
├── HomeScreen.tsx          # slider under the toggle cluster; volume/onVolumeChange props
├── PauseOverlay.tsx        # slider beside the music switch; optional pair, as `music` already is
├── AppShell.tsx            # changeVolume -> setSetting('sound','volume'); passes to both
└── volume.test.tsx         # NEW — both surfaces wired; a change writes only sound.volume
src/audio/
└── audio-engine.test.ts    # harness records gain nodes + connections; master-governs-both tests
e2e/
└── volume.spec.ts          # NEW — keyboard operation in a real browser
```

## Design decisions

### Why a native `<input type="range">`

Rebuilding a slider from a `div` and pointer handlers means reimplementing keyboard support, touch dragging, RTL, and the slider ARIA contract — and `a11y.test.tsx` already holds the shell to "every control is a real, named element". The native input gets all of that for free. The only thing it costs is styling latitude, and `accent-color` (via Tailwind's `accent-tide`) covers the filled track and thumb from the existing token in one utility.

### Why volume is its own prop pair, not a field on `ShellPrefs`

`ShellPrefs` is the three switches, and `AppShell.changePrefs` writes *all* of them on any change — including an explicit `Day`/`Night`, which clobbers a stored `Auto`. Folding a continuously-dragged value into that bundle would fire that clobber on every detent of a drag and re-write three unrelated settings each time. A dedicated `changeVolume` writes exactly one setting (FR-010) and leaves the pre-existing bug where it is, no wider than it was.

`PauseOverlay` already takes `music` / `onMusicChange` as an optional pair, so the shape is not new. It is required on `HomeScreen` (that screen always shows sound controls, and the type should say so) and optional on `PauseOverlay` (matching `music`, and keeping the overlay usable without sound wiring — which is what keeps `a11y.test.tsx`'s exact action-list assertion honest).

### Why the slider stays enabled while muted

Mute is independent (FR-007), so while muted the slider sets a level that is real but not currently audible. Disabling it would prevent the legitimate "set my level now, unmute later" move. Instead it dims, and `aria-valuetext` says `"50%, muted"` — so the state is legible to a screen reader too, not only to a sighted player.

### Why the harness grows

`effectiveGain` proves the *number*; nothing proves the *routing*. The fake `AudioContext` is extended to keep every gain node it creates and record what each connects to, which lets one test state the actual claim of this feature: `sfxGain → master` and `musicGain → master`, so a single control moves both. Without it, "master volume" is an assertion about code shape rather than a tested property.

## Phases

1. **Guard** — extend the fake Web Audio harness; assert the gain graph and that `setVolume` moves only the master node. Lands before the UI, so it describes what already shipped.
2. **Control** — `VolumeSlider` + its tests.
3. **Wiring** — Home, Pause, `AppShell`; the cross-surface and only-one-setting-written tests.
4. **Verification & docs** — typecheck, build, unit, e2e; `CHANGELOG.md`, `STATUS.md`, `tasks.md`.
