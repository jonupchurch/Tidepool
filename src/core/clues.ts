// clues.ts — compute clue values from a full water/rock layout: adjacency
// counts, local (Hexcells-style) connectivity from the fixed neighbour ring,
// and line/edge totals. Pure functions of the layout + present set.
import type { AdjacencyClue, CellState, Connectivity } from './board'
import type { Axial } from './hex'
import { DIRECTIONS, key } from './hex'

export type Layout = Map<string, CellState>

/** Water among the present neighbours of `coord`. */
export function waterNeighborCount(
  coord: Axial,
  layout: Layout,
  present: Set<string>,
): number {
  let n = 0
  for (const d of DIRECTIONS) {
    const nk = key({ q: coord.q + d.q, r: coord.r + d.r })
    if (present.has(nk) && layout.get(nk) === 'water') n++
  }
  return n
}

/** How many present neighbours `coord` has. */
export function presentNeighborCount(coord: Axial, present: Set<string>): number {
  let n = 0
  for (const d of DIRECTIONS) {
    if (present.has(key({ q: coord.q + d.q, r: coord.r + d.r }))) n++
  }
  return n
}

/** The 6 ring slots as booleans: present-and-water. Absent/rock are false. */
export function ringWater(coord: Axial, layout: Layout, present: Set<string>): boolean[] {
  return DIRECTIONS.map((d) => {
    const nk = key({ q: coord.q + d.q, r: coord.r + d.r })
    return present.has(nk) && layout.get(nk) === 'water'
  })
}

/** Number of maximal circular runs of `true` in a 6-slot ring. */
export function circularRuns(slots: boolean[]): number {
  const total = slots.filter(Boolean).length
  if (total === 0) return 0
  if (slots.every(Boolean)) return 1
  const start = slots.findIndex((s) => !s)
  let runs = 0
  let inRun = false
  for (let i = 0; i < slots.length; i++) {
    const s = slots[(start + i) % slots.length]
    if (s && !inRun) {
      runs++
      inRun = true
    } else if (!s) {
      inRun = false
    }
  }
  return runs
}

export function connectivityOf(slots: boolean[]): Connectivity {
  return circularRuns(slots) <= 1 ? 'connected' : 'split'
}

/**
 * Connectivity is informative only when it can distinguish arrangements:
 * 2 ≤ waterCount ≤ presentNeighbours − 2. Outside that, the water neighbours
 * are trivially a single arc (or empty), so annotating adds nothing.
 */
export function connectivityInformative(
  waterCount: number,
  presentNeighbors: number,
): boolean {
  return waterCount >= 2 && waterCount <= presentNeighbors - 2
}

/**
 * The adjacency clue for a (rock) cell. When `withConnectivity` and the count
 * is in the informative range, the `{}`/`--` annotation is attached.
 */
export function adjacencyClue(
  coord: Axial,
  layout: Layout,
  present: Set<string>,
  withConnectivity: boolean,
): AdjacencyClue {
  const count = waterNeighborCount(coord, layout, present)
  if (withConnectivity) {
    const pn = presentNeighborCount(coord, present)
    if (connectivityInformative(count, pn)) {
      return { count, connectivity: connectivityOf(ringWater(coord, layout, present)) }
    }
  }
  return { count }
}

/** Total water among a set of present cell keys. */
export function lineTotal(cells: string[], layout: Layout): number {
  let n = 0
  for (const k of cells) if (layout.get(k) === 'water') n++
  return n
}
