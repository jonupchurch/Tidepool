# Store art

Steam store and library assets. **Nothing here ships inside the game** — that's
the point of keeping it out of `src/assets/`, which Vite bundles into the binary.
Art the game actually displays (the splash) lives in `src/assets/`.

## What Steam asks for

All PNG or JPG, at these exact sizes.

| Asset | Size | Where it appears |
|---|---|---|
| Header capsule | 460 × 215 | Store page top, search results — seen most |
| Small capsule | 231 × 87 | Search result rows |
| Main capsule | 616 × 353 | Front-page features, sale pages |
| Vertical capsule | 374 × 448 | Front-page daily deals |
| Library capsule | 600 × 900 | The player's library grid, after purchase |
| Library header | 920 × 430 | Library detail view |
| Library hero | 3840 × 1240 | Banner behind the library page |
| **Library logo** | 1280 × 720, **transparent** | Composited *over* the hero |
| Page background | 1438 × 810 | Store page backdrop |
| Community icon | 184 × 184 | Forums, groups |
| Screenshots | 1920 × 1080 | Minimum 5 |

## Three things that get art rejected or looking wrong

- **The title must be legible in every capsule.** This is the most common
  rejection. A wordmark that reads fine at 616×353 can be illegible at 231×87.
- **The library logo must have real transparency.** Steam draws it over the hero
  art; an opaque one shows as a rectangle stuck on top. It should be the
  *wordmark alone*, not a scene.
- **No marketing text in capsules** — no review quotes, awards, discount badges,
  or "Now available". Steam rejects these.

## Current files

Both are landscape 3:2-ish illustrations carrying the wordmark, so they crop well
to the wide capsules and not at all to the portrait ones.

- `title-scene.png` — 1536×1024, shore at low tide. Crops to the **header
  capsule** (460×215), **main capsule** (616×353), or **page background**
  (1438×810).
- `steam-scene.png` — 1448×1086, above/below the waterline. Same uses.
  **Not usable as the library logo**: no alpha channel, wrong aspect, and it's a
  scene rather than a wordmark.

Still needed, and not croppable from either:

- **Library capsule** 600×900 — portrait; needs its own composition. The hermit
  crab in the shell would carry it.
- **Library hero** 3840×1240 — much wider and larger than these sources;
  generate at size rather than upscaling.
- **Library logo** 1280×720 — the wordmark alone, on transparency.
- **Small capsule** 231×87 — check the title is still readable at that size.

## Naming

Name files for the asset they are (`header-capsule.png`, `library-logo.png`), not
for where they came from. When you upload to the partner site the sizes are the
only thing that distinguishes them, and mislabelled art is easy to upload into
the wrong slot.
