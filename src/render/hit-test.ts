// hit-test.ts — pointer → cell mapping (the inverse of the layout math). Thin
// re-export of the pure geometry so input code has a focused entry point. No DOM.
export { hitTest, pixelToAxial } from './layout'
export type { HexLayout } from './layout'
