// pools.ts — connected water pools of the board's hidden solution. A flood-fill
// over `board.present` using the engine's public hex-adjacency (never re-deriving
// geometry). Each pool carries its cells, its bounding rock cells (which must not
// be mis-marked water for the pool to count), and its reward creature. Pure.
import { type Board, key, parseKey, presentNeighbors } from '@/core'
import { creatureForPool } from './creatures'

export interface Pool {
  /** stable id: the lexicographically-smallest cell key in the pool */
  id: string
  /** the pool's water cell keys, sorted */
  cells: string[]
  /** present solution-rock cells adjacent to the pool (must stay non-water) */
  boundary: string[]
  creatureId: string
}

/** Enumerate the connected water pools of `board`'s solution, deterministically. */
export function waterPools(board: Board): Pool[] {
  const isWater = (k: string): boolean => board.cells.get(k)?.state === 'water'
  const isRock = (k: string): boolean => board.cells.get(k)?.state === 'rock'
  const visited = new Set<string>()
  const pools: Pool[] = []

  for (const start of board.present) {
    if (!isWater(start) || visited.has(start)) continue
    const cells: string[] = []
    const stack = [start]
    visited.add(start)
    while (stack.length > 0) {
      const cur = stack.pop()!
      cells.push(cur)
      for (const n of presentNeighbors(parseKey(cur), board.present)) {
        const nk = key(n)
        if (isWater(nk) && !visited.has(nk)) {
          visited.add(nk)
          stack.push(nk)
        }
      }
    }
    cells.sort()

    const boundary = new Set<string>()
    for (const c of cells) {
      for (const n of presentNeighbors(parseKey(c), board.present)) {
        const nk = key(n)
        if (isRock(nk)) boundary.add(nk)
      }
    }

    pools.push({
      id: cells[0],
      cells,
      boundary: [...boundary].sort(),
      creatureId: creatureForPool(cells.length),
    })
  }

  return pools.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
