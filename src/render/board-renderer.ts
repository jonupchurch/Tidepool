// board-renderer.ts — the Canvas 2D board renderer. Lays out a pointy-top hex
// board, draws each present cell by state (unknown / water / rock / clue) using
// the theme palette, renders adjacency clues with `{}` / `--` framing, line
// totals in the margins, an optional hover highlight, and revealed-pool
// creatures. Behind an interface so it stays swappable to WebGL later.
import type { AdjacencyClue, Board } from '@/core'
import { key, parseKey } from '@/core'
import type { Mark, Pool } from '@/game'
import { cellStyle } from './cell-style'
import { type HexLayout, fitLayout, hexToPixel, hitTest } from './layout'
import {
  type LineAnchor,
  type LineLabel,
  guideSegment,
  labelAt,
  lineAnchors,
  lineLabels,
} from './line-labels'
import { type Palette, readPalette } from './palette'
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

function clueText(clue: AdjacencyClue): string {
  if (clue.connectivity === 'connected') return `{${clue.count}}`
  if (clue.connectivity === 'split') return `-${clue.count}-`
  return `${clue.count}`
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
    this._layout = this.fit(canvas.width || 1, canvas.height || 1)
    this.width = canvas.width
    this.height = canvas.height
    this.labels = lineLabels(board, this._layout)
  }

  /** Fit the board *and* its margin labels inside the viewport. */
  private fit(width: number, height: number): HexLayout {
    return fitLayout(
      this.board.present,
      width,
      height,
      24,
      this.anchors.map((a) => a.coord),
    )
  }

  get layout(): HexLayout {
    return this._layout
  }

  get lineLabels(): readonly LineLabel[] {
    return this.labels
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.palette = readPalette()
    this._layout = this.fit(width, height)
    this.labels = lineLabels(this.board, this._layout)
  }

  cellAt(x: number, y: number): string | null {
    return hitTest(this._layout, this.board.present, x, y)
  }

  lineLabelAt(x: number, y: number): LineLabel | null {
    return labelAt(this.labels, x, y, this._layout.size * 0.7)
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
        ctx.font = `700 ${size * 0.9}px ${DISPLAY_FONT}`
        ctx.fillText(clueText(cell.clue), x, y + size * 0.06)
      } else if (style.glyph && !spriteDrawn) {
        ctx.fillStyle = palette.ink
        ctx.font = `${size * 0.7}px sans-serif`
        ctx.fillText(style.glyph, x, y + size * 0.04)
      }
    }

    this.drawGuides(input.guides)
    this.drawLineTotals(input.guides)
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
   * Line totals, each anchored on its own row's axis (see line-labels.ts). A
   * toggled row's total is tinted to match its guide.
   */
  private drawLineTotals(guides: ReadonlySet<string>): void {
    const { ctx, palette } = this
    const size = this._layout.size
    ctx.font = `700 ${size * 0.72}px ${DISPLAY_FONT}`
    for (const l of this.labels) {
      ctx.fillStyle = guides.has(l.id) ? palette.tide : palette.deepPool
      ctx.fillText(`${l.total}`, l.x, l.y)
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
