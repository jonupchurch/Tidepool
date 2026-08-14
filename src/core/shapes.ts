// shapes.ts — the catalog of board silhouettes (012). A silhouette carves a
// present set out of the same hexagonal region the size tiers already define,
// so an irregular board is a *generation* concern and nothing downstream has to
// know: `Board.present` has always been the engine's notion of topology, and
// every clue is computed over it.
//
// Silhouettes are predicates over an axial coord, parameterised by the size
// tier's radius — not literal cell lists. One definition then covers every size,
// and a wrong cell in a hand-typed table would be invisible in review, where a
// wrong predicate is a readable sentence.
//
// Pure and deterministic, like the rest of core/. No DOM, no randomness.
import type { SizeTier } from './board'
import { type Axial, distanceFromOrigin, hexRegion, key, presentNeighbors, presentSet } from './hex'

/** The plain filled hexagon every board has been until now. */
export const DEFAULT_SHAPE = 'hex'

export type ShapeId = 'hex' | 'atoll' | 'crescent' | 'wedge' | 'shoal'

export const SHAPE_IDS: readonly ShapeId[] = ['hex', 'atoll', 'crescent', 'wedge', 'shoal']

export function isShapeId(x: unknown): x is ShapeId {
  return typeof x === 'string' && (SHAPE_IDS as readonly string[]).includes(x)
}

/** The radius each size tier carves from — the engine's existing size vocabulary. */
export const SIZE_RADIUS: Record<SizeTier, number> = { Small: 3, Medium: 5, Large: 7 }

interface Silhouette {
  id: ShapeId
  /** Player-facing name, for a manifest or a board's title. */
  name: string
  /** Sizes this shape is good at. Anything else is refused, not degraded. */
  sizes: readonly SizeTier[]
  /** Whether a coord of the radius-`r` region belongs to this silhouette. */
  keeps: (c: Axial, r: number) => boolean
}

/** Cube distance between two axial coords. */
function distance(a: Axial, b: Axial): number {
  return distanceFromOrigin({ q: a.q - b.q, r: a.r - b.r })
}

/**
 * The catalog.
 *
 * Every entry must be a single connected region with no cell left without a
 * neighbour — `checkSilhouette` enforces that, and `shapes.test.ts` runs it over
 * every shape at every size it claims. A silhouette that produces a good Large
 * board can easily produce a 6-cell Small one, which is why `sizes` exists.
 */
const CATALOG: Record<ShapeId, Silhouette> = {
  hex: {
    id: 'hex',
    name: 'Open water',
    sizes: ['Small', 'Medium', 'Large'],
    keeps: () => true,
  },

  // A ring with the middle open — the lagoon inside an atoll. Thickness scales
  // with the radius so the band stays playable rather than becoming a thread.
  atoll: {
    id: 'atoll',
    name: 'Atoll',
    sizes: ['Medium', 'Large'],
    keeps: (c, r) => distanceFromOrigin(c) >= r - Math.max(2, Math.floor(r / 2)),
  },

  // A bay: the hexagon with a bite taken out of one side. This is the concave
  // case — the one that makes margin labels interesting, because a short row's
  // label can otherwise land on a neighbouring row's cell.
  crescent: {
    id: 'crescent',
    name: 'Crescent',
    sizes: ['Medium', 'Large'],
    keeps: (c, r) => {
      const biteCentre: Axial = { q: r, r: -Math.floor(r / 2) }
      return distance(c, biteCentre) > Math.floor(r * 0.75)
    },
  },

  // A fan opening from one corner: everything on one side of an axis.
  wedge: {
    id: 'wedge',
    name: 'Wedge',
    sizes: ['Medium', 'Large'],
    keeps: (c) => c.r <= 0 && c.q >= 0,
  },

  // A wide, shallow band — long rows and short columns, so row totals carry
  // more of the weight than adjacency does.
  shoal: {
    id: 'shoal',
    name: 'Shoal',
    sizes: ['Medium', 'Large'],
    keeps: (c, r) => Math.abs(c.r) <= Math.max(1, Math.floor(r / 3)),
  },
}

export function silhouette(id: ShapeId): Silhouette {
  return CATALOG[id]
}

/** Human-readable name for a shape. */
export function shapeName(id: ShapeId): string {
  return CATALOG[id].name
}

/** Whether the catalog claims this shape works at this size. */
export function shapeSupportsSize(id: ShapeId, size: SizeTier): boolean {
  return CATALOG[id].sizes.includes(size)
}

/**
 * The coords of `shape` at `size`, deterministically ordered — the input to
 * `presentSet`. Throws for an unsupported pair rather than serving a board the
 * shape can't carry (FR-002): a degenerate board would undermine the game's core
 * promise for the sake of catalog symmetry.
 */
export function shapeRegion(size: SizeTier, shape: ShapeId = DEFAULT_SHAPE): Axial[] {
  if (!shapeSupportsSize(shape, size)) {
    throw new Error(`shapeRegion: ${shape} does not support ${size}`)
  }
  const r = SIZE_RADIUS[size]
  return hexRegion(r).filter((c) => CATALOG[shape].keeps(c, r))
}

/** Convenience: the present set for a shape/size pair. */
export function shapePresent(size: SizeTier, shape: ShapeId = DEFAULT_SHAPE): Set<string> {
  return presentSet(shapeRegion(size, shape))
}

export interface ShapeCheck {
  ok: boolean
  cells: number
  /** cells with no present neighbour — always a defect */
  isolated: string[]
  /** true when every cell is reachable from any other */
  connected: boolean
}

/**
 * The invariants every silhouette must hold (FR-003). Checked at authoring time
 * — as a test and as a build script — because it is far cheaper to reject a bad
 * shape once than to handle a degenerate board everywhere downstream.
 *
 * An isolated cell can only ever be resolved by a row total and reads as a
 * rendering fault; a disconnected region reads as two boards.
 */
export function checkSilhouette(present: Set<string>, minCells = 12): ShapeCheck {
  const cells = present.size
  const isolated: string[] = []
  for (const k of present) {
    const c = parse(k)
    if (presentNeighbors(c, present).length === 0) isolated.push(k)
  }

  let connected = cells === 0
  if (cells > 0) {
    const start = [...present][0]
    const seen = new Set([start])
    const stack = [start]
    while (stack.length > 0) {
      const cur = stack.pop() as string
      for (const n of presentNeighbors(parse(cur), present)) {
        const nk = key(n)
        if (!seen.has(nk)) {
          seen.add(nk)
          stack.push(nk)
        }
      }
    }
    connected = seen.size === cells
  }

  return { ok: cells >= minCells && isolated.length === 0 && connected, cells, isolated, connected }
}

function parse(k: string): Axial {
  const i = k.indexOf(',')
  return { q: Number(k.slice(0, i)), r: Number(k.slice(i + 1)) }
}
