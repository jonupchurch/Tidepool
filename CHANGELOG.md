# Changelog

Dated log of **actual code/feature changes**, newest first. Process/setup work
isn't tracked here — see `STATUS.md` and the commit history. Will adopt
versioned release notes once Steam builds start.

## 2026-08-18 — The parity marks are dots now

### Changed

- **`+` and `|` became `●●` and `●`.** Two dots for an even number of water
  tiles, one dot for an odd one — the dots pair up, or one is left over, which
  is what parity *is* rather than a code for it. Every form moves with them:
  `{●●}`, `-●●-`, `{●}`, `-●-`.

### Fixed

- **`-|-` drew a plus.** The split framing puts a dash either side of the mark,
  and a dash-bar-dash is a cross — which is exactly what the *bare even* mark
  looked like. The one pair on the board that must never be confusable was.
- **One font for every clue again.** Digits and marks are now drawn at the same
  weight and size. The two boosts that 018 and 019 added existed only because a
  hairline `|` read lighter than the digits beside it; a filled circle doesn't,
  and dropping them gave `-●●-` room in its tile and the margin marks their
  clearance back from the direction arrows.

### The part worth explaining

Nothing about the puzzles changed. The mark is chosen where the clue is *drawn*,
not where it is generated or saved — the engine has always stored a parity as
even-or-odd and a save has always stored `e`/`o` — so every seed still makes the
board it always made, every fingerprint stayed green, and a save written
yesterday loads today. That was the deciding factor in doing it now rather than
living with it: it costs players nothing.

The lesson is about the test that missed it. `-|-` and `+` are different
strings, so no assertion comparing rendered text could ever have caught this;
what was needed was a *structural* rule. The framing is made of strokes, so a
mark that is itself a bare stroke fuses with it into some other glyph. There is
now a test that says exactly that, and a round mark satisfies it by
construction — nothing else the board draws is round.

## 2026-08-17 — Names for the buttons

### Fixed

- **The four buttons on Home now say what they are when you hover them.** The
  water drop is the sound-effects switch, which was not obvious from the icon —
  it is a drop because the effects *are* the marks landing in the water, and the
  speaker was already spoken for by the master mute. The volume slider says
  "Volume — muted" when the master switch is off, which answers why dragging it
  does nothing.

The hover text names the control and its state ("Sound effects on"), which is a
different sentence from the one a screen reader gets ("Turn sound effects off").
A button's accessible label should say what pressing it will do; a tooltip is
read by someone who cannot tell what the thing IS. The wording is lifted from
the Pause menu, which has always spelled these switches out in words — Home was
the only place they were icons on their own.

## 2026-08-17 — Two rules instead of six glyphs

### Added

- **Parity marks on the edge numbers.** A row's total can now withhold itself
  the same way a stone's count can: `+` for an even number of water tiles along
  that line, `|` for an odd one.
- **`{}` and `--` on a parity mark**, giving `{+}`, `-+-`, `{|}`, `-|-` — on a
  tile and on an edge number alike. Nothing new is invented; two rules a player
  already knows stop being kept apart.
- **How to play rebuilt around the composition**, so the nine forms are shown as
  a grid you can derive rather than a list to memorise.

### Fixed

- The **Play button on the How to play screen** ignored every Endless choice and
  served a plain hexagon — so you could read about `-|-` and be handed a board
  that cannot contain one. A gap left by 016 and missed again by 018.

### The part worth explaining

The whole feature turned out to be one observation. A clue says two separate
things — how *much* water (a number, or just its parity) and how it *sits*
(`{}`, `--`, or neither) — and until now the game had been quietly preventing
those two halves from meeting. Framing could only ever wrap a number; a parity
mark could only ever appear bare and only on a stone.

Making them orthogonal in the code meant most of this feature was *deleting*
things. Two guards saying "not on a parity clue" came out of the solver's
enumeration passes and were replaced by a single line asking whether a candidate
water count satisfies the clue's face. Both passes already checked the run count
separately, so that one substitution is the entire rule that a framed mark
constrains by both halves at once. The board renderer lost a function, too: the
one that drew row totals and the one that drew stone clues were the same code
with different field names.

Reduction became a three-rung ladder — try the bare mark, then the framed mark,
then keep the number — and the order is doing real work rather than being tidy.
Framed parity survives on about 58% of stone clues where a bare mark manages
35%, so trying the stronger form first would have made the plain number the rare
thing on a Deep board. Preferring to withhold the most is what keeps numbers on
the board at all.

Two claims went in as reasoning and came out as measurements. The first was
018's own: that parity on a row would be nearly useless, since the technique
only fires when one cell is left unsettled and a long row means waiting for
twelve. Sound, and wrong — 81 of 202 row totals still solve as a parity, with
the control at zero, because rows are heavily settled by stone clues late in a
solve and the exact total's last remaining value is often just the final cell.
The second was ours: that a bare `|` would read fine in the margin because 018
had already solved that problem on a tile. Rendering it settled that in the
other direction. In the margin there is no tile behind the stroke and it sits
inches from a direction arrow, where it reads as part of the arrow rather than
as a clue. It got more weight than a tile mark, not the same.

Every board that uses the new marks is verified unique and guess-free by the
same oracle as every other board, and every board that does not use them is
byte-identical to the one that seed has always produced.

## 2026-08-17 — Stones that keep the number to themselves

### Added

- **Even & odd clues** on the deepest tides. Some stones now show `+` or `|`
  instead of a count: an even or an odd number of water tiles beside them,
  without saying how many. A new switch on Home, off by default, offered only on
  Deep. The mark travels in the shareable board label as `evenodd`, so a friend
  who pastes your token gets the identical board.

### The part worth explaining

This is the first clue in the game that says *less* than the one it replaces,
and that inverts how generation has always worked. Row annotations and
silhouettes *added* information and let reduction strip whatever a tier could
not use. Parity instead takes information away from a clue that reduction has
already proved necessary — so it cannot be stamped on during generation, or the
fully-clued board would stop being uniquely solvable and every candidate would
be thrown out. It runs as a second pass after reduction instead, weakening only
the clues the board can still be solved without.

The technique the solver learned is deliberately the small one: a parity clue
with a single unsettled neighbour left forces that neighbour. The obvious
stronger rule — subtracting two overlapping clues and reading the parity of the
difference — was measured across 284 clues on 15 boards and accounted for
exactly one of the 98 that could carry a parity form. Not worth its cost, and
quietly dangerous: it wants to read the parity of ordinary counting clues too,
which would have made the solver stronger on *every* board, changed which clues
reduction keeps, and silently regenerated every board in existence. A player who
spots the subtraction just solves faster, which is a fine thing to be true.

Two things only measurement caught. Parity clues appeared on Calm and Tricky
boards even though the technique is Deep-only — because weakening leaves the
cell revealed, so a clue kept for the bare fact that it is a stone survives
losing its number. And about a quarter of the parity clues were decorative: the
board solved with the clue's value stripped out entirely. Reduction now checks
both, which took the density from 44% of clues to 35%.

One edge got closed on the way: a stone with no water at all never becomes a
`+`. Zero is even, so the mark would be mathematically right and a trap —
nobody reads "an even number of water tiles" and thinks *none*, and a player
ruling zero out would conclude at least two neighbours are water and be wrong.
That is a wrong answer reached by sound reasoning, which is the one thing the
game must never do. It costs 1.6% of the marks; zeros stay zeros.

The marks were going to be `E` and `O` until they were rendered and looked at.
In the board font, `O` and the digit `0` are near-identical at the size a Large
board uses — and `0` is a real clue value. Strokes carry the meaning better
anyway: one stroke for odd, two crossed for even, the way parity gets taught.

## 2026-08-16 — Music without the marks

### Added

- **A switch for the sound effects**, on Home beside the music note and in the
  Pause overlay beside the music switch. The two channels are now independently
  silenceable: you can keep the ambient bed for company while the marks land
  silently.

### The part worth explaining

Reported as: you can turn off all sound, which stops the music too, or turn
sound on and shut the music off — but you cannot have music with no sound
effects. Correct, and the cause was narrower than it looked.

The settings model has carried an `sfx` level since feature 014, and the audio
engine has had `setSfxVolume` to apply it. But **there is no Settings screen in
the game**, and nothing else ever wrote that field, so it sat at its default
forever. The only sound controls that actually exist are the master mute, the
music switch, and the master volume slider — which between them cannot express
"the bed, but no marks".

The fix follows the shape music already had rather than inventing one: a channel
gets a *switch* and a *level*. Music has both (`music` + `ambient`); the effects
had only a level, so they now have both too, with `setSfxEnabled` mirroring
`setMusicEnabled`.

Two details worth keeping: the switch is stored apart from the level, so
toggling off and back on restores the level you chose instead of snapping to
full; and the switch is honoured before a sound is started, not by playing it at
zero volume. The choice persists as an optional field, so a save written before
this loads with the effects on rather than silently muting them.

Verified by reading the live Web Audio gain nodes in the browser rather than the
switch's own state: the effects channel goes to zero while the music channel
keeps playing and the master is untouched.

## 2026-08-16 — The Endless tide grows shores

### Added

- **Generated boards can be played on the named silhouettes.** A Shore picker
  on Home offers the same four shapes the curated coastline uses — Atoll,
  Crescent, Wedge, Shoal — plus **Any**, which lets the seed choose so a run
  varies board to board and still reproduces exactly.
- **Generated Deep boards can carry `{n}` / `-n-` on their edge numbers**, via
  an Edge hints switch. Until now those annotations only ever appeared on
  curated boards.
- **The board label became a shareable token.** It names the shore and the
  hints, and seed entry reads the whole thing back — including the `·` it
  separates with, so a pasted label reproduces the board it describes.

### Fixed

- **Curated "Next board" served the wrong board.** Chaining from one curated
  entry to the next dropped the next entry's clue set and silhouette, so a
  page-two board arrived as a plain hexagon with default clues — a different
  board from the one the Curated screen launches for that same entry, and the
  solve was recorded against it.
- **Starting a board cleared the stopwatch setting.** Writing the last-used
  size/difficulty rebuilt the whole `play` settings group from scratch, taking
  `stopwatch` with it every time.

### The part worth explaining

Nothing in the engine changed. `generateBoard` has accepted a `shape` and a
`lineConnectivity` toggle since features 012 and 010 — only the curated manifest
ever asked for them, so every Endless board was a filled hexagon with plain
totals. This feature is the selection layer that was missing, and it is
deliberately conservative in two places.

First, both inputs are opt-in and default to what the game already served. A
seed is a promise, and the promise is kept by the same mechanism the engine
already uses: neither input reaches the RNG seed string unless it is something
other than the default. `board-request.test.ts` checks that with no options the
shell produces byte-identical boards at every seed, size and tier, and both that
guard and the Deep gate below were confirmed by breaking them on purpose.

Second, the hints switch is offered only at Deep — and gated there in code, not
merely hidden in the UI. This was measured rather than assumed: reduction offers
every annotation for removal and drops the ones the tier's technique set cannot
use, and `line-connectivity` is a Deep-only technique. Across five seeds at three
sizes, Tricky produced 222 line clues with **zero** annotations and Calm produced
no line clues at all. Below Deep the switch would have changed which board a seed
makes, in exchange for annotations that reduction then strips anyway.

Worth knowing as a player: annotations are sparse by nature — the generator
yields none to three per Deep board, because reduction removes any the board can
be solved without. That has always been true of the curated Deep boards too.

Shores stay a Medium and Large affair. No silhouette in the catalog claims a
radius-3 board, so on Small the picker is shown disabled with the reason rather
than hidden — Small is the default size, and a control that vanished there would
mean nothing on Home ever mentions shores at all.

## 2026-08-13 — The music no longer stops to start again

### Fixed

- **The ambient bed loops seamlessly.** It used to fall silent for about a
  second every two minutes and then swell back in, which read as the music
  stopping and restarting rather than continuing.

### The part worth explaining

The cause was not where the previous work looked. MP3 files carry encoder
padding, decoders disagree about stripping it, and the loop can click as a
result — so that had been measured carefully and handled. All of that was
correct, and none of it was the problem.

The problem was the music. "Driftwood Garden" was composed, not authored as a
loop: it has a 3.55-second fade-in and a 1.34-second fade-out. Looping it end to
end therefore played the fade-out, hit complete silence, and played the fade-in —
an 86 decibel hole roughly a second wide. No amount of sample-accurate splicing
fixes a gap that is *in the recording*.

So the bed now loops an inner region that never touches either ramp. The track
turns out to have an eight-second phrase inside a forty-second section, and the
loop is 112 seconds — exactly fourteen phrases — chosen as the best-correlating
pair on that grid. A four-second crossfade is baked into the buffer once, when
it decodes, arranged so that the moment playback wraps it is hearing precisely
the audio that followed the loop's end in the original. The join is continuous
by construction rather than merely close, and it stays a single audio source
with no scheduling. The opening plays once per session; the composed ending is
never heard, which is what you want from a bed.

The diagnosis is the lesson. A click and an abrupt switch are different faults —
one is the container, the other is the composition — and treating the report as
the former sent the first attempt to the wrong layer entirely.

## 2026-08-13 — How much, not just whether

### Added

- **A volume slider**, on Home under the sound switches and in the Pause overlay
  beside the music switch. It sets one level for everything — the ambient bed and
  the marks landing move together and keep their balance with each other.

Mute is unchanged and still independent: it silences everything in one press,
whatever the level says. Setting a level while muted is allowed and remembered —
the slider dims and says so rather than pretending to be live.

### The part worth explaining

Most of this already existed. The game has had a master gain node since the
music landed, with the sound-effect and music channels hanging beneath it, and
the level driving it has been in the settings record all along. It simply never
had a control. So the work was a slider, one setter, and — more usefully — a
test that the thing called "master" actually is one.

That test is the reason to write any of this down. Nothing checked the *shape*
of the audio graph, only the numbers going into it, which meant a refactor could
connect the music channel straight to the speakers and every existing test would
still pass while the volume control quietly governed sound effects only. The
fake audio harness now records what connects to what, and that failure was
reproduced deliberately to confirm the guard catches it.

The slider itself took two attempts. Browsers offer `accent-color` to tint a
native range control from a palette, and it does tint the filled track and the
thumb — but Chromium paints the *unfilled* track a fixed charcoal that no colour
scheme setting overrides. On a page this pale that is a hard dark bar across the
corner. Sampling the actual pixels rather than trusting the API is what caught
it, and it also caught a fix that did nothing: an earlier colour-scheme rule
changed the computed style and not one pixel. The track is now rebuilt from the
same two palette tokens the rest of the game uses, so it follows Day and Night
without a second rule.

Separate sliders for music and effects are the obvious next thing, and are
deliberately not here — the fields and the gain nodes for them already exist,
so it is a small feature on its own rather than a rider on this one.

## 2026-08-13 — A second coastline

### Added

- **Thirty-six more curated boards**, on a second page of the coastline, using
  the mechanics the last two updates built: braced and dashed row totals, and
  boards shaped like atolls, crescents, shoals and a narrow sound.
- **A pager** on the curated screen, with the page you're on and your progress
  across the whole coast stated rather than implied.

Page one is exactly the coastline it was, and your progress on it is untouched.

### The part worth explaining

Page two introduces one new thing at a time. A group of ordinary boards to
re-find your feet, then a shape, then a deeper shape, then row annotations on
familiar ground, then the two together. Meeting `{n}` for the first time on a
large, deep, oddly-shaped board would be a wall rather than a step — so page two
opens a little easier than page one closes, then climbs past it.

The boards were found by a search, not by hand, and it can be re-run. That
matters more than it sounds: every time a clue mechanic changes, thirty-six
boards have to be re-found and re-proved unique, guess-free and exactly on-tier.
The search also reports what it rejected, which is how one band was caught asking
for something impossible — it wanted row annotations at Tricky, and row
annotations are a Deep-tier technique, so the reducer stripped every one. It
searched 180 seeds and found nothing until the tier matched the mechanic.

The whole pack — both pages, 72 boards — is re-validated on every build.

## 2026-08-13 — Boards that aren't hexagons

### Added

- **A catalog of board silhouettes** — atoll, crescent, wedge, shoal — carved out
  of the same regions the size tiers already describe. Nothing serves one yet;
  this is the engine learning to, and the curated pack is what will use them.

### The part worth explaining

Almost nothing had to change. The board has always carried its topology as data
— which cells are present is a set, and every clue, every pool, the hit-testing
and the fit-to-window all read it rather than assuming a hexagon. So an irregular
board turned out to be a question of how to *produce* one, not a rewrite.

Shapes are predicates, not lists of cells. "Everything at least this far from the
centre" is one line that works at every size and can be read and argued with; the
same shape written as a table of coordinates is three tables, and a wrong cell in
one is invisible.

A shape can refuse a size rather than degrade. The carved shapes don't offer
Small: at that radius there isn't enough left after carving to be worth playing,
and serving a bad board to keep the catalog tidy is the wrong trade.

Every silhouette is checked automatically at every size it claims — one connected
region, no cell stranded without a neighbour, big enough to be a puzzle — and
then actually generated and solved at every difficulty, which is the check that
separates "the shape looks fine" from "this shape can carry a puzzle".

One prediction didn't survive contact. Planning this expected concave boards to
put a row's number on top of a neighbouring row's cell. They don't, and the
reason is quietly elegant: a number sits *on* its own row's line, and rows lie on
parallel lines spaced wider than a hex is round. The rule that makes a number
identify its row also keeps it off every cell on the board.

## 2026-08-13 — Edge numbers can say how the water sits

### Added

- **`{n}` and `-n-` on the numbers around the edge.** A braced total means that
  line's water is all in one unbroken run; a dashed one means it comes apart into
  two or more. The same vocabulary the clue tiles have always used, now on the
  row totals — and it carries real deductions, not just a different way of
  writing the number.

Boards only use it when they ask for it. Nothing you have played changes.

### The part worth explaining

Only annotate where it says something. A row whose water can only be arranged one
way learns nothing from being braced, and a clue that is always true is noise to
read past. The clue tiles decide this with a count window — between two and
(neighbours − 2) — which is exactly right for a ring of six and quietly wrong for
a row, which can be longer, and can have holes in it once boards stop being
hexagons. So rows ask the real question instead: are both answers actually
possible here? The tiles' rule is left alone, because changing it would move
every board in existence.

Holes end a run, the same way a stone does. Two pools either side of a gap are
`-2-`, not `{2}` — which is what you would say looking at it. No board can have a
gapped row yet, but the rule is fixed now so the shapes work can't disagree with
it later.

The solver had to learn to reason from these the way a person does, and it is
checked against brute-force enumeration on every row short enough to enumerate
— a couple of thousand cases across totals, both annotations, and partial
knowledge. That is what makes "guess-free" a claim rather than a hope.

## 2026-08-13 — Ambient music, and a switch to turn it off

### Added

- **A looping ambient bed**, "Driftwood Garden". It starts at your first
  interaction, keeps playing across screens, and doesn't restart when you move
  between Home, a board and the journal.
- **A music toggle**, on Home beside the existing sound button and inside the
  pause overlay. Music off with sound effects still on is the combination most
  people want, so the two are separate switches — and the sound button still
  means *everything*, so total quiet is one press.

### Changed

- **Sound effects have their own level.** The effects level used to be folded
  into the master volume, which worked while there was only one channel and
  stops working the moment there are two. Master, effects and music are now
  three independent gains.

### The part worth explaining

MP3 bakes encoder delay and padding into the file, and decoders disagree about
whether to strip it — which on a loop means a click every time it wraps, and on
an ambient bed that's the one thing you'd notice. So the track's real geometry
was measured rather than guessed: the WAV master gives the true length
(134.680 s), the MP3's own header gives the padding around it (576 samples in,
1464 out). The engine compares the decoded buffer against the true length at
runtime and only trims if the decoder didn't already, so it behaves whichever
way a given browser or webview happens to decide.

The audio engine also moved from the gameplay screen up to the app root. Sound
effects only ever fire on a board, so living there was fine for them; music has
to outlive the screen, and start on any first interaction rather than a click on
the canvas.

## 2026-08-13 — Boards you finished without a single wrong mark

### Added

- **A lifetime count of boards finished clean**, beside boards solved, pools
  filled and creatures found in the journal. A board counts when no wrong mark
  was ever placed on it — undoing a mistake doesn't launder it, because the tally
  counts marks at the moment they land, not what's left on the board at the end.
- **A line on the completion panel** when you finish clean. One sentence, same
  voice, no sound and no animation. A board finished with a mistake reads exactly
  as it always has.
- **A mark on the curated coastline** for boards whose best run was clean, so
  replaying a board you fumbled has something to show for it.

### The part worth explaining

Your existing clean solves are counted. Curated boards have recorded their best
mistake count for a while, so the evidence was already on disk — opening the new
counter to a zero would have read as the game having forgotten. That backfill
runs once, on the first launch after updating, behind a flag that makes a second
run a no-op.

It deliberately doesn't happen in the schema migration, which is where you'd
expect it. A migration here gets one record and no way to read another, by
design — that's what keeps migrations testable — so it couldn't see your curated
progress even if it wanted to.

Boards solved before mistakes were tracked at all are **not** counted, and no
longer show as zero-mistake on the map either. That zero used to be harmless
because it only suppressed a warning; now it would award a clean-solve mark for a
board nobody ever checked. Absence of evidence isn't evidence of a clean run.

## 2026-07-25 — A render error no longer means a white screen

### Added

- **An error boundary at the app root.** Any render error used to unmount the
  whole tree, leaving a blank window with no way home and no clue whether the
  player's progress survived. It now shows a calm screen that says plainly that
  progress is safe (it's on disk, not in the component that died), a way back,
  and the error text collapsed for a bug report.

### The part worth explaining

Recovery resets **in place** rather than reloading. That's for the failure that
actually ruins a game: if the crash is *deterministic* — a saved board that
throws every time it's restored — reloading falls into the same hole forever.
Resetting in place keeps the boundary mounted, so it can notice that retrying
already failed and offer a real way out: clearing the in-progress board, the one
piece of saved state rebuilt into live objects on load and so the likeliest
repeat offender. The journal, stats, curated progress and settings are untouched.

That option stays hidden on a first failure — it discards a puzzle in progress,
so it shouldn't be the first thing offered — and the reset happens even if the
clearing itself throws, because being trapped on the crash screen by a broken
escape hatch is the worst outcome available.

## 2026-07-25 — The board is sharp on scaled displays

### Fixed

- **The board rendered at 1× and was upscaled by the browser.** The canvas
  allocated its pixel buffer in CSS pixels, so on 150% Windows scaling or any
  Retina Mac — most machines — the hexes, numerals and tile motifs were all
  visibly soft. The buffer is now allocated in device pixels and the context
  scaled to match, so every drawing routine still works in CSS pixels and layout
  (and therefore hit-testing) is untouched.

Capped at 2×: past that the difference isn't visible at normal viewing distance
while the buffer keeps growing with the square of the ratio — a 2560×1440 window
at 3× is a 33-megapixel buffer reallocated on every resize.

The maths is a pure function (`render/pixel-ratio.ts`) with its own tests,
because a canvas can't be built in jsdom and the clamp, the rounding and the
zero-size case all deserve coverage. A 2× e2e test guards both halves: that the
buffer really doubles, and that clicks still land on the intended hex — a
transform applied the wrong way would have silently broken every click on the
board, which is the failure worth catching here.

## 2026-07-25 — Achievements (009 US3, the half that isn't blocked)

### Added

- **29 achievements** (`game/achievements.ts`) over data the game already saves —
  no new tracking. First steps, one per creature plus the full journal, one per
  curated group plus the whole coastline and two flawless awards, four volume
  tiers, and a collector.
- **`npm run check:achievements`** prints the catalogue as API name → display
  name → description. Steamworks has no bulk import; every achievement is typed
  into the partner site by hand, and this is the list to work from.

### Why it's a pure function, not an event

`evaluateAchievements(save)` recomputes from scratch rather than firing on the
moment something happens. That buys three things: a player who earns something
with Steam unreachable still gets it next launch; an achievement added later
unlocks retroactively for anyone who already met the condition, with no backfill;
and Steam reduces to a thin adapter — `newlyEarned(save, alreadyPushed)` at one
call site.

### Two traps it's tested against

An `every` over an empty list is `true`, so a mis-specified achievement would
hand itself out on first launch — a test asserts a brand-new player has earned
exactly nothing. And curated entries solved before mistake-tracking existed carry
no `errors` field: those are *not* counted as flawless, because we don't know,
and awarding "without a single mistake" to a run that may have been full of them
is a lie the player can spot.

Steam wiring itself stays blocked on the App ID — it can't be written or tested
without one.

## 2026-07-25 — The game is "Tidepool", singular

### Changed

- **One name everywhere.** The repo and folder were already singular while every
  player-facing string said "Tidepools"; the store art settled it. Renamed the
  window title, wordmark, About screen, bundle `productName`, crate, and npm
  package. The binary is now `tidepool.exe`.
- **Bundle identifier → `com.gravytraining.tidepool`.** This one had a deadline
  attached: the identifier decides where the OS stores saves, so changing it
  after release would orphan every player's progress. With zero players, now was
  the only free moment to fix it.

### Deliberately not renamed

The `__TIDEPOOLS__` dev hook (13 e2e files) and the IndexedDB store name in the
web backend. Both are internal identifiers no player ever sees, and the storage
one would drop any in-progress board on rename — churn and risk for a cosmetic
win.

### Added

- **`store/`** for Steam art, kept out of `src/assets/` so it can't be bundled
  into the binary, with the full asset-size table and the three things that get
  store art rejected.

## 2026-07-25 — Native saves on desktop (009 US2)

### Added

- **A file-based SaveStore for the desktop build**, so progress lives in
  `%APPDATA%\com.gravytraining.tidepools\save.json` instead of the webview's
  localStorage. The old arrangement worked locally but was invisible to Steam
  Auto-Cloud, which syncs file *patterns* — this is the prerequisite for cloud
  saves, not a rewrite for its own sake.
- It passes **the same `SaveStore` contract** the web and memory backends do, so
  the swappable seam is proven by construction rather than by assertion. Nothing
  in `game/` or `ui/` changed — the only edit outside `platform/` and `src-tauri/`
  is a test.

### Fixed

- **The desktop app would have silently used browser storage.** `isTauri()`
  tested for `window.__TAURI__`, which Tauri v2 only defines when
  `withGlobalTauri` is enabled — it isn't. The check looked correct and never
  matched. Now tests `__TAURI_INTERNALS__`.
- **`APP_VERSION` was still `0.0.0`** and is stamped inside every exported save.
  A save file that claims it came from 0.0.0 is useless when diagnosing a bug
  report. Now covered by the version-parity test alongside the other four sites.

### Design notes

One document rather than a file per key: a save has to move between machines as
one consistent unit, and a partial sync could otherwise land a journal that
disagrees with its stats. Writes are atomic (temp file → fsync → rename), so a
crash leaves the old save or the new one but never a half-written file. A burst
of writes coalesces into a single flush, since marking one cell touches several
namespaces. Corrupt or unwritable saves degrade to a gentle notice and a playable
session rather than a dead game.

Verified end-to-end against the real binary: toggled a setting, killed the app,
confirmed the bytes on disk with no stray temp file, relaunched, setting restored.

## 2026-07-25 — It's a desktop app (009 US1)

### Added

- **A native Windows build.** `npm run desktop:build` produces `tidepools.exe`
  (4.8 MB) plus NSIS and MSI installers (2.9 / 3.5 MB). Tauri wraps the existing
  web build — no game code moved, `src/` is still the only source of truth.
- **An app icon**, derived from the crab (the game's mascot, already on the
  splash) by [`scripts/make-icons.ts`](scripts/make-icons.ts). The crop centres
  the crab's own bounding box so the subject fills the frame and neither claw
  clips — the full illustration turns to mush at the 16px a taskbar renders.
  Also fixes the web build having no favicon at all.
- **A strict CSP** (`default-src 'self'`), which the self-contained build can now
  afford. Verified not to block fonts, audio, images, or the generator worker.
- **Version parity tests.** The version now lives in four places — `about.ts`,
  `package.json`, `tauri.conf.json`, `Cargo.toml`. An installer reading 0.1.0
  while the About screen reads 1.0.1 is the kind of thing that ships unnoticed,
  so the suite now fails instead. The Tauri placeholder identifier is guarded
  too: `com.tauri.dev` decides where saves live and would collide with every
  other unconfigured Tauri app on a player's machine.

Verified by attaching to the running desktop app over the WebView2 debugging
protocol: real board rendered (1056×784 canvas), both self-hosted fonts loaded,
Tauri bridge present, console and network log clean.

Two things worth knowing for the next session: the release profile is tuned for
size (`opt-level = "s"`, LTO, stripped), and rustup must be on the **MSVC**
toolchain — `windows-gnu` fails at link time against WebView2 with unhelpful
errors.

## 2026-07-25 — Self-hosted fonts (009 US4)

### Fixed

- **The app no longer needs the network to look like itself.** Bricolage and
  Nunito loaded from the Google Fonts CDN, so a downloaded or Steam build fell
  back to system fonts the moment it was offline — and the whole game is typeset
  in those two. Both are now bundled (`src/assets/fonts/`, `@font-face` in
  `index.css`), and `index.html` makes no external requests at all.

### Added

- **A guard against reintroducing it** (`src/offline-assets.test.ts`): asserts
  the page and stylesheet reference nothing remote, that every font the CSS asks
  for exists on disk, and that the OFL licence texts ship alongside. Pasting a
  CDN `<link>` back in now fails the suite instead of only showing up on a
  player's offline machine.

Both families are variable fonts, so one file per subset spans every weight the
design uses — 182 KB for all four, latin + latin-ext only. Verified against the
production build with every non-local request aborted: zero external requests,
both families loaded, headings in Bricolage and body in Nunito.

## 2026-07-25 — 1.0.1: the mistake sound

### Added

- **`mistake.mp3`** — the third and final sound. Two-sound coverage (water, rock)
  was a deliberate stop; this one earns its place because it's the only cue that
  reaches the player without making them look away from where they just clicked.
  The remaining four ids stay wired and silent by decision, not by omission.

### Fixed

- The clip arrived named `error.mp3`, which is not an event id — it would have
  been bundled and never played. `npm run check:audio` flagged it; renamed to
  match the id rather than renaming the id, since `mistake` is the name the
  trigger, the tests, and the rules text all use.

### Changed

- **Version 1.0.1**, in `about.ts` and `package.json`. The About screen now shows
  the full semver, so the two agree exactly instead of on major.minor — a prefix
  comparison would have quietly accepted 1.1 against 1.10.

## 2026-07-25 — About screen

### Added

- **About**, off Home alongside Shore journal and How to play: the wordmark, the
  version, and the credit line "A game by Gravytraining, copyright 2026". The
  strings live in one place (`ui/about/about.ts`) so nothing else hard-codes
  them.
- **A stated version — 1.0.** `package.json` moves off `0.0.0` to match, and a
  test asserts the two agree on major.minor so they can't quietly drift.

The copyright year is a fixed constant rather than `new Date().getFullYear()`:
a copyright year marks publication, and a build that changes with the wall clock
would undercut the determinism this repo otherwise holds to.

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
