# Game sounds — drop them here

Sound effects are **auto-discovered at build time**. To add a sound, drop an
audio file named exactly `<sound-id>.<ext>` into this folder — that's it. No
manifest, no code change, no 404s: Vite bundles whatever's here, and the game
plays it. Until a file exists for an id, that event is simply silent.

## Recommended format

**MP3** (small + plays everywhere, including the Tauri/Steam webview). `.wav`
and `.ogg` are also accepted. Keep clips short, ~44.1 kHz, mono for SFX, and
normalize levels so no one sound is much louder than the rest.

## Filenames (the sound IDs)

| File | Plays when… |
|------|-------------|
| `water.mp3` | a cell is correctly marked **water** |
| `rock.mp3` | a cell is correctly marked **stone** |
| `mistake.mp3` | a cell is marked **against the solution** |
| `poolComplete.mp3` | a **pool fills** (a creature joins the journal) |
| `boardComplete.mp3` | the **board is solved** |
| `undo.mp3` | an action is undone |
| `redo.mp3` | an action is redone |

The id list is the source of truth in [`src/audio/sounds.ts`](../../audio/sounds.ts).
Volume + mute are honored from the game settings (008/006).

_A looping ambient tide track is a separate, later addition (it needs fade
in/out), not part of this drop-in SFX set._
