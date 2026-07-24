// test-helpers.ts — fixture builders + an ASCII board dump for tests. Not part
// of the public engine surface; imported only by *.test.ts.
import type { Board, BoardParams, Cell, LineClue } from './board'
import { makeBoard } from './board'
import { type Layout, adjacencyClue, lineTotal } from './clues'
import { key, linesOf, parseKey } from './hex'

export const DEFAULT_PARAMS: BoardParams = {
  seed: 'TEST-0001',
  size: 'Small',
  difficulty: 'Calm',
  clues: { connectivity: true, lineTotals: true },
}

/** A layout where the given keys are water, all other present cells are rock. */
export function layoutOf(present: Set<string>, waterKeys: Iterable<string>): Layout {
  const water = new Set(waterKeys)
  const layout: Layout = new Map()
  for (const k of present) layout.set(k, water.has(k) ? 'water' : 'rock')
  return layout
}

interface BuildOpts {
  params?: BoardParams
  withConnectivity?: boolean
  withLines?: boolean
}

/** Fully-clued board: every rock revealed with its clue, all lines shown. */
export function fullyClued(present: Set<string>, layout: Layout, opts: BuildOpts = {}): Board {
  const params = opts.params ?? DEFAULT_PARAMS
  const withConnectivity = opts.withConnectivity ?? params.clues.connectivity
  const withLines = opts.withLines ?? params.clues.lineTotals
  const cells = new Map<string, Cell>()
  for (const k of present) {
    const coord = parseKey(k)
    const state = layout.get(k)!
    if (state === 'rock') {
      cells.set(k, { coord, state, given: true, clue: adjacencyClue(coord, layout, present, withConnectivity) })
    } else {
      cells.set(k, { coord, state, given: false })
    }
  }
  const lines: LineClue[] = withLines
    ? linesOf(present).map((ln) => ({
        axis: ln.axis,
        index: ln.index,
        total: lineTotal(ln.cells, layout),
        from: 'start' as const,
      }))
    : []
  return makeBoard({ params, present, cells, lines })
}

/** Board revealing only the given rock keys as clues (+ optional line clues). */
export function customBoard(
  present: Set<string>,
  layout: Layout,
  givenRockKeys: Iterable<string>,
  opts: BuildOpts & { lines?: LineClue[] } = {},
): Board {
  const params = opts.params ?? DEFAULT_PARAMS
  const withConnectivity = opts.withConnectivity ?? params.clues.connectivity
  const given = new Set(givenRockKeys)
  const cells = new Map<string, Cell>()
  for (const k of present) {
    const coord = parseKey(k)
    const state = layout.get(k)!
    if (given.has(k)) {
      cells.set(k, { coord, state, given: true, clue: adjacencyClue(coord, layout, present, withConnectivity) })
    } else {
      cells.set(k, { coord, state, given: false })
    }
  }
  return makeBoard({ params, present, cells, lines: opts.lines ?? [] })
}

/** Rough ASCII dump for debugging: W=water, ▲=given rock(clue), r=hidden rock. */
export function dumpBoard(board: Board): string {
  const lines: string[] = []
  for (let r = board.bounds.minR; r <= board.bounds.maxR; r++) {
    let row = ' '.repeat(r - board.bounds.minR)
    for (let q = board.bounds.minQ; q <= board.bounds.maxQ; q++) {
      const cell = board.cells.get(key({ q, r }))
      if (!cell) {
        row += '  '
        continue
      }
      if (cell.state === 'water') row += 'W '
      else row += cell.given ? `${cell.clue?.count ?? '#'} ` : 'r '
    }
    lines.push(row)
  }
  return lines.join('\n')
}
