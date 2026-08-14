// find-curated-seeds.ts — search the generator for boards worth blessing, and
// emit ready-to-paste manifest entries (013 FR-013).
//
// Hand-picking 36 boards that each validate as unique, guess-free and exactly
// on-tier does not scale, and — more to the point — cannot be redone. Every time
// a clue mechanic changes, the pack has to be found again. So this is a real
// script rather than something run once and thrown away.
//
// It reports what it REJECTED and why. A band that yields nothing is information
// about the generator, not just a failed search.
//
// Run: `npm run find:curated -- --band=kelp` (or with no args for every band).
import {
  type ClueToggles,
  type DifficultyTier,
  type ShapeId,
  type SizeTier,
  generateBoard,
  solve,
} from '@/core'
import { loadCuratedPack } from '@/game/board-source'

interface Band {
  /** group id in the manifest */
  id: string
  name: string
  blurb: string
  page: number
  size: SizeTier
  difficulty: DifficultyTier
  clues: ClueToggles
  shape?: ShapeId
  /** seed words to walk; each is tried with numeric suffixes */
  words: string[]
  /** how many boards this run wants */
  want: number
  /** display names for the boards, in order */
  boardNames: string[]
}

const PLAIN: ClueToggles = { connectivity: true, lineTotals: true }
const RUNS: ClueToggles = { connectivity: true, lineTotals: true, lineConnectivity: true }

/**
 * Page two: deeper and colder than page one, and introducing one new thing at a
 * time. Row annotations arrive first on familiar hexagons; then shapes arrive on
 * boards without annotations; only then do the two combine.
 */
export const BANDS: Band[] = [
  {
    id: 'drowned-reef',
    name: 'Drowned Reef',
    blurb: 'Where the shallows give out.',
    page: 2,
    size: 'Medium',
    difficulty: 'Tricky',
    clues: PLAIN,
    words: ['DROWN', 'REEF', 'SUNK'],
    want: 6,
    boardNames: ['First Descent', 'Broken Coral', 'Green Dark', 'Silt', 'The Ledge', 'Undertow'],
  },
  {
    id: 'the-atoll',
    name: 'The Atoll',
    blurb: 'A ring of stone around still water.',
    page: 2,
    size: 'Medium',
    difficulty: 'Tricky',
    clues: PLAIN,
    shape: 'atoll',
    words: ['ATOLL', 'RING', 'LAGOON'],
    want: 6,
    boardNames: ['Outer Ring', 'Still Centre', 'Coral Wall', 'The Gap', 'Windward', 'Leeward'],
  },
  {
    id: 'crescent-bay',
    name: 'Crescent Bay',
    blurb: 'A coast with a bite taken out of it.',
    page: 2,
    size: 'Medium',
    difficulty: 'Deep',
    clues: PLAIN,
    shape: 'crescent',
    words: ['BAY', 'HOOK', 'CURVE'],
    want: 6,
    boardNames: ['The Hook', 'Inner Curve', 'Sheltered', 'Open Horn', 'Slack Water', 'The Bight'],
  },
  {
    id: 'the-braid',
    name: 'The Braid',
    blurb: 'Rows that run together, or come apart.',
    page: 2,
    size: 'Medium',
    difficulty: 'Deep',
    clues: RUNS,
    words: ['BRAID', 'WEAVE', 'STRAND'],
    want: 6,
    boardNames: ['One Run', 'Two Threads', 'Counterflow', 'The Knot', 'Loose Weave', 'Tight Weave'],
  },
  {
    id: 'the-shoal',
    name: 'The Shoal',
    blurb: 'Long water, and not much of it deep.',
    page: 2,
    // Deep, not Tricky. Row annotations are a Deep-tier technique, so reduction
    // at Tricky is not allowed to lean on them and strips every one — this band
    // searched 180 seeds and found nothing until the tier matched the mechanic.
    // A band asking for `RUNS` must be Deep, full stop.
    size: 'Large',
    difficulty: 'Deep',
    clues: RUNS,
    shape: 'shoal',
    words: ['SHOAL', 'BAR', 'FLATS'],
    want: 6,
    boardNames: ['Long Bar', 'Low Tide', 'The Flats', 'Sandline', 'Ripple', 'Far Bank'],
  },
  {
    id: 'the-sound',
    name: 'The Sound',
    blurb: 'Cold, narrow, and a long way down.',
    page: 2,
    size: 'Large',
    difficulty: 'Deep',
    clues: RUNS,
    shape: 'wedge',
    words: ['SOUND', 'NARROW', 'FJORD'],
    want: 6,
    boardNames: ['The Narrows', 'Cold Mouth', 'Deep Channel', 'Black Reach', 'Sill', 'The Head'],
  },
]

interface Found {
  seed: string
  band: Band
}

/**
 * Seeds the shipped pack already uses. A repeat isn't strictly broken — a
 * different size or silhouette makes a different board — but the pack asserts
 * one seed per entry so that "copy the seed" means one thing, and page one
 * already reaches for words page two would like (FJORD, among others).
 */
const TAKEN = new Set(loadCuratedPack().entries.map((e) => e.seed))

/** Candidate seeds for a band: each word with suffixes 0001.. */
function* seeds(band: Band, limit: number): Generator<string> {
  for (let n = 1; n <= limit; n++) {
    for (const word of band.words) {
      yield `${word}-${String(n).padStart(4, '0')}`
    }
  }
}

function search(band: Band, perWordLimit: number): { found: Found[]; rejected: Map<string, number> } {
  const found: Found[] = []
  const rejected = new Map<string, number>()
  const note = (why: string) => rejected.set(why, (rejected.get(why) ?? 0) + 1)

  for (const seed of seeds(band, perWordLimit)) {
    if (found.length >= band.want) break
    if (TAKEN.has(seed)) {
      note('seed already in the pack')
      continue
    }
    try {
      const board = generateBoard({
        seed,
        size: band.size,
        difficulty: band.difficulty,
        clues: band.clues,
        ...(band.shape ? { shape: band.shape } : {}),
      })
      const res = solve(board)
      if (!res.solved) {
        note('not guess-free')
        continue
      }
      if (!res.unique) {
        note('not unique')
        continue
      }
      if (res.rating !== band.difficulty) {
        note(`rated ${res.rating}, wanted ${band.difficulty}`)
        continue
      }
      // A board asking for row annotations should actually carry some, or the
      // band is not delivering the mechanic it exists to introduce.
      if (band.clues.lineConnectivity && !board.lines.some((l) => l.connectivity)) {
        note('no row annotations survived reduction')
        continue
      }
      found.push({ seed, band })
    } catch (e) {
      note(`threw: ${(e as Error).message}`)
    }
  }
  return { found, rejected }
}

const arg = process.argv.slice(2).find((a) => a.startsWith('--band='))
const only = arg ? arg.slice('--band='.length) : null
const bands = only ? BANDS.filter((b) => b.id === only) : BANDS
if (bands.length === 0) {
  console.error(`no such band: ${only}. Known: ${BANDS.map((b) => b.id).join(', ')}`)
  process.exit(1)
}

const groups: unknown[] = []
const entries: unknown[] = []
let order = 37 // page one holds 1..36; `order` stays globally monotonic
let short = 0

for (const band of bands) {
  const { found, rejected } = search(band, 60)
  const status = found.length >= band.want ? 'ok  ' : 'SHORT'
  console.error(`${status} ${band.id.padEnd(14)} ${found.length}/${band.want}`)
  for (const [why, n] of [...rejected.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
    console.error(`        rejected ${String(n).padStart(4)} x ${why}`)
  }
  if (found.length < band.want) short++

  groups.push({
    id: band.id,
    name: band.name,
    blurb: band.blurb,
    order: groups.length + 7, // page one uses 1..6
    page: band.page,
  })
  found.forEach((f, i) => {
    entries.push({
      id: `${band.id}-${i + 1}`,
      name: band.boardNames[i] ?? `${band.name} ${i + 1}`,
      seed: f.seed,
      size: band.size,
      difficulty: band.difficulty,
      group: band.id,
      order: order++,
      ...(band.clues.lineConnectivity ? { clues: band.clues } : {}),
      ...(band.shape ? { shape: band.shape } : {}),
    })
  })
}

// Data to stdout, progress to stderr — so the manifest can be piped straight in.
console.log(JSON.stringify({ groups, entries }, null, 2))
if (short > 0) console.error(`\n${short} band(s) came up short.`)
