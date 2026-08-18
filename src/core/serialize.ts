// serialize.ts — canonical board serialization (stable ordering, for equality /
// oracle / save) and human-friendly seed codes (`WORD-NNNN`). Round-trips
// deep-equal. Pure.
import type {
  Axis,
  Board,
  Cell,
  CellState,
  ClueFace,
  Connectivity,
  LineClue,
  SeedCode,
} from './board'
import { hasParityFace, makeBoard } from './board'
import { key, parseKey } from './hex'

const FORMAT_VERSION = 1

/**
 * A clue face on the wire: the number itself, or a letter standing in for a
 * parity that withheld it.
 *
 * `'e'`/`'o'` rather than `'+'`/`'|'`: this is storage, and the glyphs are a
 * rendering decision that already changed once (018 shipped `E`/`O` on paper and
 * `+`/`|` on screen). A save written today must still load if they change again.
 */
type FaceSlot = number | 'e' | 'o'

/**
 * `[key, state, given, face?, connectivity?]`
 *
 * Slot 3 is the clue *face*, slot 4 its *framing* — the two halves 019 made
 * orthogonal, so every combination of the six forms is expressible without a new
 * slot. Widening slot 3 rather than adding one keeps every tuple ever written
 * valid (a parity clue would otherwise need a `null` hole there), and
 * `typeof t[3] === 'number'` discriminates.
 */
type CellTuple = [string, 'w' | 'r', 0 | 1, FaceSlot?, ('c' | 's')?]
/**
 * `[axis, index, face, from, connectivity?]` — the same face slot as a cell,
 * since 019 gave both clue sites the same two halves. Positional, which is why
 * renaming `LineClue.total` to `count` changed no bytes.
 */
type LineTuple = [Axis, number, FaceSlot, 'start' | 'end', ('c' | 's')?]

interface CanonicalBoard {
  v: number
  params: Board['params']
  cells: CellTuple[]
  lines: LineTuple[]
}

/** A clue's face, as the wire spells it. */
function encodeFace(face: ClueFace): FaceSlot {
  return hasParityFace(face) ? (face.parity === 'even' ? 'e' : 'o') : face.count
}

function decodeFace(slot: FaceSlot): ClueFace {
  return typeof slot === 'number' ? { count: slot } : { parity: slot === 'e' ? 'even' : 'odd' }
}

/** A framing, as the wire spells it — `undefined` for a bare clue. */
function encodeFraming(c: Connectivity | undefined): 'c' | 's' | undefined {
  return c === undefined ? undefined : c === 'connected' ? 'c' : 's'
}

function decodeFraming(slot: 'c' | 's' | undefined): Connectivity | undefined {
  return slot === 'c' ? 'connected' : slot === 's' ? 'split' : undefined
}

function encodeCell(cell: Cell): CellTuple {
  const s: 'w' | 'r' = cell.state === 'water' ? 'w' : 'r'
  const g: 0 | 1 = cell.given ? 1 : 0
  if (cell.given && cell.clue) {
    const framing = encodeFraming(cell.clue.connectivity)
    // Trailing slot omitted rather than written as undefined, so an unframed
    // clue serializes to exactly the bytes it always did.
    return framing === undefined
      ? [key(cell.coord), s, g, encodeFace(cell.clue)]
      : [key(cell.coord), s, g, encodeFace(cell.clue), framing]
  }
  return [key(cell.coord), s, g]
}

function decodeCell(t: CellTuple): Cell {
  const coord = parseKey(t[0])
  const state: CellState = t[1] === 'w' ? 'water' : 'rock'
  const given = t[2] === 1
  const face = t[3]
  if (given && face !== undefined) {
    const connectivity = decodeFraming(t[4])
    const clue = decodeFace(face)
    return { coord, state, given, clue: connectivity ? { ...clue, connectivity } : clue }
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
    .map((l) => {
      const framing = encodeFraming(l.connectivity)
      return framing === undefined
        ? [l.axis, l.index, encodeFace(l), l.from]
        : [l.axis, l.index, encodeFace(l), l.from, framing]
    })
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
  const lines: LineClue[] = c.lines.map((l) => {
    const base = { axis: l[0], index: l[1], from: l[3], ...decodeFace(l[2]) }
    const connectivity = decodeFraming(l[4])
    return connectivity ? { ...base, connectivity } : base
  })
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
