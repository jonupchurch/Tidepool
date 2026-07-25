// check-art.ts — creature portrait status. Art is discovered by convention
// (`public/img/<id>.png`, see game/creatures.ts), so this reports which of the
// catalog's creatures have a file, which are still placeholders, and which are
// heavier than a desktop build wants. Run: `npm run check:art`.
import { readFileSync, statSync } from 'node:fs'
import { CREATURES } from '@/game/creatures'

/** Rendered at 64px in the journal and 96px on the splash — 512² is ample. */
const MAX_EDGE = 512
/** A dozen portraits ship inside the binary; keep each one modest. */
const MAX_KB = 150

/** width/height from a PNG's IHDR chunk (bytes 16..23, big-endian). */
function pngSize(file: string): { w: number; h: number } | null {
  const b = readFileSync(file)
  if (b.length < 24 || b.readUInt32BE(12) !== 0x49484452) return null
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

let missing = 0
let heavy = 0
const rows: string[] = []

for (const c of CREATURES) {
  const file = `public/img/${c.id}.png`
  let stat: ReturnType<typeof statSync> | null = null
  try {
    stat = statSync(file)
  } catch {
    missing++
    rows.push(`  ..  ${c.id.padEnd(12)} ${c.name.padEnd(15)} placeholder (no ${c.id}.png yet)`)
    continue
  }

  const kb = Math.round(stat.size / 1024)
  const dim = pngSize(file)
  const size = dim ? `${dim.w}x${dim.h}` : 'not a PNG'
  const tooBig = kb > MAX_KB || (dim ? Math.max(dim.w, dim.h) > MAX_EDGE : false)
  if (tooBig) heavy++
  rows.push(
    `  ${tooBig ? '!!' : 'ok'}  ${c.id.padEnd(12)} ${c.name.padEnd(15)} ${size.padEnd(11)} ${String(kb).padStart(5)} KB`,
  )
}

console.log(`Creature portraits — public/img/<id>.png\n`)
console.log(rows.join('\n'))

const have = CREATURES.length - missing
console.log(`\n${have}/${CREATURES.length} portraits in place.`)
if (heavy > 0) {
  console.log(
    `${heavy} over budget (max ${MAX_EDGE}px / ${MAX_KB} KB). They still work — this is bundle weight, not a break.`,
  )
}
