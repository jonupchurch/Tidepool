// Pool enumeration (T014): connected water pools of the solution.
import { key, parseKey, presentNeighbors } from '@/core'
import { waterPools } from './pools'
import { makeTestBoard } from './test-helpers'

describe('waterPools', () => {
  const board = makeTestBoard()
  const pools = waterPools(board)

  it('partitions every water cell into exactly one pool', () => {
    const seen = new Set<string>()
    for (const p of pools) {
      for (const c of p.cells) {
        expect(seen.has(c), `cell ${c} in two pools`).toBe(false)
        seen.add(c)
      }
    }
    const water = new Set<string>()
    for (const [k, cell] of board.cells) if (cell.state === 'water') water.add(k)
    expect(seen).toEqual(water)
  })

  it('each pool is internally connected', () => {
    for (const p of pools) {
      const set = new Set(p.cells)
      const seen = new Set([p.cells[0]])
      const stack = [p.cells[0]]
      while (stack.length) {
        const cur = stack.pop()!
        for (const n of presentNeighbors(parseKey(cur), board.present)) {
          const nk = key(n)
          if (set.has(nk) && !seen.has(nk)) {
            seen.add(nk)
            stack.push(nk)
          }
        }
      }
      expect(seen.size).toBe(p.cells.length)
    }
  })

  it('has stable, sorted ids and rock-only boundaries', () => {
    const ids = pools.map((p) => p.id)
    expect([...ids].sort()).toEqual(ids)
    for (const p of pools) {
      expect(p.id).toBe([...p.cells].sort()[0])
      for (const b of p.boundary) expect(board.cells.get(b)?.state).toBe('rock')
    }
  })
})
