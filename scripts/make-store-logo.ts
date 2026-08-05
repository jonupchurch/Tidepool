// make-store-logo.ts — derive the transparent Steam wordmark assets from
// `store/wordmark-source.png`. Run: `npm run make:store-logo`.
//
// Not part of the build, for the same reason as make-icons.ts: store art
// changes roughly never, and regenerating it every build would churn a megabyte
// of binary files in git. Run it by hand when the wordmark changes, and commit
// the result.
//
// Two jobs here, and the first is the one that matters. The source is a wordmark
// sitting on flat white, and Steam composites the library logo *over* the hero
// art — an opaque one shows as a white rectangle stuck on the banner, which is
// the single most common way this asset gets shipped wrong. So the white has to
// become real alpha, not be trusted to "look white enough".
//
// Keying it is less trivial than thresholding, because the artwork contains its
// own near-white pixels (highlights on the letters, foam on the wave) that are
// indistinguishable from the background by colour alone. Shape tells them apart
// where colour can't: the white is grouped into connected regions, and a region
// is background if it reaches the border or is too big to be a highlight — which
// is what rescues the enclosed white inside a D, P or O.
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import sharp from 'sharp'

const SOURCE = 'store/wordmark-source.png'

/** A pixel at least this white *and reachable from the border* is background. */
const WHITE_HI = 250
/** Fully opaque at or below this. Between the two, the edge ramps — antialiasing. */
const WHITE_LO = 200
/** How far the ramp reaches in from the flooded edge. Covers the antialiased rim. */
const EDGE_PX = 3
/** Enclosed white this big is a letter counter, not a sparkle. Tuned from the run's own report. */
const MIN_HOLE_PX = 1500
/** Alpha below this is halo, not artwork — ignored when finding the crop. */
const ALPHA_FLOOR = 32
/**
 * How many inked pixels a row or column needs before the crop counts it as part
 * of the wordmark. The source carries a lone dark pixel in its bottom-right
 * corner; measuring the crop pixel-by-pixel let that one speck drag the box down
 * to the last scanline, and the wordmark then got scaled to share the frame with
 * a band of nothing. Real edges of the artwork ink hundreds of pixels per row.
 */
const MIN_INK = 4

/**
 * Slot sizes are Steam's, exact — see store/README.md. `fill` is how much of the
 * slot the wordmark spans; the rest is transparent padding. Capsules get a
 * margin so the title isn't jammed against the tile edge. The library logo runs
 * wider because Steam scales and positions it itself.
 */
const SLOTS = [
  { file: 'store/small-capsule.png', width: 462, height: 174, fill: 0.94 },
  { file: 'store/vertical-capsule.png', width: 748, height: 896, fill: 0.9 },
  { file: 'store/library-logo.png', width: 1280, height: 720, fill: 0.95 },
]

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h, channels } = info
const px = w * h

/** Per-pixel min of R/G/B — 255 on pure white, lower the more coloured it is. */
const minc = new Uint8Array(px)
for (let i = 0; i < px; i++) {
  const o = i * channels
  minc[i] = Math.min(data[o], data[o + 1], data[o + 2])
}

// Group the white into connected regions, then decide which ones are background.
// Touching the border is the obvious case. The subtler one is the enclosed white
// inside a D, P or O: it never reaches the border, but it is still background —
// leave it opaque and the letters read as white blobs over the hero. What has to
// stay opaque is the artwork's own white: sparkles on the letters, foam on the
// wave. Size separates them cleanly — counters are thousands of pixels, a
// sparkle is tens — so a region is background if it reaches the border *or* is
// bigger than a highlight could be.
const exterior = new Uint8Array(px)
const seen = new Uint8Array(px)
const enclosed: number[] = []
for (let seed = 0; seed < px; seed++) {
  if (seen[seed] || minc[seed] < WHITE_HI) continue

  const region: number[] = []
  const stack = [seed]
  seen[seed] = 1
  let touchesBorder = false
  while (stack.length > 0) {
    const i = stack.pop()!
    region.push(i)
    const x = i % w
    const y = (i / w) | 0
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesBorder = true

    const visit = (n: number) => {
      if (!seen[n] && minc[n] >= WHITE_HI) {
        seen[n] = 1
        stack.push(n)
      }
    }
    if (x > 0) visit(i - 1)
    if (x < w - 1) visit(i + 1)
    if (y > 0) visit(i - w)
    if (y < h - 1) visit(i + w)
  }

  if (!touchesBorder) enclosed.push(region.length)
  if (touchesBorder || region.length >= MIN_HOLE_PX) {
    for (const i of region) exterior[i] = 1
  }
}

const bigEnclosed = enclosed.sort((a, b) => b - a).slice(0, 12)
console.log(`  largest enclosed white regions: ${bigEnclosed.join(', ')} px`)
console.log(`  (cut at ${MIN_HOLE_PX} px — above it reads as a letter counter, below as a highlight)`)

// Grow the exterior a few pixels inward to mark the antialiased rim. Only pixels
// in that band get the soft ramp; interior highlights are far from any border
// white and stay fully opaque.
let rim = exterior
for (let pass = 0; pass < EDGE_PX; pass++) {
  const next = Uint8Array.from(rim)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (rim[i]) continue
      if (
        (x > 0 && rim[i - 1]) ||
        (x < w - 1 && rim[i + 1]) ||
        (y > 0 && rim[i - w]) ||
        (y < h - 1 && rim[i + w])
      ) {
        next[i] = 1
      }
    }
  }
  rim = next
}

// Alpha, and then un-blend the colour. An edge pixel is what the artist drew
// mixed with the white behind it (c = a·fg + (1−a)·255); pasting it over dark
// hero art without solving back for fg leaves a white fringe around the letters.
//
// Row and column ink counts are tallied here as well; the crop is measured off
// them below rather than off individual pixels.
const span = WHITE_HI - WHITE_LO
const rowInk = new Uint32Array(h)
const colInk = new Uint32Array(w)
let opaque = 0
for (let i = 0; i < px; i++) {
  const o = i * channels
  let a = 255
  if (exterior[i]) a = 0
  else if (rim[i]) a = Math.max(0, Math.min(255, Math.round(((WHITE_HI - minc[i]) / span) * 255)))

  data[o + 3] = a
  if (a === 0) {
    data[o] = data[o + 1] = data[o + 2] = 0
  } else if (a < 255) {
    const f = a / 255
    for (let c = 0; c < 3; c++) {
      data[o + c] = Math.max(0, Math.min(255, Math.round((data[o + c] - 255 * (1 - f)) / f)))
    }
  }
  if (a > 0) opaque++
  if (a >= ALPHA_FLOOR) {
    rowInk[(i / w) | 0]++
    colInk[i % w]++
  }
}

console.log(`\nKeyed ${SOURCE} — ${w}×${h}, ${((opaque / px) * 100).toFixed(1)}% of the frame is artwork.`)

/** First and last index whose ink clears MIN_INK — a speck can't move either. */
const extent = (ink: Uint32Array) => {
  let lo = 0
  let hi = ink.length - 1
  while (lo < hi && ink[lo] < MIN_INK) lo++
  while (hi > lo && ink[hi] < MIN_INK) hi--
  return { lo, hi }
}
const { lo: minX, hi: maxX } = extent(colInk)
const { lo: minY, hi: maxY } = extent(rowInk)

const crop = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
const trimmed = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .extract(crop)
  .png()
  .toBuffer()
console.log(
  `  wordmark bounding box ${crop.width}×${crop.height} (${(crop.width / crop.height).toFixed(2)}:1)\n`,
)

for (const { file, width, height, fill } of SLOTS) {
  const innerW = Math.round(width * fill)
  const innerH = Math.round(height * fill)
  const padX = width - innerW
  const padY = height - innerH

  mkdirSync(dirname(file), { recursive: true })
  await sharp(trimmed)
    .resize(innerW, innerH, { fit: 'contain', background: TRANSPARENT, kernel: 'lanczos3' })
    .extend({
      left: Math.floor(padX / 2),
      right: Math.ceil(padX / 2),
      top: Math.floor(padY / 2),
      bottom: Math.ceil(padY / 2),
      background: TRANSPARENT,
    })
    .png()
    .toFile(file)
  console.log(`  ok  ${file.padEnd(30)} ${`${width}×${height}`.padEnd(9)} RGBA`)
}

console.log(`\nUpload-ready at Steam's exact slot sizes. Regenerate with \`npm run make:store-logo\`.`)
