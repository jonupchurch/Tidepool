// In-progress board round-trip (T014): only player state is persisted; the
// board is regenerated from the saved `request` via the engine and must match
// byte-for-byte — proving the board itself is never stored (tiny, robust saves).
import { type BoardParams, generateBoard, isParityClue, serializeBoard } from '@/core'
import { createMemoryBackend } from './memory-backend'
import { loadRecord, saveRecord } from './save-store'
import type { InProgressBoardRecord } from './schemas'

describe('in-progress board persistence', () => {
  it('regenerates the identical board from the saved request', async () => {
    const request: BoardParams = {
      seed: 'RESUME-1',
      size: 'Small',
      difficulty: 'Tricky',
      clues: { connectivity: true, lineTotals: true },
    }
    const canonical = serializeBoard(generateBoard(request))

    const store = createMemoryBackend()
    const record: InProgressBoardRecord = {
      v: 1,
      request,
      marks: { '0,0': 'water', '1,0': 'rock' },
      revealed: ['0,0'],
    }
    await saveRecord(store, 'inProgressBoard', record)

    const loaded = await loadRecord(store, 'inProgressBoard')
    // Player state preserved exactly...
    expect(loaded.marks).toEqual(record.marks)
    expect(loaded.revealed).toEqual(record.revealed)
    // ...and the board reproduces byte-for-byte from the saved request.
    expect(serializeBoard(generateBoard(loaded.request))).toBe(canonical)
    // The saved record carries no board geometry — only the request + player state.
    expect(Object.keys(loaded).sort()).toEqual(['marks', 'request', 'revealed', 'v'])
  })

  it('resumes an even/odd board as the even/odd board it was (018 FR-008)', async () => {
    // The clue set travels inside `request`, so a board keeps its parity clues
    // on resume even if the player has since switched the preference off.
    const request: BoardParams = {
      seed: 'RESUME-2',
      size: 'Medium',
      difficulty: 'Deep',
      clues: { connectivity: true, lineTotals: true, evenOdd: true },
    }
    const board = generateBoard(request)
    const canonical = serializeBoard(board)
    expect([...board.cells.values()].some((c) => c.clue && isParityClue(c.clue))).toBe(true)

    const store = createMemoryBackend()
    await saveRecord(store, 'inProgressBoard', {
      v: 1,
      request,
      marks: { '0,0': 'water' },
      revealed: [],
    } satisfies InProgressBoardRecord)

    const loaded = await loadRecord(store, 'inProgressBoard')
    expect(loaded.request.clues.evenOdd).toBe(true)
    expect(serializeBoard(generateBoard(loaded.request))).toBe(canonical)
  })
})
