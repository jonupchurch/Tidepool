// PlaySession (T009/T016/T020/T024/T026/T035): marking, pool reward, board
// completion, undo/redo, serialize/restore, edge cases.
import { generateBoard } from '@/core'
import { PlaySession } from './session'
import {
  firstGiven,
  firstHiddenRock,
  firstNonGiven,
  makeSession,
  solveSession,
  waterCells,
} from './test-helpers'

describe('marking (US1)', () => {
  it('left-click cycles unknown → water → unknown', () => {
    const s = makeSession()
    const c = firstNonGiven(s.board)
    expect(s.markAt(c)).toBe('unknown')
    s.applyMark(c, 'water')
    expect(s.markAt(c)).toBe('water')
    s.applyMark(c, 'water')
    expect(s.markAt(c)).toBe('unknown')
  })

  it('right-click sets rock and swaps a water mark to rock', () => {
    const s = makeSession()
    const c = firstNonGiven(s.board)
    s.applyMark(c, 'water')
    s.applyMark(c, 'rock')
    expect(s.markAt(c)).toBe('rock')
  })

  it('marking a given clue cell is a no-op', () => {
    const s = makeSession()
    const g = firstGiven(s.board)
    const delta = s.applyMark(g, 'water')
    expect(delta.changed).toBe(false)
    expect(s.markAt(g)).toBe('rock')
  })

  it('reports whether an applied mark matches the solution (for nudge)', () => {
    const s = makeSession()
    const rock = firstHiddenRock(s.board)
    expect(s.applyMark(rock, 'water').correct).toBe(false)
    expect(s.applyMark(rock, 'rock').correct).toBe(true)
  })
})

describe('pool reward (US2, SC-001)', () => {
  it('reveals the creature exactly once, only when the pool is fully correct', () => {
    const s = makeSession()
    const pool = s.pools[0]
    let reveals = 0
    for (let i = 0; i < pool.cells.length - 1; i++) {
      reveals += s.applyMark(pool.cells[i], 'water').revealed.length
    }
    expect(s.revealed.size).toBe(0) // not before fully marked
    const last = s.applyMark(pool.cells[pool.cells.length - 1], 'water')
    reveals += last.revealed.length
    expect(last.revealed).toEqual([pool.id])
    expect(s.revealed.has(pool.id)).toBe(true)
    expect(reveals).toBe(1)
  })

  it('reverts the reveal when the pool is broken, without duplicating on re-completion', () => {
    const s = makeSession()
    const pool = s.pools[0]
    for (const c of pool.cells) s.applyMark(c, 'water')
    expect(s.revealed.has(pool.id)).toBe(true)

    const broken = s.applyMark(pool.cells[0], 'water') // toggles back to unknown
    expect(broken.unrevealed).toEqual([pool.id])
    expect(s.revealed.has(pool.id)).toBe(false)

    const recompleted = s.applyMark(pool.cells[0], 'water')
    expect(recompleted.revealed).toEqual([pool.id]) // fires again, exactly once
    expect(s.revealed.size).toBe(1)
  })

  it('does not complete a pool when a bounding cell is mis-marked water', () => {
    const s = makeSession()
    // A bounding cell can only be mis-marked if it isn't a fixed (given) clue.
    let target: { poolId: string; cells: string[]; boundary: string } | null = null
    for (const p of s.pools) {
      const b = p.boundary.find((k) => !s.isGiven(k))
      if (b) {
        target = { poolId: p.id, cells: p.cells, boundary: b }
        break
      }
    }
    expect(target, 'fixture should have a pool with a non-given boundary rock').not.toBeNull()
    const t = target!

    for (const c of t.cells) s.applyMark(c, 'water')
    expect(s.revealed.has(t.poolId)).toBe(true)
    s.applyMark(t.boundary, 'water') // wrongly extend water past the pool
    expect(s.revealed.has(t.poolId)).toBe(false)
  })
})

describe('board completion (US3, SC-002)', () => {
  it('is complete iff every cell is correctly marked', () => {
    const s = makeSession()
    expect(s.isComplete).toBe(false)
    solveSession(s)
    expect(s.isComplete).toBe(true)
  })

  it('is not complete with a single wrong mark', () => {
    const s = makeSession()
    solveSession(s)
    s.applyMark(waterCells(s.board)[0], 'rock') // flip a correct water to rock
    expect(s.isComplete).toBe(false)
  })
})

describe('undo / redo (US4, FR-007)', () => {
  it('reverts and re-applies one mark at a time', () => {
    const s = makeSession()
    const c = firstNonGiven(s.board)
    s.applyMark(c, 'water')
    s.undo()
    expect(s.markAt(c)).toBe('unknown')
    expect(s.canRedo()).toBe(true)
    s.redo()
    expect(s.markAt(c)).toBe('water')
  })

  it('a new mark clears the redo stack', () => {
    const s = makeSession()
    const board = s.board
    const cells = [...board.cells].filter(([, cell]) => !cell.given).map(([k]) => k)
    s.applyMark(cells[0], 'water')
    s.undo()
    expect(s.canRedo()).toBe(true)
    s.applyMark(cells[1], 'rock')
    expect(s.canRedo()).toBe(false)
  })

  it('undo past the start is a no-op', () => {
    const s = makeSession()
    expect(s.canUndo()).toBe(false)
    expect(s.undo().changed).toBe(false)
  })

  it('keeps revealed pools consistent across undo/redo', () => {
    const s = makeSession()
    const pool = s.pools[0]
    for (const c of pool.cells) s.applyMark(c, 'water')
    expect(s.revealed.has(pool.id)).toBe(true)
    s.undo()
    expect(s.revealed.has(pool.id)).toBe(false)
    s.redo()
    expect(s.revealed.has(pool.id)).toBe(true)
  })
})

describe('serialize / restore (US4, SC-003)', () => {
  it('serializes to the InProgressBoard shape and round-trips to an identical session', () => {
    const s = makeSession()
    const pool = s.pools[0]
    for (const c of pool.cells) s.applyMark(c, 'water')
    s.applyMark(firstHiddenRock(s.board), 'rock')

    const save = s.serialize()
    expect(Object.keys(save).sort()).toEqual(['marks', 'request', 'revealed', 'v'])
    expect(save.request).toEqual(s.board.params)

    const board2 = generateBoard(save.request) // regenerated from the seed
    const s2 = PlaySession.restore(board2, save)
    expect(s2.serialize()).toEqual(save)
    expect(s2.revealed).toEqual(s.revealed)
    expect(s2.canUndo()).toBe(false) // fresh undo stack after restore
  })
})

describe('edge cases (T035)', () => {
  it('rapid repeated clicks on one cell toggle predictably', () => {
    const s = makeSession()
    const c = firstNonGiven(s.board)
    const seen: string[] = []
    for (let i = 0; i < 4; i++) {
      s.applyMark(c, 'water')
      seen.push(s.markAt(c))
    }
    expect(seen).toEqual(['water', 'unknown', 'water', 'unknown'])
  })

  it('completing the board also settles all pools as revealed', () => {
    const s = makeSession()
    solveSession(s)
    expect(s.isComplete).toBe(true)
    expect(s.revealed.size).toBe(s.pools.length)
  })
})

describe('progress counters + gentle-flag (UX feedback)', () => {
  it('counts remaining pools and stones, both reaching zero on solve', () => {
    const s = makeSession()
    expect(s.poolsRemaining).toBe(s.pools.length)
    expect(s.stonesRemaining).toBe(s.totalStones)
    expect(s.totalStones).toBeGreaterThan(0)
    solveSession(s)
    expect(s.poolsRemaining).toBe(0)
    expect(s.stonesRemaining).toBe(0)
  })

  it('counts remaining water in cells, not pools, and reaches zero on solve', () => {
    const s = makeSession()
    expect(s.waterRemaining).toBe(s.totalWater)
    expect(s.totalWater).toBe(waterCells(s.board).length)
    // The HUD counter must track cells: a board whose water sits in few, large
    // pools would otherwise read "1 pool left" with most of the board unmarked.
    expect(s.totalWater).toBeGreaterThan(s.pools.length)
    const w = waterCells(s.board)[0]
    s.applyMark(w, 'water')
    expect(s.waterRemaining).toBe(s.totalWater - 1)
    s.applyMark(w, 'water') // toggle back off — the count comes back with it
    expect(s.waterRemaining).toBe(s.totalWater)
    solveSession(s)
    expect(s.waterRemaining).toBe(0)
  })

  it('a wrong water mark does not count toward water filled', () => {
    const s = makeSession()
    const rock = firstHiddenRock(s.board)
    s.applyMark(rock, 'water') // wrong: a rock cell marked water
    expect(s.waterRemaining).toBe(s.totalWater)
  })

  it('a wrong mark does not count toward stones placed', () => {
    const s = makeSession()
    const rock = firstHiddenRock(s.board)
    s.applyMark(rock, 'water') // wrong
    expect(s.stonesRemaining).toBe(s.totalStones)
    s.applyMark(rock, 'rock') // corrected
    expect(s.stonesRemaining).toBe(s.totalStones - 1)
  })

  it('tallies errors as they happen and never counts back down', () => {
    const s = makeSession()
    const rock = firstHiddenRock(s.board)
    expect(s.errorsMade).toBe(0)

    s.applyMark(rock, 'water') // wrong
    expect(s.errorsMade).toBe(1)
    s.applyMark(rock, 'water') // clearing it is not a new error
    expect(s.errorsMade).toBe(1)
    s.applyMark(rock, 'rock') // correcting it is not either
    expect(s.errorsMade).toBe(1)
    // The outstanding-mistake flag clears, but the tally is a running record.
    expect(s.mistakeCells().size).toBe(0)
    expect(s.errorsMade).toBe(1)

    const water = waterCells(s.board)[0]
    s.applyMark(water, 'rock') // a second, different wrong mark
    expect(s.errorsMade).toBe(2)
  })

  it('does not re-count an error when undo/redo replays it', () => {
    const s = makeSession()
    const rock = firstHiddenRock(s.board)
    s.applyMark(rock, 'water')
    expect(s.errorsMade).toBe(1)
    s.undo()
    expect(s.errorsMade).toBe(1)
    s.redo()
    expect(s.errorsMade).toBe(1)
  })

  it('flags cells marked against the solution and clears them on correction', () => {
    const s = makeSession()
    const rock = firstHiddenRock(s.board)
    const water = waterCells(s.board)[0]
    expect(s.mistakeCells().size).toBe(0)
    s.applyMark(rock, 'water')
    s.applyMark(water, 'rock')
    const wrong = s.mistakeCells()
    expect(wrong.has(rock)).toBe(true)
    expect(wrong.has(water)).toBe(true)
    s.applyMark(rock, 'rock')
    s.applyMark(water, 'water')
    expect(s.mistakeCells().size).toBe(0)
  })
})
