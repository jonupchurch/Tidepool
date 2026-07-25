// make-icons.ts — derive the app icon and web favicons from the crab portrait,
// the game's mascot (it's already the splash screen). Run: `npm run make:icons`.
//
// Not part of the build: icons change roughly never, and regenerating them on
// every build would churn binary files in git for no reason. Run it by hand when
// the source art or the crop changes, and commit the result.
//
// The crop is the interesting part. `crab.png` is a full illustrated scene —
// kelp, rocks, sand, sea glass — which turns to mush at the 16px a taskbar or
// browser tab actually renders. These numbers centre the crab's own bounding box
// in a square so the subject fills the frame and neither claw clips.
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const SOURCE = 'public/img/crab.png'

/** Crab bounding box in the 1240² source is x 230..1010, y 370..1000. */
const CROP = { left: 220, top: 285, width: 800, height: 800 }

/** Tauri's `icon` command fans a single square PNG out to every platform size. */
const TAURI_SOURCE = { dir: 'src-tauri/icons', file: 'icon.png', size: 1024 }

/** Browser tab + home-screen icons for the web build. */
const FAVICONS = [
  { file: 'public/favicon.png', size: 32 },
  { file: 'public/apple-touch-icon.png', size: 180 },
]

const base = () => sharp(SOURCE).extract(CROP)

mkdirSync(TAURI_SOURCE.dir, { recursive: true })
const tauriPath = `${TAURI_SOURCE.dir}/${TAURI_SOURCE.file}`
await base().resize(TAURI_SOURCE.size, TAURI_SOURCE.size).png().toFile(tauriPath)
console.log(`  ok  ${tauriPath.padEnd(32)} ${TAURI_SOURCE.size}²  (source for \`tauri icon\`)`)

for (const { file, size } of FAVICONS) {
  await base().resize(size, size, { kernel: 'lanczos3' }).png().toFile(file)
  console.log(`  ok  ${file.padEnd(32)} ${size}²`)
}

console.log(`\nIcons derived from ${SOURCE}. Regenerate with \`npm run make:icons\`.`)
