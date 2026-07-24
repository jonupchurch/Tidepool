// Solver tests (T013): technique solving, uniqueness counter, connectivity
// forcing, contradiction detection.
import { hexRegion, presentSet } from './hex'
import { countSolutions, solve } from './solver'
import { connectivityPass, forcedCountPass, setup } from './techniques'
import { customBoard, fullyClued, layoutOf } from './test-helpers'

describe('technique solver', () => {
  it('solves a fully-clued board uniquely and guess-free', () => {
    const present = presentSet(hexRegion(2))
    const layout = layoutOf(present, ['0,0', '1,0'])
    const board = fullyClued(present, layout)

    const res = solve(board)
    expect(res.solved).toBe(true)
    expect(res.unique).toBe(true)
    expect(res.contradiction).toBeUndefined()
    expect(res.techniquesUsed).toContain('forced-count')
  })

  it('counts exactly one solution for a fully-clued board', () => {
    const present = presentSet(hexRegion(2))
    const layout = layoutOf(present, ['0,0', '1,0', '-1,1'])
    const board = fullyClued(present, layout)
    expect(countSolutions(board)).toEqual({ count: 1, exhausted: false })
  })
})

describe('uniqueness oracle', () => {
  it('reports a genuinely ambiguous board as not unique / not solved', () => {
    // Centre clue "1 water among my 2 present neighbours" → either neighbour.
    const present = new Set(['0,0', '1,0', '1,-1'])
    const layout = layoutOf(present, ['1,0']) // one neighbour water
    const board = customBoard(present, layout, ['0,0'])

    const res = solve(board)
    expect(res.unique).toBe(false)
    expect(res.solved).toBe(false)
    expect(countSolutions(board).count).toBe(2)
  })
})

describe('connectivity technique', () => {
  it('forces the shared cell when only connected arrangements survive', () => {
    // Centre sees 2 water among slots {0,1,2} (slots 3,4,5 known rock) and is
    // annotated connected → the middle slot (1,-1) must be water.
    const present = presentSet(hexRegion(1))
    const layout = layoutOf(present, ['1,-1', '0,-1']) // slots 1 and 2 water
    const board = customBoard(present, layout, ['0,0', '-1,0', '-1,1', '0,1'], {
      withConnectivity: true,
    })

    const { assign, constraints } = setup(board)
    forcedCountPass(constraints, assign, { contradiction: false, used: new Set() })
    connectivityPass(constraints, assign, { contradiction: false, used: new Set() })
    expect(assign.get('1,-1')).toBe('water')
  })
})

describe('contradiction detection', () => {
  it('flags an unsatisfiable clue set', () => {
    const present = presentSet(hexRegion(2))
    const layout = layoutOf(present, ['0,0'])
    const board = fullyClued(present, layout)
    // Tamper: demand more water neighbours than a cell can have.
    const someRock = [...board.cells.values()].find((c) => c.given)!
    someRock.clue = { count: 99 }

    const res = solve(board)
    expect(res.contradiction).toBe(true)
    expect(res.solved).toBe(false)
  })
})
