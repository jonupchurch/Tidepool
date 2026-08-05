# Store art

Steam store and library assets. **Nothing here ships inside the game** — that's
the point of keeping it out of `src/assets/`, which Vite bundles into the binary.
Art the game actually displays (the splash) lives in `src/assets/`.

## What Steam asks for

All PNG or JPG, at these exact sizes.

| Asset | Size | Where it appears |
|---|---|---|
| Header capsule | 920 × 430 | Store page top, search results — seen most |
| Small capsule | 462 × 174 | Search result rows |
| Main capsule | 1232 × 706 | Front-page features, sale pages |
| Vertical capsule | 748 × 896 | Front-page daily deals |
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

Every slot has art, and every file is at its slot's exact size — ready to
upload as-is.

| File | Size | Slot | Ready? |
|---|---|---|---|
| `header-capsule@2x.png` | 920×430 | Header capsule | yes |
| `small-capsule.png` | 462×174 | Small capsule | yes |
| `main-capsule@2x.png` | 1232×706 | Main capsule | yes |
| `vertical-capsule.png` | 748×896 | Vertical capsule | yes |
| `library-capsule.png` | 600×900 | Library capsule | yes |
| `library-header.png` | 920×430 | Library header | yes |
| `library-hero.png` | 3840×1240 | Library hero | yes |
| `library-logo.png` | 1280×720 | Library logo | yes |
| `page-background.png` | 1438×810 | Page background | yes |
| `community-icon-256.png` | 256×256 | Community icon 184×184 | downscale |
| `screenshot-1..5.png` | 1920×1080 | Screenshots | yes |

**The `@2x` names are a leftover, not an instruction.** They were written when
this file listed the capsule slots at half their real size (460×215, 231×87,
616×353, 374×448) and the art therefore looked like it needed downscaling. It
does not: 920×430 *is* the header capsule, 1232×706 *is* the main capsule.
Upload those two as they are. Dropping the suffix is a rename nobody has done
yet.

### The wordmark assets

`small-capsule.png`, `vertical-capsule.png` and `library-logo.png` are the
wordmark alone on transparency, generated from `wordmark-source.png` by
`npm run make:store-logo`. Don't hand-edit them — change the source and re-run.

The library logo has to be transparent (Steam draws it over the hero), and the
capsules are transparent because they're the same asset from the same script.
That means those two capsule slots are **a title on empty space, not
illustrated tiles** — a deliberate choice, and a departure from how Steam
capsules usually look. The vertical capsule feels it most: the wordmark is
3.88:1 and the slot is portrait, so the title spans the width and roughly 80% of
the tile is empty. The previous illustrated versions are kept as
`small-capsule-scene.png` and `vertical-capsule-scene.png` — swapping back is
one `git mv` each.

`title-scene.png` (1536×1024) and `steam-scene.png` (1448×1086) are the earlier
source illustrations, kept as crop sources rather than upload candidates.
`wordmark-source.png` (1672×941) is the logo as delivered, on white — it is a
source, never an upload.

Both 920×430 files are the same scene from different generations. The one
assigned to the **header capsule** is the tighter crop with the larger wordmark,
because that slot renders small in search results where the title has the least
room; the
wider, more detailed one takes the **library header**, which displays large.
Swapping them is one `git mv` if that reads wrong.

## Naming

Name files for the asset they are (`header-capsule.png`, `library-logo.png`), not
for where they came from. When you upload to the partner site the sizes are the
only thing that distinguishes them, and mislabelled art is easy to upload into
the wrong slot.
