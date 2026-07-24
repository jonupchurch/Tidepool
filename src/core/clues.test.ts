// Clue tests (T010): adjacency counts, circular runs / connectivity, line totals.
import {
  adjacencyClue,
  circularRuns,
  connectivityInformative,
  connectivityOf,
  lineTotal,
  presentNeighborCount,
  ringWater,
  waterNeighborCount,
} from './clues'
import { hexRegion, key, presentSet } from './hex'
import { layoutOf } from './test-helpers'

describe('circularRuns', () => {
  it('counts maximal circular runs of water', () => {
    expect(circularRuns([false, false, false, false, false, false])).toBe(0)
    expect(circularRuns([true, true, true, true, true, true])).toBe(1)
    expect(circularRuns([true, true, false, false, false, false])).toBe(1)
    expect(circularRuns([true, false, true, false, false, false])).toBe(2)
    // wrap-around: last and first are adjacent → one run
    expect(circularRuns([true, false, false, false, false, true])).toBe(1)
    expect(circularRuns([true, false, true, false, true, false])).toBe(3)
  })
})

describe('connectivity classification', () => {
  it('connected when ≤1 run, split when ≥2', () => {
    expect(connectivityOf([true, true, false, false, false, false])).toBe('connected')
    expect(connectivityOf([true, false, true, false, false, false])).toBe('split')
  })

  it('is informative only for 2 ≤ count ≤ presentNeighbours − 2', () => {
    expect(connectivityInformative(1, 6)).toBe(false)
    expect(connectivityInformative(2, 6)).toBe(true)
    expect(connectivityInformative(4, 6)).toBe(true)
    expect(connectivityInformative(5, 6)).toBe(false) // 5 of 6 always connected
    expect(connectivityInformative(2, 3)).toBe(false) // count == pn-1
  })
})

describe('adjacency clues', () => {
  const present = presentSet(hexRegion(2))
  // Make the six neighbours of the origin water, everything else rock.
  const originNeighbours = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ].map(key)
  const layout = layoutOf(present, originNeighbours)

  it('counts water among present neighbours', () => {
    expect(waterNeighborCount({ q: 0, r: 0 }, layout, present)).toBe(6)
    expect(presentNeighborCount({ q: 0, r: 0 }, present)).toBe(6)
  })

  it('ringWater reflects present-and-water slots', () => {
    expect(ringWater({ q: 0, r: 0 }, layout, present)).toEqual([true, true, true, true, true, true])
  })

  it('attaches connectivity only when informative and requested', () => {
    // Origin sees 6 water → count 6, not informative → plain count.
    const full = adjacencyClue({ q: 0, r: 0 }, layout, present, true)
    expect(full).toEqual({ count: 6 })

    // Two adjacent water among the origin's ring → informative, connected.
    const twoAdj = layoutOf(present, [originNeighbours[0], originNeighbours[1]])
    const clue = adjacencyClue({ q: 0, r: 0 }, twoAdj, present, true)
    expect(clue.count).toBe(2)
    expect(clue.connectivity).toBe('connected')

    // Two opposite water → informative, split.
    const twoOpp = layoutOf(present, [originNeighbours[0], originNeighbours[2]])
    const split = adjacencyClue({ q: 0, r: 0 }, twoOpp, present, true)
    expect(split).toEqual({ count: 2, connectivity: 'split' })
  })

  it('omits connectivity when not requested', () => {
    const twoAdj = layoutOf(present, [originNeighbours[0], originNeighbours[1]])
    expect(adjacencyClue({ q: 0, r: 0 }, twoAdj, present, false)).toEqual({ count: 2 })
  })
})

describe('line totals', () => {
  it('counts water along a set of cells', () => {
    const present = presentSet(hexRegion(2))
    const waters = ['0,0', '1,0']
    const layout = layoutOf(present, waters)
    expect(lineTotal(['0,0', '1,0', '2,0'], layout)).toBe(2)
    expect(lineTotal(['-1,0', '-2,0'], layout)).toBe(0)
  })
})
