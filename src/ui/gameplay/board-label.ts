// board-label.ts — the one-line identity a board shows while you play it.
//
// It doubles as the *shareable* token (016): every part it prints is a token
// `parseSeedEntry` reads back, and `·` is one of the separators that parser
// splits on, so a player can copy the label to a friend and get the same board.
// That is the whole constraint — if a mechanic changes which board a seed makes,
// it has to appear here or the label stops being a complete description.
//
// Pure — a string from params, nothing more.
import type { BoardParams } from '@/core'
import { DEFAULT_SHAPE, shapeName } from '@/core'

export function boardLabel(params: BoardParams): string {
  const parts: string[] = [params.seed, params.size, params.difficulty]
  // Only what differs from the default is printed. Naming the hexagon on every
  // board would make the common label longer to say nothing.
  if (params.shape && params.shape !== DEFAULT_SHAPE) parts.push(shapeName(params.shape))
  if (params.clues.lineConnectivity) parts.push('hints')
  return parts.join(' · ')
}
