// board-renderer.ts — the Canvas 2D board renderer. Lays out a pointy-top hex
// board, draws each present cell by state (unknown / water / rock / clue) using
// the theme palette, renders adjacency clues with `{}` / `--` framing, line
// totals in the margins, an optional hover highlight, and revealed-pool
// creatures. Behind an interface so it stays swappable to WebGL later.
import type { AdjacencyClue, Board, ClueFace, Connectivity } from '@/core'
import { hasParityFace, key, parseKey } from '@/core'
import type { Mark, Pool } from '@/game'
import { cellStyle } from './cell-style'
import { type HexLayout, fitLayout, hexToPixel, hitTest } from './layout'
import {
  type LineAnchor,
  type LineLabel,
  arrowHead,
  guideSegment,
  labelAt,
  lineAnchors,
  lineLabels,
  tickSegment,
} from './line-labels'
import { type Palette, readPalette } from './palette'
import { backingSize, currentPixelRatio } from './pixel-ratio'
import { BOULDER, WAVES, spriteReady } from './sprites'

export interface RenderInput {
  markOf: (cellKey: string) => Mark
  hovered: string | null
  highlighted: ReadonlySet<string>
  revealed: ReadonlySet<string>
  /** Cells currently marked against the solution — softly flagged (gentle nudge). */
  mistakes: ReadonlySet<string>
  pools: Pool[]
  colorblind: boolean
  /** Line-label ids whose row guide the player has toggled on. */
  guides: ReadonlySet<string>
  /** Line-label ids the player has struck off as satisfied (drawn greyed). */
  doneLines: ReadonlySet<string>
}

export interface BoardRenderer {
  resize(width: number, height: number): void
  draw(input: RenderInput): void
  cellAt(x: number, y: number): string | null
  /** The line total under a pixel, or null — for click-to-toggle row guides. */
  lineLabelAt(x: number, y: number): LineLabel | null
  readonly layout: HexLayout
  /** Placed line totals for the current layout (drives the dev/e2e hook). */
  readonly lineLabels: readonly LineLabel[]
}

// Canvas `ctx.font` does NOT resolve CSS custom properties — `var(--font-display)`
// silently invalidates the declaration, leaving the default 10px font. Use a
// concrete family stack so clue numerals render at the intended size.
const DISPLAY_FONT = '"Bricolage Grotesque", "Nunito", system-ui, sans-serif'

/**
 * What a clue says about QUANTITY.
 *
 * A parity clue withholds the number entirely (018), so it needs a mark that
 * cannot be mistaken for one. Letters lost that argument: in Bricolage
 * Grotesque at 700, `O` and `0` are near-identical at the cell sizes a Large
 * board uses, and `0` is a clue value the game really shows.
 *
 * Strokes instead, which also carries the meaning: ONE stroke for odd, TWO
 * crossed for even — the same "things pair up, or one is left over" that parity
 * is taught with. Neither collides with a digit.
 */
function faceText(face: ClueFace): string {
  if (hasParityFace(face)) return face.parity === 'even' ? '+' : '|'
  return `${face.count}`
}

/** What it says about ARRANGEMENT, wrapped around whatever the face printed. */
function framed(text: string, connectivity?: Connectivity): string {
  if (connectivity === 'connected') return `{${text}}`
  if (connectivity === 'split') return `-${text}-`
  return text
}

/**
 * The text a clue shows — the six forms `4`, `{4}`, `-4-`, `+`, `{+}`, `-+-`.
 *
 * ONE function for both clue sites (019). `clueText` and the old `lineText` were
 * already the same function twice over — identical braces, identical dashes,
 * different field names — so a stone and a row total now read as one vocabulary
 * by construction, rather than by two implementations continuing to agree
 * (010 FR-008).
 */
export function clueText(clue: AdjacencyClue): string {
  return framed(faceText(clue), clue.connectivity)
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30)
    const x = cx + size * Math.cos(angle)
    const y = cy + size * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

class CanvasBoardRenderer implements BoardRenderer {
  private ctx: CanvasRenderingContext2D
  private palette: Palette
  private _layout: HexLayout
  private width = 0
  private height = 0
  private labels: LineLabel[] = []
  /** Size-independent label anchors — reserve their room when fitting. */
  private anchors: LineAnchor[] = []

  constructor(
    private canvas: HTMLCanvasElement,
    private board: Board,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('BoardRenderer: 2D context unavailable')
    this.ctx = ctx
    this.palette = readPalette()
    this.anchors = lineAnchors(board)
    // No CSS layout has happened and resize() hasn't run, so the canvas
    // attributes are still DOM defaults and safe to read as CSS pixels. The
    // first resize() replaces all of this — backing store and transform
    // included — and it fires as soon as the ResizeObserver is attached.
    const cssWidth = canvas.clientWidth || canvas.width || 1
    const cssHeight = canvas.clientHeight || canvas.height || 1
    this._layout = this.fit(cssWidth, cssHeight)
    this.width = cssWidth
    this.height = cssHeight
    this.labels = lineLabels(board, this._layout)
  }

  /** Fit the board *and* its margin labels — dashes included — in the viewport. */
  private fit(width: number, height: number): HexLayout {
    return fitLayout(
      this.board.present,
      width,
      height,
      24,
      this.anchors.flatMap((a) => [a.coord, a.tip]),
    )
  }

  get layout(): HexLayout {
    return this._layout
  }

  get lineLabels(): readonly LineLabel[] {
    return this.labels
  }

  /**
   * Size to a CSS-pixel box.
   *
   * The backing store is allocated in *device* pixels so the board stays sharp
   * on a scaled display, then the context is scaled so every drawing routine
   * below still works in CSS pixels — as does layout, and therefore hit-testing,
   * which reads pointer coordinates straight from `getBoundingClientRect`. The
   * CSS box itself is left to the stylesheet (`w-full h-full`).
   */
  resize(width: number, height: number): void {
    this.width = width
    this.height = height

    const backing = backingSize(width, height, currentPixelRatio())
    this.canvas.width = backing.width
    this.canvas.height = backing.height
    // Assigning width/height resets the context — including its transform — so
    // the scale has to be re-applied here, after, on every resize.
    this.ctx.setTransform(backing.scale, 0, 0, backing.scale, 0, 0)

    this.palette = readPalette()
    this._layout = this.fit(width, height)
    this.labels = lineLabels(this.board, this._layout)
  }

  cellAt(x: number, y: number): string | null {
    return hitTest(this._layout, this.board.present, x, y)
  }

  lineLabelAt(x: number, y: number): LineLabel | null {
    // Kept under the label's clearance from the board so the target sits wholly
    // in the margin; GameplayScreen also tests cells first.
    return labelAt(this.labels, x, y, this._layout.size * 0.55)
  }

  draw(input: RenderInput): void {
    const { ctx, palette } = this
    const size = this._layout.size

    ctx.fillStyle = palette.sand
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.lineWidth = Math.max(1, size * 0.06)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (const k of this.board.present) {
      const cell = this.board.cells.get(k)
      if (!cell) continue
      const { x, y } = hexToPixel(this._layout, cell.coord)

      const visual = cell.given ? 'clue' : markToVisual(input.markOf(k))
      const style = cellStyle(visual, input.colorblind)
      hexPath(ctx, x, y, size * 0.94)
      ctx.fillStyle = palette[style.fill]
      ctx.fill()

      // Tile motif: waves on a water cell, a boulder on a stone. Clipped to the
      // hex so the art never spills past the cell. Given clue cells keep numbers.
      let spriteDrawn = false
      if (visual === 'water' && spriteReady(WAVES)) {
        this.drawSprite(WAVES, x, y, size)
        spriteDrawn = true
      } else if (visual === 'rock' && spriteReady(BOULDER)) {
        this.drawSprite(BOULDER, x, y, size)
        spriteDrawn = true
      }

      if (input.highlighted.has(k)) {
        ctx.strokeStyle = palette.seaGlass
        ctx.lineWidth = Math.max(2, size * 0.14)
      } else if (input.hovered === k) {
        ctx.strokeStyle = palette.coral
        ctx.lineWidth = Math.max(2, size * 0.1)
      } else {
        ctx.strokeStyle = palette[style.outline]
        ctx.lineWidth = Math.max(1, size * 0.06)
      }
      ctx.stroke()

      // Flag a wrong mark clearly: a coral tint plus a bold coral ring — an
      // unmistakable "check this cell" that still stays gentle (no hard fail).
      if (input.mistakes.has(k)) {
        ctx.save()
        ctx.globalAlpha = 0.32
        ctx.fillStyle = palette.coral
        hexPath(ctx, x, y, size * 0.94)
        ctx.fill()
        ctx.restore()
        ctx.strokeStyle = palette.coral
        ctx.lineWidth = Math.max(2.5, size * 0.16)
        hexPath(ctx, x, y, size * 0.86)
        ctx.stroke()
      }

      if (cell.given && cell.clue) {
        ctx.fillStyle = palette.deepPool
        // Parity marks are single strokes, so at the digits' own weight and
        // size a `|` reads lighter than everything around it — close enough to
        // an empty tile with an artifact on it to give a player pause. Heavier
        // and slightly larger evens the visual weight; checked by eye against
        // the digits at 26px, the smallest cells a Large board uses.
        //
        // BARE marks only (019). A framed `{+}` is three glyphs, so it already
        // carries a digit's worth of ink — boosting it too would make it the
        // loudest thing on the board, and it would also outgrow its tile.
        const bare = hasParityFace(cell.clue) && cell.clue.connectivity === undefined
        ctx.font = `${bare ? 800 : 700} ${size * (bare ? 1.15 : 0.9)}px ${DISPLAY_FONT}`
        ctx.fillText(clueText(cell.clue), x, y + size * 0.06)
      } else if (style.glyph && !spriteDrawn) {
        ctx.fillStyle = palette.ink
        ctx.font = `${size * 0.7}px sans-serif`
        ctx.fillText(style.glyph, x, y + size * 0.04)
      }
    }

    this.drawGuides(input.guides)
    this.drawLineTotals(input.guides, input.doneLines)
    this.drawCreatures(input)
  }

  /** Draw a tile sprite centred in a cell, clipped to the hex outline. */
  private drawSprite(img: HTMLImageElement, x: number, y: number, hexSize: number): void {
    const { ctx } = this
    const s = hexSize * 1.62
    ctx.save()
    hexPath(ctx, x, y, hexSize * 0.94)
    ctx.clip()
    ctx.drawImage(img, x - s / 2, y - s / 2, s, s)
    ctx.restore()
  }

  /**
   * Line totals, each anchored on its own row's axis (see line-labels.ts), with
   * a short dash pointing down the row so its direction reads without toggling
   * the guide. Struck-off totals grey out; a toggled row's total takes the
   * guide tint.
   */
  private drawLineTotals(guides: ReadonlySet<string>, done: ReadonlySet<string>): void {
    const { ctx, palette } = this
    const size = this._layout.size
    for (const l of this.labels) {
      const struck = done.has(l.id)
      const colour = struck ? palette.rock : guides.has(l.id) ? palette.tide : palette.deepPool

      // Direction dash + arrowhead — same colour as its number, lighter weight.
      const t = tickSegment(l, this._layout)
      const a = arrowHead(l, this._layout)
      ctx.save()
      ctx.globalAlpha = struck ? 0.4 : 0.65
      ctx.strokeStyle = colour
      ctx.fillStyle = colour
      ctx.lineWidth = Math.max(1, size * 0.05)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(t.x1, t.y1)
      ctx.lineTo(t.x2, t.y2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(a.tip.x, a.tip.y)
      ctx.lineTo(a.left.x, a.left.y)
      ctx.lineTo(a.right.x, a.right.y)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      // A bare mark in the MARGIN needs more help than one on a tile (019).
      // 018 gave `|` extra weight because a single stroke read lighter than the
      // digits around it; out here it is worse, because there is no tile behind
      // it and it sits inches from a direction dash and an arrowhead. Rendered
      // and looked at: at the digits' own weight a margin `|` reads as part of
      // the arrow apparatus rather than as a clue. Same remedy, more of it.
      //
      // Framed marks are left alone: `{+}` is three glyphs and already carries a
      // number's worth of ink, and boosting it would crowd its neighbours.
      const bare = l.count === undefined && l.connectivity === undefined
      ctx.font = `${bare ? 800 : 700} ${size * (bare ? 1.0 : 0.72)}px ${DISPLAY_FONT}`

      ctx.save()
      if (struck) ctx.globalAlpha = 0.55
      ctx.fillStyle = colour
      ctx.fillText(clueText(l), l.x, l.y)
      ctx.restore()
    }
  }

  /** A thin stroke down each toggled row — the player's own reading guide. */
  private drawGuides(guides: ReadonlySet<string>): void {
    if (guides.size === 0) return
    const { ctx, palette } = this
    const size = this._layout.size
    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.strokeStyle = palette.tide
    ctx.lineWidth = Math.max(1.5, size * 0.07)
    ctx.lineCap = 'round'
    for (const l of this.labels) {
      if (!guides.has(l.id)) continue
      const seg = guideSegment(l, this._layout)
      ctx.beginPath()
      ctx.moveTo(seg.x1, seg.y1)
      ctx.lineTo(seg.x2, seg.y2)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawCreatures(input: RenderInput): void {
    if (input.revealed.size === 0) return
    const { ctx, palette } = this
    const size = this._layout.size
    const poolById = new Map(input.pools.map((p) => [p.id, p]))
    for (const id of input.revealed) {
      const pool = poolById.get(id)
      if (!pool) continue
      let sx = 0
      let sy = 0
      for (const c of pool.cells) {
        const p = hexToPixel(this._layout, parseKey(c))
        sx += p.x
        sy += p.y
      }
      const cx = sx / pool.cells.length
      const cy = sy / pool.cells.length
      ctx.beginPath()
      ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = palette.coral
      ctx.fill()
      ctx.fillStyle = palette.foam
      ctx.font = `700 ${size * 0.7}px ${DISPLAY_FONT}`
      ctx.fillText(pool.creatureId === 'crab' ? '🦀' : '✽', cx, cy + size * 0.04)
    }
  }
}

function markToVisual(mark: Mark): 'unknown' | 'water' | 'rock' {
  return mark === 'water' ? 'water' : mark === 'rock' ? 'rock' : 'unknown'
}

export { key }

export function createBoardRenderer(canvas: HTMLCanvasElement, board: Board): BoardRenderer {
  return new CanvasBoardRenderer(canvas, board)
}
