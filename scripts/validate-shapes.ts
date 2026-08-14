// validate-shapes.ts — the shape gate (012 FR-013 / SC-001, SC-003), mirroring
// `validate-curated.ts`. Two passes:
//
//   1. Structure — every silhouette at every size it claims is one connected
//      region, with no isolated cell, big enough to be a puzzle.
//   2. Generatability — a board actually generates for every shape x size x
//      difficulty the catalog claims, and the oracle confirms it is uniquely
//      solvable, guess-free, and rated where it says.
//
// The second pass is the expensive one and the one that matters: it is the
// difference between "the shape looks fine" and "this shape can carry a puzzle".
//
// Run: `npm run validate:shapes`.
import { DIFFICULTY_TIERS, SIZE_TIERS, generateBoard, solve } from '@/core'
import { DEFAULT_SHAPE, SHAPE_IDS, checkSilhouette, shapePresent, shapeSupportsSize } from '@/core/shapes'

/** A seed per (shape, size, difficulty) — fixed, so runs are comparable. */
const SEEDS = ['SHAPE-0001', 'SHAPE-0002', 'SHAPE-0003']

let failures = 0

console.log('Structure\n')
for (const shape of SHAPE_IDS) {
  for (const size of SIZE_TIERS) {
    if (!shapeSupportsSize(shape, size)) continue
    const check = checkSilhouette(shapePresent(size, shape))
    const label = `${shape}/${size}`.padEnd(20)
    if (check.ok) {
      console.log(`  ok   ${label} ${String(check.cells).padStart(4)} cells`)
    } else {
      failures++
      console.error(
        `  FAIL ${label} cells=${check.cells} connected=${check.connected} isolated=${check.isolated.length}`,
      )
    }
  }
}

console.log('\nGeneratability\n')
for (const shape of SHAPE_IDS) {
  for (const size of SIZE_TIERS) {
    if (!shapeSupportsSize(shape, size)) continue
    for (const difficulty of DIFFICULTY_TIERS) {
      const label = `${shape}/${size}/${difficulty}`.padEnd(28)
      // A band passes if ANY of the fixed seeds yields a good board — the claim
      // is "this combination is playable", not "every seed works", which is not
      // true of the plain hexagon either.
      let ok = false
      let why = ''
      for (const seed of SEEDS) {
        try {
          const res = solve(
            generateBoard({
              seed,
              size,
              difficulty,
              clues: { connectivity: true, lineTotals: true },
              ...(shape === DEFAULT_SHAPE ? {} : { shape }),
            }),
          )
          if (res.solved && res.unique && res.rating === difficulty) {
            ok = true
            break
          }
          why = `solved=${res.solved} unique=${res.unique} rating=${res.rating}`
        } catch (e) {
          why = `threw ${(e as Error).message}`
        }
      }
      if (ok) console.log(`  ok   ${label}`)
      else {
        failures++
        console.error(`  FAIL ${label} ${why}`)
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} shape check(s) failed — not shippable.`)
  process.exit(1)
}
console.log('\nAll silhouettes validated (structure + generatable, unique, guess-free, on-tier).')
