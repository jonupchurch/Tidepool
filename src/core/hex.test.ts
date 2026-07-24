// Hex geometry tests (T007): keys, neighbour ring, region size, lines.
import {
  DIRECTIONS,
  distanceFromOrigin,
  hexRegion,
  key,
  lineIndex,
  linesOf,
  neighbor,
  neighbors,
  parseKey,
  presentNeighbors,
  presentSet,
} from './hex'

describe('hex geometry', () => {
  it('key/parseKey round-trips', () => {
    for (const c of [{ q: 0, r: 0 }, { q: -3, r: 2 }, { q: 5, r: -1 }]) {
      expect(parseKey(key(c))).toEqual(c)
    }
  })

  it('has 6 fixed directions and 6 neighbours', () => {
    expect(DIRECTIONS).toHaveLength(6)
    expect(neighbors({ q: 0, r: 0 })).toHaveLength(6)
  })

  it('consecutive ring directions are mutually adjacent (angular order)', () => {
    // neighbor(i) and neighbor(i+1) around a centre are themselves adjacent,
    // which is what makes "consecutive around the ring" well-defined.
    for (let i = 0; i < 6; i++) {
      const a = neighbor({ q: 0, r: 0 }, i)
      const b = neighbor({ q: 0, r: 0 }, (i + 1) % 6)
      const diff = { q: a.q - b.q, r: a.r - b.r }
      const isDir = DIRECTIONS.some((d) => d.q === diff.q && d.r === diff.r)
      expect(isDir, `ring slots ${i} and ${(i + 1) % 6} should be adjacent`).toBe(true)
    }
  })

  it('hexRegion has 1 + 3·r·(r+1) cells', () => {
    for (const r of [1, 2, 3, 5, 8]) {
      expect(hexRegion(r)).toHaveLength(1 + 3 * r * (r + 1))
    }
  })

  it('hexRegion cells are all within cube distance radius', () => {
    for (const c of hexRegion(4)) expect(distanceFromOrigin(c)).toBeLessThanOrEqual(4)
  })

  it('presentNeighbors filters absent cells', () => {
    // A corner-ish region: origin has fewer present neighbours near the edge.
    const present = presentSet(hexRegion(1))
    expect(presentNeighbors({ q: 0, r: 0 }, present)).toHaveLength(6)
    const edge = { q: 1, r: 0 }
    expect(presentNeighbors(edge, present).length).toBeLessThan(6)
  })

  it('lineIndex is constant along each axis', () => {
    const c = { q: 2, r: -1 }
    expect(lineIndex(c, 0)).toBe(c.r)
    expect(lineIndex(c, 1)).toBe(c.q)
    expect(lineIndex(c, 2)).toBe(-c.q - c.r)
  })

  it('linesOf partitions every present cell into exactly one line per axis', () => {
    const present = presentSet(hexRegion(3))
    const lines = linesOf(present)
    for (const axis of [0, 1, 2] as const) {
      const inAxis = lines.filter((l) => l.axis === axis)
      const total = inAxis.reduce((n, l) => n + l.cells.length, 0)
      expect(total).toBe(present.size)
      // every cell appears in exactly one line of this axis
      const seen = new Set<string>()
      for (const l of inAxis) for (const k of l.cells) seen.add(k)
      expect(seen.size).toBe(present.size)
    }
  })
})
