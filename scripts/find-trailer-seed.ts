// find-trailer-seed.ts — search the seed space for boards worth filming.
// Run: `npm run find:seed` (add `-- --per-word 200` to widen the search).
//
// Boards are seed-deterministic, so a seed found here can be typed into Home's
// seed entry and re-recorded identically until the take is clean. That is the
// whole point: pick the board before the camera is on, not during.
//
// What "worth filming" means here, in priority order:
//
//   1. A pool small enough to *finish on camera*. This is the one that matters
//      and the one that is easy to get wrong: the creature a pool yields is a
//      pure function of its size, so it is tempting to hunt for a huge pool and
//      a Legendary. But water on a Large board forms regions of 80-98 cells, so
//      the Legendary is nearly free and filling one takes the whole video. A
//      3-8 cell pool completes in a couple of seconds — that is the reveal a
//      viewer actually sees happen.
//   2. Several *different* creatures across the board's pools, so the footage
//      shows a collection loop rather than the same portrait repeatedly.
//   3. Both connectivity clues on screen — `{n}` connected and `-n-` split. It
//      is the mechanic that makes this not just another Hexcells, so a viewer
//      scanning for novelty needs to see both in one frame.
//   4. Enough pools to show the loop repeating, few enough to stay legible.
//
// Scored, not filtered: a board can be short on one and still be the best take.
import { generateBoard, solve } from '@/core'
import type { Board, DifficultyTier, SizeTier } from '@/core'
import { toBoardParams } from '@/game/board-source'
import { creatureDef } from '@/game/creatures'
import { waterPools } from '@/game/pools'

/** The generator's own vocabulary, so found seeds look native and type easily. */
const SEED_WORDS = [
  'KELP', 'CORAL', 'TIDE', 'SHELL', 'WAVE', 'REEF', 'SAND', 'FOAM', 'SURF', 'DUNE',
  'COVE', 'SHOAL', 'BRINE', 'PEARL', 'CRAB', 'MARSH', 'INLET', 'SPRAY', 'DRIFT', 'EBB',
  'SWELL', 'LAGOON', 'ANEMONE', 'URCHIN',
]

/** Deep is the only tier where connectivity is *necessary*, so the mechanic
 *  the trailer is selling is guaranteed load-bearing rather than decorative. */
const COMBOS: ReadonlyArray<{ size: SizeTier; difficulty: DifficultyTier }> = [
  { size: 'Medium', difficulty: 'Deep' },
  { size: 'Large', difficulty: 'Deep' },
]

const argv = process.argv.slice(2)
const perWordArg = argv.indexOf('--per-word')
const PER_WORD = perWordArg === -1 ? 120 : Number(argv[perWordArg + 1])

interface Candidate {
  seed: string
  size: SizeTier
  difficulty: DifficultyTier
  score: number
  /** The smallest pool that still reveals something — the filmable one. */
  quickPool: number
  quickCreature: string
  species: number
  pools: number
  connected: number
  split: number
}

function evaluate(board: Board): Omit<Candidate, 'seed' | 'size' | 'difficulty'> {
  const pools = waterPools(board)
  const sizes = pools.map((p) => p.cells.length)
  const maxPool = sizes.length ? Math.max(...sizes) : 0

  let connected = 0
  let split = 0
  for (const cell of board.cells.values()) {
    if (cell.clue?.connectivity === 'connected') connected++
    if (cell.clue?.connectivity === 'split') split++
  }

  // The filmable reveal: the smallest pool that finishes inside a few seconds.
  const quick = pools
    .filter((p) => p.cells.length >= 3 && p.cells.length <= 8)
    .sort((a, b) => a.cells.length - b.cells.length)[0]
  const species = new Set(pools.map((p) => p.creatureId)).size

  let score = 0
  // Without a quick pool there is no reveal to cut to, so this dominates.
  if (quick) score += 100
  // Distinct portraits across the board — the collection loop, on screen.
  score += Math.min(species, 5) * 20
  // A Legendary still earns its place as the finale, but it is nearly free.
  if (maxPool >= 15) score += 15

  // Both clue forms in one board, and neither so rare it's a needle on screen.
  if (connected > 0 && split > 0) score += 40
  if (connected >= 2 && split >= 2) score += 15

  // Enough reveals to read as a loop; past ~9 the board is busy on camera.
  if (pools.length >= 4 && pools.length <= 8) score += 20
  else if (pools.length > 9) score -= 10

  const name = (id: string): string => creatureDef(id)?.name ?? id

  return {
    score,
    quickPool: quick?.cells.length ?? 0,
    quickCreature: quick ? name(quick.creatureId) : '—',
    species,
    pools: pools.length,
    connected,
    split,
  }
}

const found: Candidate[] = []
let checked = 0
let rejected = 0
const started = process.hrtime.bigint()

for (const word of SEED_WORDS) {
  for (let n = 0; n < PER_WORD; n++) {
    const seed = `${word}-${String(n).padStart(4, '0')}`
    for (const { size, difficulty } of COMBOS) {
      checked++
      try {
        const board = generateBoard(toBoardParams({ seed, size, difficulty }))
        // Never film a board the engine won't stand behind.
        const result = solve(board)
        if (!result.solved || !result.unique || result.rating !== difficulty) {
          rejected++
          continue
        }
        found.push({ seed, size, difficulty, ...evaluate(board) })
      } catch {
        rejected++
      }
    }
  }
}

const secs = Number(process.hrtime.bigint() - started) / 1e9
found.sort((a, b) => b.score - a.score || a.quickPool - b.quickPool)

console.log(
  `\nChecked ${checked} boards in ${secs.toFixed(1)}s — ${found.length} on-tier, ${rejected} rejected.\n`,
)
console.log('  SEED             SIZE    POOLS  SPECIES  QUICK REVEAL          {n}  -n-   SCORE')
console.log('  ' + '-'.repeat(82))
for (const c of found.slice(0, 12)) {
  const reveal = c.quickPool ? `${c.quickCreature} (${c.quickPool})` : '— none filmable'
  console.log(
    `  ${c.seed.padEnd(15)} ${c.size.padEnd(7)} ${String(c.pools).padStart(5)}  ` +
      `${String(c.species).padStart(7)}  ${reveal.padEnd(20)} ` +
      `${String(c.connected).padStart(3)}  ${String(c.split).padStart(3)}  ${String(c.score).padStart(5)}`,
  )
}
console.log(
  `\nType a seed into Home → seed entry, appending the size and tier:\n` +
    `  e.g. "${found[0]?.seed ?? 'CORAL-4417'} ${found[0]?.size ?? 'Large'} Deep"\n`,
)
