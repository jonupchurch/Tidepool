// check-audio.ts — sound status, mirroring `check:art`. Sounds are discovered
// at build time from `src/assets/audio/<sound-id>.<ext>` (see audio/sounds.ts),
// so this reports which event ids have a clip and which are still silent.
// Run: `npm run check:audio`.
import { readdirSync, statSync } from 'node:fs'
import { SOUND_IDS } from '@/audio/sounds'

const DIR = 'src/assets/audio'
const EXT = /\.(mp3|wav|ogg)$/i

let files: string[] = []
try {
  files = readdirSync(DIR).filter((f) => EXT.test(f))
} catch {
  // no folder yet — everything is silent
}

const byId = new Map<string, string>()
for (const f of files) byId.set(f.replace(EXT, ''), f)

console.log(`Sounds — ${DIR}/<id>.mp3\n`)
let have = 0
for (const id of SOUND_IDS) {
  const file = byId.get(id)
  if (!file) {
    console.log(`  ..  ${id.padEnd(14)} silent (no ${id}.mp3 yet)`)
    continue
  }
  have++
  const kb = Math.round(statSync(`${DIR}/${file}`).size / 1024)
  console.log(`  ok  ${id.padEnd(14)} ${file.padEnd(20)} ${String(kb).padStart(4)} KB`)
}

// A file whose name isn't an event id is never played — worth flagging loudly.
const strays = [...byId.keys()].filter((k) => !(SOUND_IDS as readonly string[]).includes(k))
if (strays.length > 0) {
  console.log(`\n  !!  not an event id, so never played: ${strays.join(', ')}`)
  console.log(`      rename to one of: ${SOUND_IDS.join(', ')}`)
}

console.log(`\n${have}/${SOUND_IDS.length} sounds in place.`)
