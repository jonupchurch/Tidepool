// serialize.ts — canonical board serialization (stable ordering, for equality /
// oracle / save) and human-friendly seed codes (`WORD-NNNN`). Round-trips
// deep-equal. Pure.
import type { Axis, Board, Cell, CellState, Connectivity, LineClue, SeedCode } from './board'
import { makeBoard } from './board'
import { key, parseKey } from './hex'

const FORMAT_VERSION = 1

type CellTuple = [string, 'w' | 'r', 0 | 1, number?, ('c' | 's')?]
type LineTuple = [Axis, number, number, 'start' | 'end']

interface CanonicalBoard {
  v: number
  params: Board['params']
  cells: CellTuple[]
  lines: LineTuple[]
}

function encodeCell(cell: Cell): CellTuple {
  const s: 'w' | 'r' = cell.state === 'water' ? 'w' : 'r'
  const g: 0 | 1 = cell.given ? 1 : 0
  if (cell.given && cell.clue) {
    if (cell.clue.connectivity) {
      return [key(cell.coord), s, g, cell.clue.count, cell.clue.connectivity === 'connected' ? 'c' : 's']
    }
    return [key(cell.coord), s, g, cell.clue.count]
  }
  return [key(cell.coord), s, g]
}

function decodeCell(t: CellTuple): Cell {
  const coord = parseKey(t[0])
  const state: CellState = t[1] === 'w' ? 'water' : 'rock'
  const given = t[2] === 1
  if (given && t[3] !== undefined) {
    const connectivity: Connectivity | undefined =
      t[4] === 'c' ? 'connected' : t[4] === 's' ? 'split' : undefined
    return {
      coord,
      state,
      given,
      clue: connectivity ? { count: t[3], connectivity } : { count: t[3] },
    }
  }
  return { coord, state, given }
}

/** Canonical, stable-ordered serialization for equality / oracle / save. */
export function serializeBoard(board: Board): string {
  const cells = [...board.cells.values()]
    .sort((a, b) => a.coord.q - b.coord.q || a.coord.r - b.coord.r)
    .map(encodeCell)
  const lines: LineTuple[] = [...board.lines]
    .sort((a, b) => a.axis - b.axis || a.index - b.index)
    .map((l) => [l.axis, l.index, l.total, l.from])
  const canonical: CanonicalBoard = { v: FORMAT_VERSION, params: board.params, cells, lines }
  return JSON.stringify(canonical)
}

export function deserializeBoard(s: string): Board {
  const c = JSON.parse(s) as CanonicalBoard
  const cells = new Map<string, Cell>()
  const present = new Set<string>()
  for (const t of c.cells) {
    const cell = decodeCell(t)
    const k = key(cell.coord)
    cells.set(k, cell)
    present.add(k)
  }
  const lines: LineClue[] = c.lines.map((l) => ({
    axis: l[0],
    index: l[1],
    total: l[2],
    from: l[3],
  }))
  return makeBoard({ params: c.params, present, cells, lines })
}

const SEED_RE = /^([A-Z]+)-(\d{1,4})$/

/** Display form, e.g. "CORAL-4417". Returns the input trimmed/upper-cased. */
export function formatSeed(seed: SeedCode): string {
  return seed.trim().toUpperCase()
}

/** Parse/validate a seed code; returns the normalized `WORD-NNNN` or null. */
export function parseSeed(input: string): SeedCode | null {
  const norm = input.trim().toUpperCase().replace(/\s+/g, '')
  return SEED_RE.test(norm) ? norm : null
}
