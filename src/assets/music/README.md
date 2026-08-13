# Ambient music — drop it here

**Not** the same folder as [`src/assets/audio/`](../audio/README.md). That one is
sound effects, discovered by exact event id — a music file dropped there is
flagged by `npm run check:audio` as "never played", because it isn't an event.

Music is a separate channel: one looping bed, its own level, its own on/off
switch, independent of the effects mute. See
[specs/014-ambient-music](../../../specs/014-ambient-music/spec.md).

## Dropping a track

Put the file here, kebab-case, extension `.mp3`, `.ogg` or `.wav`:

```
src/assets/music/driftwood-garden.mp3
```

Discovery is at build time via Vite's `import.meta.glob`, the same way the sound
effects work — no manifest to edit, no code change, no runtime 404. Until a file
exists the game simply plays no music, and the toggle still works.

## Format

**Ogg Vorbis is preferred over MP3**, for one specific reason: MP3 bakes encoder
delay and padding into the file, and browsers disagree about whether decoding
strips it. The result is an audible click or gap every time the loop wraps —
which on an ambient bed is the one thing you'll notice.

If the track ships as MP3, the loop points have to be trimmed explicitly in the
catalog (`loopStart` / `loopEnd`) rather than looping the whole buffer. That's
supported, it's just data someone has to measure. Ogg avoids the question.

Suno exports both MP3 and WAV. If you have the WAV, keep it — exact loop points
are easier to measure from it, and it's the better master to re-encode from.

Other guidance:

- **Long enough not to feel like a loop** — a couple of minutes at least.
- **Mixed to sit under the game**, not over it. The music channel defaults below
  the effects level, but the track should already be quiet and un-busy.
- **Watch the download size.** This ships in the Steam build and the web build.
  Stereo at a modest bitrate is plenty for an ambient bed.

## Provenance

Generated audio needs its licence and origin recorded **here, at the point it
lands** — not reconstructed later when someone asks. The fonts
([`../fonts/`](../fonts/README.md)) carry their OFL terms the same way. This game
is sold on Steam, so this table is the record that it may be.

| Track | File | Source | Date | Licence / terms |
|---|---|---|---|---|
| Driftwood Garden | _(to add)_ | Suno | 2026-08 | _(to confirm — see below)_ |

Fill the row in when the file lands. Worth capturing: the Suno track id or link,
the plan/tier it was generated under (that's what determines commercial use
rights), and the prompt, so the track can be regenerated or extended in the same
voice later.
