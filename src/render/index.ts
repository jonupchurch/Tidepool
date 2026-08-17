// render — Canvas 2D board renderer + input hit-testing. Kept behind this
// module so it can be swapped to WebGL/Pixi later without touching game/ui.
export { createBoardRenderer, clueText } from './board-renderer'
export type { BoardRenderer, RenderInput } from './board-renderer'
export { fitLayout, hexToPixel, hitTest, pixelToAxial } from './layout'
export type { HexLayout } from './layout'
export { readPalette } from './palette'
export type { Palette } from './palette'
export { cellStyle } from './cell-style'
export type { CellStyle, CellVisual } from './cell-style'
export { animate, makeTimeline } from './animations'
export type { Timeline } from './animations'
export { whenSpritesReady } from './sprites'
