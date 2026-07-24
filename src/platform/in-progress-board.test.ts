// In-progress board round-trip (T014): only player state is persisted; the
// board is regenerated from the saved `request` via the engine and must match
// byte-for-byte — proving the board itself is never stored (tiny, robust saves).
import { type BoardParams, generateBoard, serializeBoard } from '@/core'
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
})
