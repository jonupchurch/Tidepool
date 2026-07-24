// hex.ts — axial hex geometry (pointy-top). Coordinates, a fixed neighbour
// ring order (load-bearing for connectivity clues), the three line axes, and
// the present-cell region generator. Pure and deterministic.

export interface Axial {
  q: number
  r: number
}

export type Axis = 0 | 1 | 2

/** `"q,r"` — the canonical key form used across the engine. */
export function key(a: Axial): string {
  return `${a.q},${a.r}`
}

export function parseKey(k: string): Axial {
  const i = k.indexOf(',')
  return { q: Number(k.slice(0, i)), r: Number(k.slice(i + 1)) }
}

export function eq(a: Axial, b: Axial): boolean {
  return a.q === b.q && a.r === b.r
}

/**
 * The 6 neighbour directions in fixed ring order (angularly consecutive). Index
 * i and i+1 (mod 6) are adjacent around the hex — this ordering defines the
 * "consecutive around the ring" semantics of connectivity clues.
 */
export const DIRECTIONS: readonly Axial[] = [
  { q: 1, r: 0 }, // E
  { q: 1, r: -1 }, // NE
  { q: 0, r: -1 }, // NW
  { q: -1, r: 0 }, // W
  { q: -1, r: 1 }, // SW
  { q: 0, r: 1 }, // SE
]

export function neighbor(a: Axial, dir: number): Axial {
  const d = DIRECTIONS[((dir % 6) + 6) % 6]
  return { q: a.q + d.q, r: a.r + d.r }
}

/** All 6 neighbour coords in ring order (present or not). */
export function neighbors(a: Axial): Axial[] {
  return DIRECTIONS.map((d) => ({ q: a.q + d.q, r: a.r + d.r }))
}

/** Present neighbour coords in ring order. */
export function presentNeighbors(a: Axial, present: Set<string>): Axial[] {
  return neighbors(a).filter((n) => present.has(key(n)))
}

/** Cube distance from the origin for an axial coord. */
export function distanceFromOrigin(a: Axial): number {
  const s = -a.q - a.r
  return (Math.abs(a.q) + Math.abs(a.r) + Math.abs(s)) / 2
}

/**
 * The constant identifying which line `a` sits on for the given axis:
 * axis 0 = rows (r constant), axis 1 = q constant, axis 2 = s = -q-r constant.
 */
export function lineIndex(a: Axial, axis: Axis): number {
  switch (axis) {
    case 0:
      return a.r
    case 1:
      return a.q
    case 2:
      return -a.q - a.r
  }
}

export interface Line {
  axis: Axis
  index: number
  /** member cell keys, sorted deterministically */
  cells: string[]
}

/**
 * All lines across the three axes for a present set, deterministically ordered
 * (by axis, then index, cells sorted by (q,r)).
 */
export function linesOf(present: Set<string>): Line[] {
  const coords = [...present].map(parseKey)
  const out: Line[] = []
  for (const axis of [0, 1, 2] as Axis[]) {
    const groups = new Map<number, Axial[]>()
    for (const c of coords) {
      const idx = lineIndex(c, axis)
      const g = groups.get(idx)
      if (g) g.push(c)
      else groups.set(idx, [c])
    }
    const indices = [...groups.keys()].sort((x, y) => x - y)
    for (const idx of indices) {
      const cells = groups
        .get(idx)!
        .sort((x, y) => x.q - y.q || x.r - y.r)
        .map(key)
      out.push({ axis, index: idx, cells })
    }
  }
  return out
}

export function boundsOf(coords: Axial[]): {
  minQ: number
  maxQ: number
  minR: number
  maxR: number
} {
  if (coords.length === 0) return { minQ: 0, maxQ: 0, minR: 0, maxR: 0 }
  let minQ = Infinity
  let maxQ = -Infinity
  let minR = Infinity
  let maxR = -Infinity
  for (const c of coords) {
    if (c.q < minQ) minQ = c.q
    if (c.q > maxQ) maxQ = c.q
    if (c.r < minR) minR = c.r
    if (c.r > maxR) maxR = c.r
  }
  return { minQ, maxQ, minR, maxR }
}

/**
 * A filled hexagonal region: every cell within cube distance `radius` of the
 * origin. Count = 1 + 3·radius·(radius+1). Deterministically ordered by (q,r).
 */
export function hexRegion(radius: number): Axial[] {
  const out: Axial[] = []
  for (let q = -radius; q <= radius; q++) {
    const rLo = Math.max(-radius, -q - radius)
    const rHi = Math.min(radius, -q + radius)
    for (let r = rLo; r <= rHi; r++) {
      out.push({ q, r })
    }
  }
  return out.sort((a, b) => a.q - b.q || a.r - b.r)
}

/** A present set (coord-key membership) from a list of coords. */
export function presentSet(coords: Axial[]): Set<string> {
  return new Set(coords.map(key))
}
