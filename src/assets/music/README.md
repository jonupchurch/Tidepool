# Ambient music — drop it here

**Not** the same folder as [`src/assets/audio/`](../audio/README.md). That one is
sound effects, discovered by exact event id — a music file dropped there is
flagged by `npm run check:audio` as "never played", because it isn't an event.

Music is a separate channel: one looping bed, its own level, its own on/off
switch, independent of the effects mute. See
[specs/014-ambient-music](../../../specs/014-ambient-music/spec.md).

## Dropping a track

Put the **shipping** file here, kebab-case, `.mp3` or `.ogg`:

```
src/assets/music/driftwood-garden.mp3
```

Discovery is at build time via Vite's `import.meta.glob`, the same way the sound
effects work — no manifest to edit, no code change, no runtime 404. Until a file
exists the game simply plays no music, and the toggle still works.

**Only shipping files belong in this folder.** Anything here is copied into the
web and Steam builds, played or not — so a WAV master left alongside its MP3
adds its whole size to everyone's download for a file that never sounds. Masters
go in `assets/masters/` at the repo root, which is outside `src/` (so the build
globs can't see it) and gitignored (so clones stay small). Keep your own copies
of those — git isn't holding them for you.

## Format

**Ogg Vorbis is preferred over MP3**, for one specific reason: MP3 bakes encoder
delay and padding into the file, and decoders disagree about whether to strip
it. The result is a click or a gap every time the loop wraps — on an ambient bed,
the one thing you'd notice.

That's solvable without re-encoding, but only with numbers someone has measured:
the true content length, and the delay offset to start the loop at. Those live in
the table below, per track, and the music catalog reads them. Don't guess them —
the MP3's own Xing/LAME header and the WAV master's sample count are the sources,
and they're what the recorded values came from.

## Tracks

| Track | Ships as | Master | Source | Licence |
|---|---|---|---|---|
| Driftwood Garden | `driftwood-garden.mp3` — 3.2 MB, 48 kHz stereo | `assets/masters/driftwood-garden.wav` — 24.7 MB | Suno (Pro plan) | Royalty-free, commercial use permitted |

Suno's Pro plan grants commercial rights to generated audio, which is what a paid
Steam release needs. Recorded here so the question is answered at the file rather
than re-litigated later.

### Driftwood Garden — loop data

Measured, not estimated. WAV master is the authority on true length; the MP3's
Xing/LAME header is the authority on the padding around it.

| | |
|---|---|
| Sample rate | 48 000 Hz, stereo |
| True length (WAV master) | 6 464 640 samples = **134.680 s** |
| MP3 encoder | `Lavc60.31`, Xing header present |
| MP3 encoder delay | 576 samples = 0.012 s |
| MP3 end padding | 1 464 samples |
| MP3 decoded length incl. padding | 6 467 328 samples = 134.736 s |

So the padding to hide is ~56 ms spread across both ends — small, and exactly the
size of gap that reads as a glitch rather than as silence.

The catalog carries these as data and the engine picks the right behaviour at
runtime: after `decodeAudioData`, compare the decoded buffer's duration against
the true length above. If the decoder already stripped the padding, loop the
whole buffer. If it didn't, set `loopStart` to the delay offset and `loopEnd` to
`loopStart + trueDuration`. That works whichever way a given browser or webview
decides to behave, instead of betting on one.

Re-encoding to Ogg from the WAV master would make all of this unnecessary. It
needs an encoder (`ffmpeg`) that isn't installed here — worth doing if the seam
is ever audible in practice.
