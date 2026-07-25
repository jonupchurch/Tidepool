// Hover-informs (T030): what a hovered cell / line total highlights.
import { key, linesOf, presentNeighbors } from '@/core'
import { cellInforms, lineInforms } from './highlight'
import { makeTestBoard } from './test-helpers'

describe('cellInforms', () => {
  const board = makeTestBoard()

  it('a clue cell informs its present neighbour ring', () => {
    const given = [...board.cells.values()].find((c) => c.given)!
    const informs = cellInforms(board, key(given.coord))
    expect(informs.length).toBeGreaterThan(0)
    expect(informs).toEqual(presentNeighbors(given.coord, board.present).map(key).sort())
  })

  it('a non-clue cell informs nothing', () => {
    const hidden = [...board.cells.values()].find((c) => !c.given)!
    expect(cellInforms(board, key(hidden.coord))).toEqual([])
  })
})

describe('lineInforms', () => {
  it('a line total informs its whole axis line', () => {
    const board = makeTestBoard()
    const line = linesOf(board.present)[0]
    expect(lineInforms(board, line.axis, line.index)).toEqual(line.cells)
  })
})
