// generate.worker.ts — off-main-thread board generation. Receives BoardParams,
// runs the pure engine, posts back the verified Board. Kept trivial: all logic
// is in the engine; this is just the thread boundary.
import type { BoardParams } from '@/core'
import { generateBoard } from '@/core'

interface WorkerScope {
  onmessage: ((event: MessageEvent<BoardParams>) => void) | null
  postMessage(message: unknown): void
}

const ctx = self as unknown as WorkerScope
ctx.onmessage = (event) => {
  ctx.postMessage(generateBoard(event.data))
}
