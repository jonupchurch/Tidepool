# Implementation Plan: Ambient Music & Its Off Switch

**Branch**: `014-ambient-music` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

## Summary

The audio engine today is a single master gain fed by fire-and-forget one-shot buffer sources — right for SFX, wrong for a looping bed. Add a second path: a `music` gain node under the same master, holding at most one looping `AudioBufferSourceNode`, with its own enabled state and its own level.

Two things follow that are less obvious than the channel itself. Music assets need a **separate folder** from SFX, because `sounds.ts` discovers files by exact event id and would flag a music file as a stray that is never played. And the engine has to be driven from **`AppShell`, not `GameplayScreen`**, or music would exist only while a board is open — which fails FR-005 directly.

## Technical Context

**Language/Version**: TypeScript 5, strict. React 19.

**Primary Dependencies**: None new. Web Audio API, already in use.

**Storage**: `SettingsRecord.sound` gains an optional `music: boolean` (default on). Optional-past-the-original-set is the established pattern in this file, so an older record still loads and validates and `resolveSettings` fills the gap — no schema version bump needed.

**Testing**: Vitest for the pure parts (gain resolution, settings coercion, the enable/disable state machine). jsdom has no Web Audio, and the engine already degrades to a `SILENT` no-op there, so the engine's own tests exercise the interface contract rather than real playback. Playback, looping and the seam are verified by ear against a real track — stated as manual, not claimed as automated.

**Target Platform**: Web + Tauri desktop (WebView2 on Windows, WKWebView on macOS, webkitgtk on Linux).

**Performance Goals**: One additional decoded buffer held in memory. A 2–3 minute ambient bed decodes to a large PCM buffer; the download size is the constraint worth watching, not CPU.

**Constraints**: Must ship and verify before any track exists (FR-010). Must not start before a user gesture (FR-006).

**Scale/Scope**: 1 audio module, 1 new asset folder, 2 settings files, 2 UI surfaces.

## Constitution Check

- **III. Conventions** — mirrors the existing audio layer's posture exactly: build-time asset discovery via `import.meta.glob`, degrade-to-silent on anything missing or undecodable, nothing in `core/` or `game/` ever importing audio. ✅
- **IV. Scope** — channel, switch, plumbing. Not a settings screen, not per-screen adaptive music, not track selection; all named out of scope in the spec. ✅
- **VIII. Testing** — unit tests where they carry signal (state, gain, settings); honest manual verification where jsdom cannot reach. ✅
- **XI. Determinism & Solvability** — untouched. Audio is a presentation concern and imports nothing from the engine. ✅

No violations.

## Project Structure

```text
src/assets/music/
├── README.md          # NEW: drop-in instructions + licence/provenance record
└── <track>.mp3        # NEW: the Suno track, added separately
src/audio/
├── music.ts           # NEW: MUSIC_URLS build-time discovery, mirroring sounds.ts
├── audio-engine.ts    # music gain node, one looping source, setMusicEnabled/Volume
└── index.ts           # re-export
src/game/
├── settings.ts        # Settings.sound.music, DEFAULT_SETTINGS, resolveSettings
src/platform/
└── schemas.ts         # SettingsRecord.sound.music?: boolean
src/ui/shell/
├── AppShell.tsx       # own the engine: unlock, mute, music enable — app-wide
├── HomeScreen.tsx     # music toggle beside the existing sound toggle
└── PauseOverlay.tsx   # same toggle, reachable mid-board
```

**Structure Decision**: A separate `src/assets/music/` folder with its own `music.ts` catalog, rather than extending `SoundId`. The two are different in kind — one-shot versus looping, per-event versus continuous, and `check:audio` deliberately warns about any file in the SFX folder whose name is not an event id. Keeping them apart preserves that warning's meaning and keeps the drop-in ergonomics for both.

## Design notes

### Where the engine is owned

`GameplayScreen` currently calls `getAudioEngine()`, applies `setMuted` from live settings, and calls `unlock()` on the first board gesture. That is correct for SFX, which only fire on a board — but music has to survive navigation (FR-005) and start on the player's first interaction anywhere (FR-006).

So mute/music application and `unlock()` move up to `AppShell`, which already reads live settings and already derives `prefs.muted` from `settings.sound.muted`. `GameplayScreen` keeps playing sounds; it stops owning engine configuration. This is a small refactor and it is the part most likely to be skipped and then quietly fail the "music restarts on navigation" acceptance scenario.

### Mute versus music

There are two mute-shaped things in the codebase: `SettingsRecord.sound.muted` and the older `ShellPrefsRecord.muted`. `AppShell` already resolves this — it reads `settings.sound.muted` and writes back through `setSetting('sound', 'muted', …)`, making settings the single source of truth. The music preference joins it there. **Do not** add a third mute concept in `shellPrefs`.

The two controls compose as FR-004 requires: master mute zeroes the master gain and silences everything without touching `sound.music`; the music switch zeroes only the music gain. Turning master mute back off restores whatever the music preference was.

### Looping without a seam

`AudioBufferSourceNode.loop = true` is the mechanism, but MP3 is the risk. Encoder delay and padding are baked into the file, and browsers differ on whether `decodeAudioData` strips them — so a naive loop can click or gap at the wrap. Two mitigations, in order of preference:

1. Ship **Ogg Vorbis**, which has no such padding. Chromium-based targets (WebView2, browsers) handle it; verify on WKWebView before relying on it.
2. Otherwise ship MP3 and set `loopStart` / `loopEnd` explicitly to trim the padding, carrying those values as per-track data rather than magic numbers in code.

Either way the loop points belong in the catalog next to the URL, so a seam can be fixed by editing data rather than by changing the engine.

### Starting, stopping, and not doubling up

An `AudioBufferSourceNode` is single-use: stopping one means the next start needs a fresh node. The engine holds at most one music source and follows a strict rule — stop and drop the existing node before creating another. Rapid toggling is the case that produces two overlapping beds, and it is directly testable at the state level even without real audio.

Stopping should ramp the music gain down over a short fade rather than cutting, so a mid-phrase switch-off does not pop (spec edge case). Same on the way in.

Autoplay: the engine's `ensureContext()` already creates the context lazily and `unlock()` resumes a suspended one. Music start hangs off the same first-gesture unlock, so no new autoplay handling is needed — just the move to `AppShell` so the gesture can be any interaction, not only a board click.

### Shipping before the track exists

`sounds.ts` already establishes the pattern: `import.meta.glob` matches only real files, so a missing track means an empty catalog and silence, with no 404 and no error. `music.ts` copies it verbatim. That is what makes FR-010 true rather than aspirational — the switch, the persistence, and the accessibility work are all verifiable today, and the track is a later drop-in with no code change.

### Levels

Master gain currently resolves from mute + volume. Music sits under the master with its own gain, defaulting below the SFX level so the bed stays under the game rather than over it. The settings model already carries `sound.ambient` (default 0.5) and unused — that is the level this channel should read, which means the existing field finally does something instead of a new one being invented.

### Controls

A `🎵` toggle beside the existing `🔊` on Home, and the same control in `PauseOverlay` so a player who needs quiet mid-board does not have to leave it. Both are `aria-pressed` buttons with explicit labels, matching how the existing mute toggle is already built (`aria-label`, `aria-pressed`) and what `a11y.test.tsx` and `toggles.test.tsx` already check for.

### Licence and provenance

Generated audio needs its provenance recorded where it lands, not reconstructed later. The `src/assets/music/README.md` carries it, as `src/assets/fonts/` already does for the OFL fonts and `src/assets/audio/README.md` does for the SFX. This ships commercially on Steam; note the generator, the date, the prompt or track id, and the licence terms under which it may be used.

## Risks

| Risk | Handling |
|---|---|
| Engine stays owned by `GameplayScreen`, music restarts on navigation | Move ownership to `AppShell` as an explicit task, with the acceptance scenario as its check |
| MP3 padding produces an audible seam at the loop | Prefer Ogg; otherwise per-track `loopStart`/`loopEnd` carried as data |
| Rapid toggling overlaps two beds | One-source invariant in the engine; state-level test |
| A third mute concept creeps into `shellPrefs` | Settings is the single source of truth; stated here and worth a comment at the site |
| Track size dominates the download | Constraint on the audio (length, bitrate, mono), not on the plumbing |
| Music files land in the SFX folder and are silently never played | Separate folder; `check:audio`'s existing stray warning keeps working |

## Sequencing

Fully independent — touches no engine, no board, no persistence beyond one optional settings field. Can be built at any point, and should go early so the plumbing is waiting when the Suno tracks arrive.
