// board-loader.ts — a promise-based client for off-main-thread board generation
// (engine research note R9): generation runs in a Web Worker so the UI never
// janks. Falls back to synchronous generation where Worker is unavailable
// (Node/tests/SSR), so this stays portable + testable.
import { type Board, type BoardParams, generateBoard } from '@/core'

/** Generate a board for `params`, off the main thread when a Worker is available. */
export function loadBoard(params: BoardParams): Promise<Board> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(generateBoard(params))
  }
  return new Promise<Board>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/generate.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<Board>) => {
      resolve(event.data)
      worker.terminate()
    }
    worker.onerror = (event) => {
      reject(new Error(event.message || 'board generation failed'))
      worker.terminate()
    }
    worker.postMessage(params)
  })
}
