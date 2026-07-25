// GameplayScreen — the playable screen. Loads a board off-thread, builds a
// PlaySession, renders it to a <canvas>, and wires pointer marks, hover
// highlight, the pool-reward toast, board completion, undo/redo, and continuous
// autosave/restore through the platform seam. Chrome is React; the board is
// Canvas. Persistence + next-board go strictly through the 008 / 004 seams.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Board, BoardParams } from '@/core'
import { parseKey } from '@/core'
import {
  type MarkDelta,
  type MarkKind,
  PlaySession,
  cellInforms,
  creatureDef,
  loadBoard,
  recordBoardSolved,
  recordDiscovery,
} from '@/game'
import {
  type BoardRenderer,
  animate,
  createBoardRenderer,
  hexToPixel,
  makeTimeline,
  whenSpritesReady,
} from '@/render'
import { DEFAULTS, getSaveStore, loadRecord, saveRecord } from '@/platform'
import { getAudioEngine } from '@/audio'
import { CompletePanel } from './CompletePanel'
import { PoolToast } from './PoolToast'
import { TopBar } from './TopBar'

const DEFAULT_PARAMS: BoardParams = {
  seed: 'TIDE-0001',
  size: 'Small',
  difficulty: 'Calm',
  clues: { connectivity: true, lineTotals: true },
}

interface Settings {
  swap: boolean
  reducedMotion: boolean
  colorblind: boolean
  hover: boolean
  nudge: boolean
}

export interface GameplayScreenProps {
  params?: BoardParams
  /** When false, always start a fresh board from `params` (Home's Play). When
   *  true (default), restore the saved in-progress board on mount. */
  resume?: boolean
  onHome?: () => void
  onJournal?: () => void
  /** Open the shell Pause overlay (003 seam); falls back to onHome. */
  onPause?: () => void
  /** Fires when the board is solved, with the earned (largest-pool) creature id
   *  — the shell records curated completion (004 seam). */
  onSolved?: (earnedCreatureId: string | null) => void
  /** Provide the next board's params (feature 004 seam); defaults to a new seed. */
  nextParams?: (current: BoardParams) => BoardParams
}

export function GameplayScreen({
  params,
  resume = true,
  onHome,
  onJournal,
  onPause,
  onSolved,
  nextParams,
}: GameplayScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<BoardRenderer | null>(null)
  const sessionRef = useRef<PlaySession | null>(null)
  const storeRef = useRef(getSaveStore())
  const audioRef = useRef(getAudioEngine())
  const hoveredRef = useRef<string | null>(null)
  const highlightRef = useRef<Set<string>>(new Set())
  /** Line-label ids the player has toggled a row guide on. View-only, not saved. */
  const guidesRef = useRef<Set<string>>(new Set())
  /** Line-label ids struck off as satisfied (right-click). View-only, not saved. */
  const doneLinesRef = useRef<Set<string>>(new Set())
  const settingsRef = useRef<Settings>({
    swap: false,
    reducedMotion: false,
    colorblind: false,
    hover: true,
    nudge: false,
  })
  const nextSeedRef = useRef(1)

  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState('')
  const [waterLeft, setWaterLeft] = useState(0)
  const [stonesLeft, setStonesLeft] = useState(0)
  const [poolsLeft, setPoolsLeft] = useState(0)
  const [errorsMade, setErrorsMade] = useState(0)
  const [complete, setComplete] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [mistakeCount, setMistakeCount] = useState(0)
  const [ripple, setRipple] = useState<{ x: number; y: number; k: number } | null>(null)

  const redraw = useCallback(() => {
    const r = rendererRef.current
    const s = sessionRef.current
    if (!r || !s) return
    r.draw({
      markOf: (k) => s.markAt(k),
      hovered: hoveredRef.current,
      highlighted: highlightRef.current,
      revealed: s.revealed,
      mistakes: s.mistakeCells(),
      pools: s.pools,
      colorblind: settingsRef.current.colorblind,
      guides: guidesRef.current,
      doneLines: doneLinesRef.current,
    })
  }, [])

  const syncChrome = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    setWaterLeft(s.waterRemaining)
    setStonesLeft(s.stonesRemaining)
    setPoolsLeft(s.poolsRemaining)
    setErrorsMade(s.errorsMade)
    setMistakeCount(s.mistakeCells().size)
    setCanUndo(s.canUndo())
    setCanRedo(s.canRedo())
    setComplete(s.isComplete)
  }, [])

  /** Dev-only: expose the in-flight persist so e2e can await a real commit. */
  const trackSave = useCallback((p: Promise<void>) => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const hook = (window as unknown as { __TIDEPOOLS__?: { lastSave?: Promise<void> } }).__TIDEPOOLS__
      if (hook) hook.lastSave = p
    }
    void p
  }, [])

  const save = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    // (the write resolves after IndexedDB commits)
    trackSave(saveRecord(storeRef.current, 'inProgressBoard', s.serialize()))
  }, [trackSave])

  /**
   * Drop the resume record. A finished board must never be offered as
   * "continue" — an empty seed is how the shell reads "nothing in progress".
   */
  const clearSaved = useCallback(() => {
    trackSave(saveRecord(storeRef.current, 'inProgressBoard', DEFAULTS.inProgressBoard()))
  }, [trackSave])

  const applyDelta = useCallback(
    (delta: MarkDelta) => {
      if (delta.revealed.length > 0) {
        const s = sessionRef.current
        const pool = s?.pools.find((p) => p.id === delta.revealed[0])
        const name = pool ? creatureDef(pool.creatureId)?.name : undefined
        if (name) {
          setToast(`${name} joins your journal`)
          window.setTimeout(() => setToast(null), 2200)
        }
        animate(makeTimeline(500, settingsRef.current.reducedMotion), () => redraw())
      }
      redraw()
      syncChrome()
      // A solved board is not something to resume — clear it rather than saving
      // it, so Home offers no "continue" for a board that is already done (and
      // reopening the app can't land back on the completion panel).
      if (delta.complete) clearSaved()
      else save()
      if (delta.complete) {
        // The "prize" creature = the largest pool's creature (the curated seam).
        const s = sessionRef.current
        let largest: { cells: string[]; creatureId: string } | null = null
        if (s) for (const p of s.pools) if (!largest || p.cells.length > largest.cells.length) largest = p
        onSolved?.(largest ? largest.creatureId : null)
      }
    },
    [redraw, syncChrome, save, clearSaved, onSolved],
  )

  // Record discoveries + lifetime stats to the journal (005). Forward marks only
  // (not undo/redo, which would inflate counts on churn): a newly revealed pool
  // records its creature (first-found seed + count) and a completed board bumps
  // boards-solved. Persisted via the 008 seam; folded into the dev hook's
  // `lastSave` so e2e can await a real commit before reload.
  const recordProgress = useCallback((delta: MarkDelta) => {
    const s = sessionRef.current
    if (!s || (delta.revealed.length === 0 && !delta.complete)) return
    // Reward feedback: the solved-board swell takes precedence over a pool chime.
    if (delta.complete) audioRef.current.play('boardComplete')
    else if (delta.revealed.length > 0) audioRef.current.play('poolComplete')
    const seed = s.board.params.seed
    const p = (async () => {
      for (const id of delta.revealed) {
        const pool = s.pools.find((pp) => pp.id === id)
        if (pool) await recordDiscovery(storeRef.current, pool.creatureId, seed)
      }
      if (delta.complete) await recordBoardSolved(storeRef.current)
    })()
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const hook = (window as unknown as { __TIDEPOOLS__?: { lastSave?: Promise<void> } }).__TIDEPOOLS__
      if (hook) {
        hook.lastSave = Promise.all([hook.lastSave ?? Promise.resolve(), p]).then(() => undefined)
      }
    }
    void p
  }, [])

  const mark = useCallback(
    (cellKey: string, kind: MarkKind, px: number, py: number) => {
      const s = sessionRef.current
      if (!s) return
      const delta = s.applyMark(cellKey, kind)
      if (!delta.changed) return
      // Material feedback: the placed mark's sound, or a soft "oops" if it's
      // against the solution (clearing a cell — correct === null — is silent).
      if (delta.correct === true) audioRef.current.play(kind === 'water' ? 'water' : 'rock')
      else if (delta.correct === false) audioRef.current.play('mistake')
      // Gentle nudge on a wrong mark (a faint ripple of doubt) — the persistent
      // coral tint in the renderer keeps it flagged until corrected.
      if (delta.correct === false && !settingsRef.current.reducedMotion) {
        setRipple({ x: px, y: py, k: Date.now() })
        window.setTimeout(() => setRipple(null), 550)
      }
      applyDelta(delta)
      recordProgress(delta)
    },
    [applyDelta, recordProgress],
  )

  const onPointerDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // First user gesture unlocks the audio context (browser autoplay policy).
      audioRef.current.unlock()
      const r = rendererRef.current
      const canvas = canvasRef.current
      if (!r || !canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const cellKey = r.cellAt(x, y)
      if (!cellKey) {
        // Off the board: a line total is never a board mark — left-click toggles
        // that row's reading guide, right-click strikes the total off as
        // satisfied. Both ignore the swap-buttons setting, which is about marks.
        // Cells are tested first so a label's touch target can never steal a
        // mark from the edge hex it sits against.
        const label = r.lineLabelAt(x, y)
        if (!label) return
        const set = e.button === 0 ? guidesRef.current : doneLinesRef.current
        if (set.has(label.id)) set.delete(label.id)
        else set.add(label.id)
        redraw()
        return
      }
      const swap = settingsRef.current.swap
      const kind: MarkKind =
        e.button === 0 ? (swap ? 'rock' : 'water') : swap ? 'water' : 'rock'
      const c = hexToPixel(r.layout, parseKey(cellKey))
      mark(cellKey, kind, c.x, c.y)
    },
    [mark, redraw],
  )

  const onPointerMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const r = rendererRef.current
      const s = sessionRef.current
      const canvas = canvasRef.current
      if (!r || !s || !canvas) return
      const rect = canvas.getBoundingClientRect()
      const cellKey = r.cellAt(e.clientX - rect.left, e.clientY - rect.top)
      if (cellKey === hoveredRef.current) return
      hoveredRef.current = cellKey
      highlightRef.current =
        settingsRef.current.hover && cellKey ? new Set(cellInforms(s.board, cellKey)) : new Set()
      redraw()
    },
    [redraw],
  )

  const startBoard = useCallback(
    async (p: BoardParams, resume: boolean) => {
      setLoading(true)
      let board: Board
      let session: PlaySession
      if (resume) {
        const saved = await loadRecord(storeRef.current, 'inProgressBoard')
        if (saved.request.seed) {
          board = await loadBoard(saved.request)
          session = PlaySession.restore(board, saved)
        } else {
          board = await loadBoard(p)
          session = new PlaySession(board)
        }
      } else {
        board = await loadBoard(p)
        session = new PlaySession(board)
      }
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      sessionRef.current = session
      let renderer: BoardRenderer
      try {
        renderer = createBoardRenderer(canvas, board)
      } catch {
        // No 2D context (e.g. jsdom / very old browsers) — chrome still works.
        setLabel(`${board.params.seed} · ${board.params.size} · ${board.params.difficulty}`)
        syncChrome()
        setLoading(false)
        return
      }
      renderer.resize(container.clientWidth || 800, container.clientHeight || 600)
      rendererRef.current = renderer

      // Dev-only test hook (stripped from production builds): lets the e2e drive
      // the board through real pointer clicks by exposing cell centres + the
      // solution for this fixed-seed board.
      if (import.meta.env.DEV && typeof window !== 'undefined') {
        const centres: Record<string, { x: number; y: number }> = {}
        const solution: Record<string, MarkKind> = {}
        for (const [k, cell] of board.cells) {
          centres[k] = hexToPixel(renderer.layout, cell.coord)
          if (!cell.given) solution[k] = cell.state
        }
        ;(window as unknown as { __TIDEPOOLS__?: unknown }).__TIDEPOOLS__ = {
          ready: true,
          seed: board.params.seed,
          lastSave: Promise.resolve(),
          centres,
          solution,
          lineLabels: renderer.lineLabels.map((l) => ({ id: l.id, x: l.x, y: l.y, total: l.total })),
          guides: () => [...guidesRef.current].sort(),
          doneLines: () => [...doneLinesRef.current].sort(),
          progress: () => {
            let correct = 0
            let total = 0
            for (const [k, cell] of board.cells) {
              if (cell.given) continue
              total++
              if (session.markAt(k) === cell.state) correct++
            }
            return { complete: session.isComplete, correct, total }
          },
        }
      }

      setLabel(`${board.params.seed} · ${board.params.size} · ${board.params.difficulty}`)
      hoveredRef.current = null
      highlightRef.current = new Set()
      guidesRef.current = new Set()
      doneLinesRef.current = new Set()
      setComplete(false)
      syncChrome()
      redraw()
      setLoading(false)
      // Sprites (waves/boulder) may still be decoding on first paint — redraw
      // once they're ready so the motifs appear without needing a click.
      void whenSpritesReady().then(() => redraw())
      if (!resume) save()
    },
    [redraw, syncChrome, save],
  )

  const onNext = useCallback(() => {
    const current = sessionRef.current?.board.params ?? params ?? DEFAULT_PARAMS
    nextSeedRef.current += 1
    const p =
      nextParams?.(current) ??
      ({ ...current, seed: `TIDE-${String(nextSeedRef.current).padStart(4, '0')}` } as BoardParams)
    void startBoard(p, false)
  }, [params, nextParams, startBoard])

  // Mount: load settings, then the board (resume in-progress if present).
  useEffect(() => {
    let disposed = false
    void (async () => {
      const s = await loadRecord(storeRef.current, 'settings')
      settingsRef.current = {
        swap: s.controls.swapMarkButtons,
        reducedMotion: s.visuals.reducedMotion,
        colorblind: s.visuals.colorblind,
        hover: true,
        nudge: false,
      }
      audioRef.current.setMuted(s.sound.muted)
      audioRef.current.setVolume(s.sound.volume)
      if (!disposed) await startBoard(params ?? DEFAULT_PARAMS, resume)
    })()
    return () => {
      disposed = true
    }
    // Mount-only: subsequent board changes go through onNext/startBoard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the canvas sized to its container.
  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const r = rendererRef.current
      if (!r) return
      r.resize(container.clientWidth, container.clientHeight)
      redraw()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [redraw])

  // Undo / redo keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        const s = sessionRef.current
        if (!s) return
        if (e.shiftKey ? s.canRedo() : s.canUndo()) audioRef.current.play(e.shiftKey ? 'redo' : 'undo')
        applyDelta(e.shiftKey ? s.redo() : s.undo())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [applyDelta])

  const doUndo = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    if (s.canUndo()) audioRef.current.play('undo')
    applyDelta(s.undo())
  }, [applyDelta])
  const doRedo = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    if (s.canRedo()) audioRef.current.play('redo')
    applyDelta(s.redo())
  }, [applyDelta])

  return (
    <div className="flex flex-col h-full w-full bg-sand">
      <TopBar
        label={label}
        waterRemaining={waterLeft}
        stonesRemaining={stonesLeft}
        poolsRemaining={poolsLeft}
        errorsMade={errorsMade}
        mistakeCount={mistakeCount}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={doUndo}
        onRedo={doRedo}
        onPause={onPause ?? (() => onHome?.())}
      />
      <div ref={containerRef} className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none"
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onContextMenu={(e) => e.preventDefault()}
        />
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-tide font-display">
            Filling the pool…
          </div>
        )}
        {ripple && (
          <span
            key={ripple.k}
            className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-coral/40 animate-ping pointer-events-none"
            style={{ left: ripple.x, top: ripple.y }}
          />
        )}
        <PoolToast message={toast} />
        {complete && (
          <CompletePanel
            onNext={onNext}
            onJournal={() => onJournal?.()}
            onHome={() => onHome?.()}
          />
        )}
      </div>
    </div>
  )
}
