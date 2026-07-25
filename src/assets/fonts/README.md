# Fonts — self-hosted, bundled, offline-safe

The app is typeset entirely in these two. They used to load from the Google
Fonts CDN, which meant a downloaded build (and every Steam build) fell back to
system fonts as soon as it was offline. They're now bundled into the binary.

| Family | Role | Files |
|--------|------|-------|
| Bricolage Grotesque | display — headings, numerals, the wordmark (`font-display`) | `bricolage-grotesque-latin*.woff2` |
| Nunito | body text (`font-sans`, the default) | `nunito-latin*.woff2` |

## Why these files and no others

Both are **variable** fonts: one file per subset covers the whole weight range
the design uses (Bricolage 600–800, Nunito 400–900). Static per-weight files
would be more files and more bytes.

Only **latin** and **latin-ext** are bundled. Google also serves Cyrillic and
Vietnamese subsets; nothing in the game uses them, and each one is weight
shipped to every player. Add a subset here only if the text needs it.

## Changing or adding a font

`@font-face` rules live at the top of [`src/index.css`](../../index.css), with
paths relative to that file so **Vite hashes and bundles them**. That's
deliberate: a missing or misnamed file fails the build instead of 404-ing at
runtime in front of a player. Don't move these to `public/` — that trades the
loud failure for a silent one.

To pull a fresh version, fetch the CSS from the Google Fonts API with a modern
browser User-Agent (older UAs get `.ttf` instead of `.woff2`), then download the
`.woff2` each `@font-face` block points at and copy its `unicode-range` across
verbatim.

## Licensing

Both fonts are under the **SIL Open Font License 1.1** — free to bundle,
redistribute, and ship in a commercial product, provided the license text
travels with them. That's what `OFL-Bricolage-Grotesque.txt` and `OFL-Nunito.txt`
are for; keep them here. The OFL also forbids selling the fonts on their own
(irrelevant here) and requires that any *modified* version be renamed.

- Bricolage Grotesque — © 2022 The Bricolage Grotesque Project Authors
- Nunito — © 2014 The Nunito Project Authors
