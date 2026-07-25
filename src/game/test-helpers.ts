// test-helpers.ts — fixtures for the game-logic tests: a fixed-seed board + a
// session over it, plus helpers to drive it to completion. Imported only by tests.
import { type Board, type BoardParams, generateBoard } from '@/core'
import { PlaySession } from './session'

export const TEST_PARAMS: BoardParams = {
  seed: 'PLAY-0001',
  size: 'Small',
  difficulty: 'Calm',
  clues: { connectivity: true, lineTotals: true },
}

export function makeTestBoard(params: BoardParams = TEST_PARAMS): Board {
  return generateBoard(params)
}

export function makeSession(board: Board = makeTestBoard()): PlaySession {
  return new PlaySession(board)
}

/** Mark every non-given cell to its correct solution state (drives to complete). */
export function solveSession(session: PlaySession): void {
  for (const [k, cell] of session.board.cells) {
    if (cell.given) continue
    session.applyMark(k, cell.state)
  }
}

export function firstNonGiven(board: Board): string {
  for (const [k, cell] of board.cells) if (!cell.given) return k
  throw new Error('no non-given cell')
}

export function firstGiven(board: Board): string {
  for (const [k, cell] of board.cells) if (cell.given) return k
  throw new Error('no given cell')
}

/** A non-given cell whose solution is rock (a hidden rock the player must find). */
export function firstHiddenRock(board: Board): string {
  for (const [k, cell] of board.cells) if (!cell.given && cell.state === 'rock') return k
  throw new Error('no hidden rock')
}

export function waterCells(board: Board): string[] {
  const out: string[] = []
  for (const [k, cell] of board.cells) if (!cell.given && cell.state === 'water') out.push(k)
  return out
}
