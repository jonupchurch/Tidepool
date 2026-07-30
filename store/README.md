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

Every slot now has art. Two things still stand between these files and the
partner site, both noted in the table.

| File | Size | Slot | Ready? |
|---|---|---|---|
| `header-capsule@2x.png` | 920×430 | Header capsule 460×215 | downscale |
| `small-capsule@2x.png` | 462×174 | Small capsule 231×87 | downscale |
| `main-capsule@2x.png` | 1232×706 | Main capsule 616×353 | downscale |
| `vertical-capsule@2x.png` | 748×896 | Vertical capsule 374×448 | downscale |
| `library-capsule.png` | 600×900 | Library capsule | yes |
| `library-header.png` | 920×430 | Library header | yes |
| `library-hero.png` | 3840×1240 | Library hero | yes |
| `library-logo.png` | 1280×720 | Library logo | **no — opaque** |
| `page-background.png` | 1438×810 | Page background | yes |
| `community-icon-256.png` | 256×256 | Community icon 184×184 | downscale |
| `screenshot-1..5.png` | 1920×1080 | Screenshots | yes |

**The `@2x` files cannot be uploaded as they are.** Steam's capsule slots want
exact pixel dimensions; supplying twice the size is how you generate the art,
not how you submit it. Downscale to the slot size before upload — and check the
wordmark survives it, since the small capsule is where legibility dies.

**`library-logo.png` is RGB with no alpha channel.** Steam composites the logo
over the hero, so as exported it renders as an opaque rectangle sitting on the
banner — the first failure listed above. It needs re-exporting as the wordmark
alone on transparency.

`title-scene.png` (1536×1024) and `steam-scene.png` (1448×1086) are the earlier
source illustrations, kept as crop sources rather than upload candidates.

Both 920×430 files are the same scene from different generations. The one
assigned to the **header capsule** is the tighter crop with the larger wordmark,
because that slot renders at 460×215 where the title has the least room; the
wider, more detailed one takes the **library header**, which displays large.
Swapping them is one `git mv` if that reads wrong.

## Naming

Name files for the asset they are (`header-capsule.png`, `library-logo.png`), not
for where they came from. When you upload to the partner site the sizes are the
only thing that distinguishes them, and mislabelled art is easy to upload into
the wrong slot.
