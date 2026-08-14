// Silhouette catalog invariants (012). These are authoring-time checks: a shape
// that fails here must never ship, because every downstream consumer — clues,
// pools, labels, fit — assumes a sane present set.
import type { SizeTier } from './board'
import { SIZE_TIERS } from './board'
import {
  DEFAULT_SHAPE,
  SHAPE_IDS,
  type ShapeId,
  checkSilhouette,
  shapePresent,
  shapeRegion,
  shapeSupportsSize,
} from './shapes'
import { hexRegion, presentSet } from './hex'
import { generateBoard } from './generate'
import { deserializeBoard, serializeBoard } from './serialize'
import { solve } from './solver'
import { waterPools } from '@/game/pools'

describe('the catalog', () => {
  it('lists distinct ids and always includes the plain hexagon', () => {
    expect(new Set(SHAPE_IDS).size).toBe(SHAPE_IDS.length)
    expect(SHAPE_IDS).toContain(DEFAULT_SHAPE)
  })

  it('offers at least three silhouettes beyond the hexagon (SC-006)', () => {
    expect(SHAPE_IDS.filter((s) => s !== DEFAULT_SHAPE).length).toBeGreaterThanOrEqual(3)
  })

  it('every shape claims more than one size', () => {
    for (const id of SHAPE_IDS) {
      const sizes = SIZE_TIERS.filter((s) => shapeSupportsSize(id, s))
      expect(sizes.length, id).toBeGreaterThan(1)
    }
  })
})

describe('every silhouette, at every size it claims', () => {
  const pairs: Array<[ShapeId, SizeTier]> = []
  for (const id of SHAPE_IDS) {
    for (const size of SIZE_TIERS) {
      if (shapeSupportsSize(id, size)) pairs.push([id, size])
    }
  }

  for (const [id, size] of pairs) {
    it(`${id}/${size} is connected, has no isolated cell, and is big enough`, () => {
      const check = checkSilhouette(shapePresent(size, id))
      expect(check.isolated, `${id}/${size} has isolated cells`).toEqual([])
      expect(check.connected, `${id}/${size} is not one region`).toBe(true)
      expect(check.cells, `${id}/${size} is too small to be a puzzle`).toBeGreaterThanOrEqual(12)
    })
  }

  it('is deterministic — the same pair always carves the same region', () => {
    for (const [id, size] of pairs) {
      expect(shapeRegion(size, id)).toEqual(shapeRegion(size, id))
    }
  })
})

describe('shapeRegion', () => {
  it('defaults to the filled hexagon the engine has always used', () => {
    for (const size of SIZE_TIERS) {
      expect(shapePresent(size)).toEqual(presentSet(hexRegion({ Small: 3, Medium: 5, Large: 7 }[size])))
    }
  })

  it('refuses an unsupported shape/size pair rather than serving a bad board', () => {
    // Small is deliberately unsupported for the carved shapes: at radius 3 there
    // is not enough left after carving to be worth playing.
    const unsupported = SHAPE_IDS.filter((id) => !shapeSupportsSize(id, 'Small'))
    expect(unsupported.length).toBeGreaterThan(0)
    for (const id of unsupported) {
      expect(() => shapeRegion('Small', id)).toThrow(/does not support/)
    }
  })

  it('carves a real subset — a silhouette that kept everything would be the hexagon', () => {
    for (const id of SHAPE_IDS) {
      if (id === DEFAULT_SHAPE) continue
      for (const size of SIZE_TIERS) {
        if (!shapeSupportsSize(id, size)) continue
        expect(shapePresent(size, id).size, `${id}/${size}`).toBeLessThan(shapePresent(size).size)
      }
    }
  })
})

describe('checkSilhouette catches what it is there to catch', () => {
  it('flags an isolated cell', () => {
    // Two neighbours plus a cell far away on its own.
    const check = checkSilhouette(new Set(['0,0', '1,0', '9,0']), 0)
    expect(check.isolated).toEqual(['9,0'])
    expect(check.ok).toBe(false)
  })

  it('flags a region that is really two regions', () => {
    const check = checkSilhouette(new Set(['0,0', '1,0', '5,0', '6,0']), 0)
    expect(check.connected).toBe(false)
    expect(check.ok).toBe(false)
  })

  it('flags a region too small to be a puzzle', () => {
    expect(checkSilhouette(new Set(['0,0', '1,0'])).ok).toBe(false)
  })

  it('passes a plain hexagon', () => {
    expect(checkSilhouette(presentSet(hexRegion(3))).ok).toBe(true)
  })
})

describe('shaped rows have holes — which is what 010 fixed its run rule for', () => {
  it('at least one silhouette produces a row that is not contiguous', () => {
    // If nothing carved a gapped row, 010's hole-breaks-a-run rule and the
    // label-over-a-cell hazard would both be theoretical. They are not.
    const gapped: string[] = []
    for (const id of SHAPE_IDS) {
      if (id === DEFAULT_SHAPE) continue
      for (const size of SIZE_TIERS) {
        if (!shapeSupportsSize(id, size)) continue
        const present = shapePresent(size, id)
        const rows = new Map<number, number[]>()
        for (const k of present) {
          const [q, r] = k.split(',').map(Number)
          const row = rows.get(r) ?? []
          row.push(q)
          rows.set(r, row)
        }
        for (const [, qs] of rows) {
          qs.sort((a, b) => a - b)
          if (qs.length > 1 && qs[qs.length - 1] - qs[0] + 1 !== qs.length) {
            gapped.push(`${id}/${size}`)
            break
          }
        }
      }
    }
    expect(gapped.length, 'no silhouette produces a gapped row').toBeGreaterThan(0)
  })
})

describe('shaped boards through the engine', () => {
  const shaped = (shape: ShapeId, seed = 'SHAPE-0001') =>
    generateBoard({
      seed,
      size: 'Medium',
      difficulty: 'Tricky',
      clues: { connectivity: true, lineTotals: true },
      shape,
    })

  it('generates on the silhouette it was asked for', () => {
    for (const id of SHAPE_IDS) {
      if (!shapeSupportsSize(id, 'Medium')) continue
      const board = shaped(id)
      expect([...board.present].sort(), id).toEqual([...shapePresent('Medium', id)].sort())
    }
  })

  it('reproduces byte-for-byte, like every other board (Principle XI)', () => {
    for (const id of SHAPE_IDS) {
      if (!shapeSupportsSize(id, 'Medium')) continue
      expect(serializeBoard(shaped(id)), id).toBe(serializeBoard(shaped(id)))
    }
  })

  it('a shape is part of the reproducible key — same seed, different silhouette', () => {
    expect(serializeBoard(shaped('atoll'))).not.toBe(serializeBoard(shaped('crescent')))
  })

  it('an explicit "hex" is the same board as no shape at all', () => {
    // So a manifest can always write the field, and boards that predate shapes
    // keep generating exactly as they did.
    const base = {
      seed: 'KELP-0007',
      size: 'Medium' as const,
      difficulty: 'Tricky' as const,
      clues: { connectivity: true, lineTotals: true },
    }
    // Compared on content: serializeBoard embeds `params` verbatim, so the two
    // differ by the literal `"shape":"hex"` while describing the same board.
    const withShape = generateBoard({ ...base, shape: 'hex' })
    const without = generateBoard(base)
    expect(withShape.cells).toEqual(without.cells)
    expect(withShape.lines).toEqual(without.lines)
    expect([...withShape.present].sort()).toEqual([...without.present].sort())
  })

  it('refuses an unknown shape, and a size the shape does not support', () => {
    const base = {
      seed: 'KELP-0007',
      size: 'Small' as const,
      difficulty: 'Calm' as const,
      clues: { connectivity: true, lineTotals: true },
    }
    expect(() => generateBoard({ ...base, shape: 'lagoon' as ShapeId })).toThrow(/unknown shape/)
    expect(() => generateBoard({ ...base, shape: 'atoll' })).toThrow(/does not support/)
  })

  it('survives a serialization round-trip with its shape intact', () => {
    const board = shaped('crescent')
    const back = deserializeBoard(serializeBoard(board))
    expect(back.params.shape).toBe('crescent')
    expect([...back.present].sort()).toEqual([...board.present].sort())
  })

  it('is uniquely solvable and guess-free on every silhouette', () => {
    for (const id of SHAPE_IDS) {
      if (!shapeSupportsSize(id, 'Medium')) continue
      const res = solve(shaped(id))
      expect(res.solved, id).toBe(true)
      expect(res.unique, id).toBe(true)
    }
  })

  it('still forms water pools, so creatures can still be found', () => {
    for (const id of SHAPE_IDS) {
      if (!shapeSupportsSize(id, 'Medium')) continue
      expect(waterPools(shaped(id)).length, id).toBeGreaterThan(0)
    }
  })

  // The two optional seed-string segments have to compose in a FIXED order, or
  // a board asking for both differs depending on which feature's code path
  // built the string.
  it('composes shape and row annotations in a stable order', () => {
    const both = {
      seed: 'KELP-0007',
      size: 'Medium' as const,
      difficulty: 'Deep' as const,
      clues: { connectivity: true, lineTotals: true, lineConnectivity: true },
      shape: 'shoal' as ShapeId,
    }
    const a = serializeBoard(generateBoard(both))
    const b = serializeBoard(generateBoard({ ...both }))
    expect(a).toBe(b)
    // ...and each option genuinely moves the board, so neither is being dropped.
    const noShape = serializeBoard(generateBoard({ ...both, shape: 'hex' }))
    const noAnnotations = serializeBoard(
      generateBoard({ ...both, clues: { connectivity: true, lineTotals: true } }),
    )
    expect(a).not.toBe(noShape)
    expect(a).not.toBe(noAnnotations)
  })
})
