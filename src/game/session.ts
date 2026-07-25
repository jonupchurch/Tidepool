// session.ts — PlaySession: the live, pure play-state over an engine Board. Holds
// the player's marks, derives pool-completion + board-completion from them,
// tracks undo/redo history, and serializes to the persistence seam's
// InProgressBoard shape (only player state; the board regenerates from the seed).
// DOM-free and React-free (enforced by purity.test.ts).
import type { Board } from '@/core'
import type { InProgressBoardRecord } from '@/platform'
import { type Pool, waterPools } from './pools'

export type Mark = 'water' | 'rock' | 'unknown'
/** The two states a click can assign (unknown is reached by clearing). */
export type MarkKind = 'water' | 'rock'

export interface MarkDelta {
  /** whether a mark actually changed (a given-cell click is a no-op) */
  changed: boolean
  /** pool ids whose creature became revealed by this change */
  revealed: string[]
  /** pool ids whose creature reverted by this change */
  unrevealed: string[]
  /** board fully + correctly resolved after this change */
  complete: boolean
  /** did the applied mark match the solution? null when nothing was applied */
  correct: boolean | null
}

interface Move {
  key: string
  prev: Mark
  next: Mark
}

export class PlaySession {
  readonly board: Board
  readonly pools: Pool[]
  /** Total non-given rock ("stone") cells the player must place to finish. */
  readonly totalStones: number
  /** Total water cells the player must fill to finish. */
  readonly totalWater: number
  private marks = new Map<string, MarkKind>()
  private history: Move[] = []
  private ptr = 0
  private revealedSet = new Set<string>()
  private complete = false
  /**
   * Running tally of wrong marks placed this session — counted at the moment
   * the player places one, so undo/redo replays never re-count it. Distinct
   * from `mistakeCells()`, which is the *outstanding* set and clears on fix.
   * In-memory only: not carried in the save record.
   */
  private errors = 0

  constructor(board: Board) {
    this.board = board
    this.pools = waterPools(board)
    let stones = 0
    let water = 0
    for (const k of board.present) {
      const cell = board.cells.get(k)
      if (!cell) continue
      if (cell.state === 'water') water++
      else if (!cell.given) stones++
    }
    this.totalStones = stones
    this.totalWater = water
    this.recompute()
  }

  /** The effective mark of a cell: given clue cells are fixed rock. */
  markAt(key: string): Mark {
    const cell = this.board.cells.get(key)
    if (!cell) return 'unknown'
    if (cell.given) return 'rock'
    return this.marks.get(key) ?? 'unknown'
  }

  isGiven(key: string): boolean {
    return this.board.cells.get(key)?.given ?? false
  }

  get isComplete(): boolean {
    return this.complete
  }
  get revealed(): ReadonlySet<string> {
    return this.revealedSet
  }
  /** Pools not yet fully resolved (drives creature reveals, not the HUD). */
  get poolsRemaining(): number {
    return this.pools.length - this.revealedSet.size
  }
  /**
   * Water cells not yet correctly filled (the HUD's "water left" counter).
   * Counted in cells so it reads in the same unit as `stonesRemaining` — pools
   * are few and lopsided, so a pool count is not a progress signal.
   */
  get waterRemaining(): number {
    let filled = 0
    for (const [k, m] of this.marks) {
      const cell = this.board.cells.get(k)
      if (cell && cell.state === 'water' && m === 'water') filled++
    }
    return this.totalWater - filled
  }
  /** Non-given rock cells not yet correctly marked (the "remaining stones" counter). */
  get stonesRemaining(): number {
    let placed = 0
    for (const [k, m] of this.marks) {
      const cell = this.board.cells.get(k)
      if (cell && !cell.given && cell.state === 'rock' && m === 'rock') placed++
    }
    return this.totalStones - placed
  }
  /** Wrong marks placed so far this session (a record, not a penalty). */
  get errorsMade(): number {
    return this.errors
  }
  /** Non-given cells whose current mark contradicts the solution (gentle-flag). */
  mistakeCells(): Set<string> {
    const wrong = new Set<string>()
    for (const [k, m] of this.marks) {
      const cell = this.board.cells.get(k)
      if (cell && !cell.given && m !== cell.state) wrong.add(k)
    }
    return wrong
  }
  canUndo(): boolean {
    return this.ptr > 0
  }
  canRedo(): boolean {
    return this.ptr < this.history.length
  }

  private write(key: string, mark: Mark): void {
    if (mark === 'unknown') this.marks.delete(key)
    else this.marks.set(key, mark)
  }

  /**
   * Apply a click of `kind` to a cell: set it, or clear it if it already holds
   * that kind (toggle/cycle). Given cells are a no-op. FR-002/FR-003.
   */
  applyMark(key: string, kind: MarkKind): MarkDelta {
    const cell = this.board.cells.get(key)
    if (!cell || cell.given) return this.noop()
    const prev = this.marks.get(key) ?? 'unknown'
    const next: Mark = prev === kind ? 'unknown' : kind
    if (prev === next) return this.noop()

    this.history.length = this.ptr // truncate the redo tail
    this.history.push({ key, prev, next })
    this.ptr++
    this.write(key, next)

    const delta = this.recompute()
    delta.changed = true
    delta.correct = next === 'unknown' ? null : next === cell.state
    if (delta.correct === false) this.errors++
    return delta
  }

  undo(): MarkDelta {
    if (!this.canUndo()) return this.noop()
    this.ptr--
    const m = this.history[this.ptr]
    this.write(m.key, m.prev)
    const delta = this.recompute()
    delta.changed = true
    return delta
  }

  redo(): MarkDelta {
    if (!this.canRedo()) return this.noop()
    const m = this.history[this.ptr]
    this.ptr++
    this.write(m.key, m.next)
    const delta = this.recompute()
    delta.changed = true
    return delta
  }

  private poolComplete(p: Pool): boolean {
    for (const c of p.cells) if (this.markAt(c) !== 'water') return false
    for (const b of p.boundary) if (this.markAt(b) === 'water') return false
    return true
  }

  private boardComplete(): boolean {
    for (const k of this.board.present) {
      const cell = this.board.cells.get(k)
      if (!cell || cell.given) continue
      if ((this.marks.get(k) ?? 'unknown') !== cell.state) return false
    }
    return true
  }

  /** Recompute derived state (revealed pools + completion); return the deltas. */
  private recompute(): MarkDelta {
    const now = new Set<string>()
    for (const p of this.pools) if (this.poolComplete(p)) now.add(p.id)
    const revealed: string[] = []
    const unrevealed: string[] = []
    for (const id of now) if (!this.revealedSet.has(id)) revealed.push(id)
    for (const id of this.revealedSet) if (!now.has(id)) unrevealed.push(id)
    this.revealedSet = now
    this.complete = this.boardComplete()
    return { changed: false, revealed: revealed.sort(), unrevealed: unrevealed.sort(), complete: this.complete, correct: null }
  }

  private noop(): MarkDelta {
    return { changed: false, revealed: [], unrevealed: [], complete: this.complete, correct: null }
  }

  /** Serialize to the persistence seam's InProgressBoard record (player state only). */
  serialize(): InProgressBoardRecord {
    const marks: Record<string, MarkKind> = {}
    for (const [k, m] of this.marks) marks[k] = m
    return { v: 1, request: this.board.params, marks, revealed: [...this.revealedSet].sort() }
  }

  /** Replace marks from a saved record (fresh undo history), recompute derived state. */
  private loadMarks(marks: Record<string, MarkKind>): void {
    this.marks.clear()
    this.history = []
    this.ptr = 0
    for (const [k, m] of Object.entries(marks)) {
      const cell = this.board.cells.get(k)
      if (cell && !cell.given) this.marks.set(k, m)
    }
    this.recompute()
  }

  /** Resume a session for `board` (regenerated from the save's request) + marks. */
  static restore(board: Board, save: InProgressBoardRecord): PlaySession {
    const session = new PlaySession(board)
    session.loadMarks(save.marks)
    return session
  }
}
