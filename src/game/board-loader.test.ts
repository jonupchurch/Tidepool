// board-loader (T004): resolves a board equal to direct engine generation
// (exercises the synchronous fallback path in Node).
import { generateBoard, serializeBoard } from '@/core'
import { loadBoard } from './board-loader'
import { TEST_PARAMS } from './test-helpers'

describe('loadBoard', () => {
  it('resolves to the same board the engine generates', async () => {
    const board = await loadBoard(TEST_PARAMS)
    expect(serializeBoard(board)).toBe(serializeBoard(generateBoard(TEST_PARAMS)))
  })
})
