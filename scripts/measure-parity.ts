// measure-parity.ts — what the parity density cap actually produces (022/024).
//
// `MAX_PARITY_SHARE` in `clues.ts` is a dial, not a description: the weakening
// ladder wants to go far past any cap worth setting, so the cap binds on
// essentially every board and the number a player sees is set by that constant
// and nothing else. But `floor` rounds every site down, so the constant and the
// resulting density are NOT the same number — 0.19 yields ~15%. **Re-measure
// after touching the cap, the ladder, or the clue counts; never infer.**
//
// Four passes:
//   1. Density    — the share of clues wearing a mark, per board, per site.
//   2. Saturation — how often the cap is the binding constraint (vs the ladder
//                   stopping on its own). If this drops, the dial has gone slack.
//   3. Framed     — how many marks reach rung 2, which a tighter budget starves
//                   first, and whether all eight framed forms still exist.
//   4. Fixtures   — seeds carrying the framed forms, for the e2e specs to pin.
//
// Run: `npm run measure:parity`
import type { Board, SizeTier } from '@/core/board'
import { hasParityFace } from '@/core/board'
import { parityBudget } from '@/core/clues'
import { generateBoard } from '@/core/generate'
import { type ShapeId, shapeSupportsSize } from '@/core/shapes'

const SEEDS = Array.from({ length: 20 }, (_, i) => `DENSITY-${String(i + 1).padStart(4, '0')}`)
const SIZES: SizeTier[] = ['Small', 'Medium', 'Large']
const SHORES: (ShapeId | undefined)[] = [undefined, 'atoll', 'crescent', 'wedge', 'shoal']
const CLUES = { connectivity: true, lineTotals: true, evenOdd: true, lineConnectivity: true }

const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100)
const fmt = (x: number) => `${x.toFixed(1)}%`

/** Every board in the sweep, generated once and shared by all four passes. */
const sweep: { label: string; board: Board }[] = []
for (const seed of SEEDS) {
  for (const size of SIZES) {
    for (const shape of SHORES) {
      if (shape !== undefined && !shapeSupportsSize(shape, size)) continue
      sweep.push({
        label: `${seed} ${size} ${shape ?? 'hex'}`,
        board: generateBoard({
          seed,
          size,
          difficulty: 'Deep',
          clues: CLUES as never,
          ...(shape ? { shape } : {}),
        }),
      })
    }
  }
}

const clueCells = (b: Board) => [...b.cells.values()].filter((c) => c.given && c.clue)
const tileMarksOf = (b: Board) => clueCells(b).filter((c) => c.clue && hasParityFace(c.clue))
const rowMarksOf = (b: Board) => b.lines.filter(hasParityFace)

// ── 1. Density ───────────────────────────────────────────────────────────────
{
  const rows = sweep.map(({ board }) => ({
    tiles: clueCells(board).length,
    tileMarks: tileMarksOf(board).length,
    lines: board.lines.length,
    lineMarks: rowMarksOf(board).length,
  }))
  const stat = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b)
    return {
      mean: s.reduce((a, b) => a + b, 0) / s.length,
      median: s[Math.floor(s.length / 2)],
      worst: s[s.length - 1],
    }
  }
  const tile = stat(rows.map((r) => pct(r.tileMarks, r.tiles)))
  const line = stat(rows.map((r) => pct(r.lineMarks, r.lines)))
  const all = stat(rows.map((r) => pct(r.tileMarks + r.lineMarks, r.tiles + r.lines)))

  console.log(`\n1. DENSITY — share of clues withholding their count (${sweep.length} boards)\n`)
  console.log('   site           mean   median    worst')
  const named = [
    ['stones', tile],
    ['edge numbers', line],
    ['ALL clues', all],
  ] as const
  for (const [name, s] of named) {
    console.log(
      `   ${name.padEnd(13)}${fmt(s.mean).padStart(6)}  ${fmt(s.median).padStart(6)}  ${fmt(s.worst).padStart(7)}`,
    )
  }
  const silent = rows.filter((r) => r.tileMarks + r.lineMarks === 0).length
  console.log(`\n   boards with no marks at all: ${silent}/${rows.length} (${fmt(pct(silent, rows.length))})`)
  console.log('   -- a site of five or fewer clues rounds down to zero; deliberate (024).')
}

// ── 2. Saturation ────────────────────────────────────────────────────────────
{
  let tileSat = 0
  let lineSat = 0
  for (const { board } of sweep) {
    if (tileMarksOf(board).length === parityBudget(clueCells(board).length)) tileSat++
    if (rowMarksOf(board).length === parityBudget(board.lines.length)) lineSat++
  }
  console.log('\n2. SATURATION — is the cap the binding constraint?\n')
  console.log(
    `   stones at their exact budget:       ${tileSat}/${sweep.length} (${fmt(pct(tileSat, sweep.length))})`,
  )
  console.log(
    `   edge numbers at their exact budget: ${lineSat}/${sweep.length} (${fmt(pct(lineSat, sweep.length))})`,
  )
  console.log('   -- high means density moves ~1:1 with MAX_PARITY_SHARE. If this falls,')
  console.log('      the ladder is stopping on its own and the dial no longer controls it.')
}

// ── 3. Framed forms ──────────────────────────────────────────────────────────
{
  let framedTiles = 0
  let bareTiles = 0
  let framedRows = 0
  let bareRows = 0
  let boardsFramedTile = 0
  let boardsFramedRow = 0
  const forms = new Set<string>()
  for (const { board } of sweep) {
    let ft = 0
    let fr = 0
    for (const c of tileMarksOf(board)) {
      const clue = c.clue!
      if (clue.connectivity) {
        framedTiles++
        ft++
        forms.add(`tile ${clue.connectivity}/${clue.parity}`)
      } else bareTiles++
    }
    for (const l of rowMarksOf(board)) {
      if (l.connectivity) {
        framedRows++
        fr++
        forms.add(`row ${l.connectivity}/${l.parity}`)
      } else bareRows++
    }
    if (ft) boardsFramedTile++
    if (fr) boardsFramedRow++
  }
  console.log('\n3. FRAMED FORMS — rung 2 of the ladder, starved first by a tighter cap\n')
  console.log(
    `   tile marks: ${framedTiles} framed / ${bareTiles} bare  (${fmt(pct(framedTiles, framedTiles + bareTiles))} framed)`,
  )
  console.log(
    `   row marks:  ${framedRows} framed / ${bareRows} bare  (${fmt(pct(framedRows, framedRows + bareRows))} framed)`,
  )
  console.log(
    `   boards carrying a framed stone: ${boardsFramedTile}/${sweep.length} (${fmt(pct(boardsFramedTile, sweep.length))})`,
  )
  console.log(
    `   boards carrying a framed row:   ${boardsFramedRow}/${sweep.length} (${fmt(pct(boardsFramedRow, sweep.length))})`,
  )
  const extinct = forms.size === 8 ? '' : '   <-- A FORM HAS GONE EXTINCT'
  console.log(`   distinct forms reached: ${forms.size}/8${extinct}`)
}

// ── 4. Fixtures for the e2e specs ────────────────────────────────────────────
{
  const dots = (parity: string) => (parity === 'even' ? '●●' : '●')
  const face = (parity: string, framing: string) =>
    framing === 'connected' ? `{${dots(parity)}}` : `-${dots(parity)}-`
  const POOL = [
    'CORAL-4417', 'KELP-0007', 'TIDE-1234', 'COVE-0001', 'TIDE-2789', 'SHELL-0001',
    'FOAM-0002', 'REEF-0011', 'SILT-0042', 'DUNE-0007', 'MARSH-0003', 'BRINE-0019',
    'SPRAY-0025', 'DRIFT-0008', 'GULL-0014', 'LAGOON-0006', 'ROCKPOOL-0002',
    'SURGE-0031', 'EBB-0005', 'NEAP-0013', 'SWELL-0021', 'WRACK-0009', 'TIDE-5150',
    'CORAL-0001', 'KELP-1234', 'SHELL-4417', 'COVE-9999', 'FOAM-7777',
  ]
  const both: string[] = []
  const rows: { seed: string; forms: string[] }[] = []
  for (const seed of POOL) {
    const board = generateBoard({ seed, size: 'Large', difficulty: 'Deep', clues: CLUES as never })
    const t = tileMarksOf(board).filter((c) => c.clue!.connectivity)
    const l = rowMarksOf(board).filter((x) => x.connectivity)
    if (t.length && l.length) both.push(seed)
    const forms = [
      ...new Set([
        ...t.map((c) => face(c.clue!.parity!, c.clue!.connectivity!)),
        ...l.map((x) => face(x.parity!, x.connectivity!)),
      ]),
    ].sort()
    if (forms.length) rows.push({ seed, forms })
  }
  console.log('\n4. E2E FIXTURES — Large/Deep/evenodd+hints\n')
  console.log(`   seeds with BOTH a framed stone and a framed row: ${both.join(', ') || '(none)'}`)
  const WANT = [`-${dots('odd')}-`, `-${dots('even')}-`, `{${dots('odd')}}`, `{${dots('even')}}`]
  const seen = new Set<string>()
  const picked: string[] = []
  for (const r of rows) {
    if (r.forms.some((f) => !seen.has(f))) {
      picked.push(r.seed)
      r.forms.forEach((f) => seen.add(f))
    }
    if (WANT.every((w) => seen.has(w))) break
  }
  console.log(`   covering set for all four forms: ${picked.join(', ')}`)
  console.log(`   reached: ${[...seen].sort().join(' ')}`)
}
console.log()
