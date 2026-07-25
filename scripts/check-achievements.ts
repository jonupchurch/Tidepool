// check-achievements.ts — print the achievement catalogue.
//
// Steamworks has no bulk import for achievements: every one is typed into the
// partner site by hand as an API name, a display name, and a description. This
// prints them in that order so the list can be worked through without opening
// the source, and re-run later to see what's been added since.
// Run: `npm run check:achievements`.
import { ACHIEVEMENTS, type Achievement } from '@/game/achievements'

const byCategory = new Map<string, Achievement[]>()
for (const a of ACHIEVEMENTS) {
  const list = byCategory.get(a.category) ?? []
  list.push(a)
  byCategory.set(a.category, list)
}

console.log(`Achievements — ${ACHIEVEMENTS.length} total\n`)

for (const [category, list] of byCategory) {
  console.log(`${category} (${list.length})`)
  for (const a of list) {
    console.log(`  ${a.id.padEnd(22)} ${a.name.padEnd(22)} ${a.description}`)
  }
  console.log()
}

// Steam's ceiling. Worth knowing before designing a hundred more.
const LIMIT = 100
if (ACHIEVEMENTS.length > LIMIT) {
  console.log(`!!  over Steam's limit of ${LIMIT} — ${ACHIEVEMENTS.length} defined`)
  process.exitCode = 1
} else {
  console.log(`Room for ${LIMIT - ACHIEVEMENTS.length} more before Steam's limit of ${LIMIT}.`)
}

console.log(
  '\nThe id column is the Steamworks "API Name" — it is permanent once a player\n' +
    'has earned it. Renaming one takes the achievement away from everybody.',
)
