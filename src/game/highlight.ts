// highlight.ts — the "what does this cell inform" computation for the optional
// hover-highlight (FR-010). A clue cell informs its neighbour ring; a line total
// informs its axis line. Pure; no DOM.
import { type Axis, type Board, key, linesOf, parseKey, presentNeighbors } from '@/core'

/** Cells a hovered clue cell informs (its present neighbour ring). Empty for a
 *  non-clue cell — only revealed clues carry information. */
export function cellInforms(board: Board, cellKey: string): string[] {
  const cell = board.cells.get(cellKey)
  if (!cell || !cell.given) return []
  return presentNeighbors(parseKey(cellKey), board.present)
    .map(key)
    .sort()
}

/** Cells a hovered line total informs (the whole axis line). */
export function lineInforms(board: Board, axis: Axis, index: number): string[] {
  const line = linesOf(board.present).find((l) => l.axis === axis && l.index === index)
  return line ? [...line.cells] : []
}
