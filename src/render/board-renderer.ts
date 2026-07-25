// board-renderer.ts — the Canvas 2D board renderer. Lays out a pointy-top hex
// board, draws each present cell by state (unknown / water / rock / clue) using
// the theme palette, renders adjacency clues with `{}` / `--` framing, line
// totals in the margins, an optional hover highlight, and revealed-pool
// creatures. Behind an interface so it stays swappable to WebGL later.
import type { AdjacencyClue, Board } from '@/core'
import { key, linesOf, parseKey } from '@/core'
import type { Mark, Pool } from '@/game'
import { cellStyle } from './cell-style'
import { type HexLayout, fitLayout, hexToPixel, hitTest } from './layout'
import { type Palette, readPalette } from './palette'

export interface RenderInput {
  markOf: (cellKey: string) => Mark
  hovered: string | null
  highlighted: ReadonlySet<string>
  revealed: ReadonlySet<string>
  /** Cells currently marked against the solution — softly flagged (gentle nudge). */
  mistakes: ReadonlySet<string>
  pools: Pool[]
  colorblind: boolean
}

export interface BoardRenderer {
  resize(width: number, height: number): void
  draw(input: RenderInput): void
  cellAt(x: number, y: number): string | null
  readonly layout: HexLayout
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
  private lines: ReturnType<typeof linesOf>

  constructor(
    private canvas: HTMLCanvasElement,
    private board: Board,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('BoardRenderer: 2D context unavailable')
    this.ctx = ctx
    this.palette = readPalette()
    this.lines = linesOf(board.present)
    this._layout = fitLayout(board.present, canvas.width || 1, canvas.height || 1)
    this.width = canvas.width
    this.height = canvas.height
  }

  get layout(): HexLayout {
    return this._layout
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.palette = readPalette()
    this._layout = fitLayout(this.board.present, width, height)
  }

  cellAt(x: number, y: number): string | null {
    return hitTest(this._layout, this.board.present, x, y)
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

      // Gentle-flag a wrong mark: a faint coral "ripple of doubt" tint that
      // stays until the player corrects it (never a hard error).
      if (input.mistakes.has(k)) {
        ctx.save()
        ctx.globalAlpha = 0.3
        ctx.fillStyle = palette.coral
        hexPath(ctx, x, y, size * 0.94)
        ctx.fill()
        ctx.restore()
      }

      if (cell.given && cell.clue) {
        ctx.fillStyle = palette.deepPool
        ctx.font = `700 ${size * 0.9}px ${DISPLAY_FONT}`
        ctx.fillText(clueText(cell.clue), x, y + size * 0.06)
      } else if (style.glyph) {
        ctx.fillStyle = palette.ink
        ctx.font = `${size * 0.7}px sans-serif`
        ctx.fillText(style.glyph, x, y + size * 0.04)
      }
    }

    this.drawLineTotals()
    this.drawCreatures(input)
  }

  private boardCenter(): { x: number; y: number } {
    return {
      x: (this.board.bounds.minQ + this.board.bounds.maxQ) / 2,
      y: (this.board.bounds.minR + this.board.bounds.maxR) / 2,
    }
  }

  private drawLineTotals(): void {
    if (this.board.lines.length === 0) return
    const { ctx, palette } = this
    const size = this._layout.size
    const center = hexToPixel(this._layout, { q: this.boardCenter().x, r: this.boardCenter().y })
    const byId = new Map(this.lines.map((l) => [`${l.axis},${l.index}`, l]))

    ctx.fillStyle = palette.deepPool
    ctx.font = `700 ${size * 0.72}px ${DISPLAY_FONT}`
    for (const lc of this.board.lines) {
      const line = byId.get(`${lc.axis},${lc.index}`)
      if (!line) continue
      const first = parseKey(line.cells[0])
      const p = hexToPixel(this._layout, first)
      const dx = p.x - center.x
      const dy = p.y - center.y
      const mag = Math.hypot(dx, dy) || 1
      const ox = p.x + (dx / mag) * size * 1.15
      const oy = p.y + (dy / mag) * size * 1.15
      ctx.fillText(`${lc.total}`, ox, oy)
    }
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
