// validate-curated.ts — the CI oracle gate (SC-002). Runs the engine over every
// shipped curated entry and fails the build if any board isn't uniquely, guess-
// free solvable at its stated difficulty. Run: `npm run validate:curated`.
import { generateBoard, solve } from '@/core'
import { loadCuratedPack, toBoardParams } from '@/game/board-source'

let failures = 0
const pack = loadCuratedPack()

for (const entry of pack.entries) {
  const label = `${entry.id} (${entry.seed}, ${entry.size}/${entry.difficulty})`
  try {
    const params = toBoardParams({ seed: entry.seed, size: entry.size, difficulty: entry.difficulty })
    const result = solve(generateBoard(params))
    const ok = result.solved && result.unique && result.rating === entry.difficulty
    if (ok) {
      console.log(`ok   ${label}`)
    } else {
      failures++
      console.error(
        `FAIL ${label}: solved=${result.solved} unique=${result.unique} rating=${result.rating}`,
      )
    }
  } catch (e) {
    failures++
    console.error(`FAIL ${label}: threw ${(e as Error).message}`)
  }
}

if (failures > 0) {
  console.error(`\n${failures} curated board(s) failed validation — not shippable.`)
  process.exit(1)
}
console.log(`\nAll ${pack.entries.length} curated boards validated (unique, guess-free, on-tier).`)
