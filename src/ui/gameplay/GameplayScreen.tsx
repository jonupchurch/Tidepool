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
} from '@/game'
import { type BoardRenderer, animate, createBoardRenderer, hexToPixel, makeTimeline } from '@/render'
import { getSaveStore, loadRecord, saveRecord } from '@/platform'
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
  const hoveredRef = useRef<string | null>(null)
  const highlightRef = useRef<Set<string>>(new Set())
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
  const [poolsFound, setPoolsFound] = useState(0)
  const [totalPools, setTotalPools] = useState(0)
  const [complete, setComplete] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
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
      pools: s.pools,
      colorblind: settingsRef.current.colorblind,
    })
  }, [])

  const syncChrome = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    setPoolsFound(s.revealed.size)
    setCanUndo(s.canUndo())
    setCanRedo(s.canRedo())
    setComplete(s.isComplete)
  }, [])

  const save = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    const p = saveRecord(storeRef.current, 'inProgressBoard', s.serialize())
    // Dev-only: expose the in-flight persist so e2e can await a real commit
    // before reloading (the write resolves after IndexedDB commits).
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const hook = (window as unknown as { __TIDEPOOLS__?: { lastSave?: Promise<void> } }).__TIDEPOOLS__
      if (hook) hook.lastSave = p
    }
    void p
  }, [])

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
      save()
      if (delta.complete) {
        // The "prize" creature = the largest pool's creature (the curated seam).
        const s = sessionRef.current
        let largest: { cells: string[]; creatureId: string } | null = null
        if (s) for (const p of s.pools) if (!largest || p.cells.length > largest.cells.length) largest = p
        onSolved?.(largest ? largest.creatureId : null)
      }
    },
    [redraw, syncChrome, save, onSolved],
  )

  const mark = useCallback(
    (cellKey: string, kind: MarkKind, px: number, py: number) => {
      const s = sessionRef.current
      if (!s) return
      const delta = s.applyMark(cellKey, kind)
      if (!delta.changed) return
      if (delta.correct === false && settingsRef.current.nudge && !settingsRef.current.reducedMotion) {
        setRipple({ x: px, y: py, k: Date.now() })
        window.setTimeout(() => setRipple(null), 550)
      }
      applyDelta(delta)
    },
    [applyDelta],
  )

  const onPointerDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const r = rendererRef.current
      const canvas = canvasRef.current
      if (!r || !canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const cellKey = r.cellAt(x, y)
      if (!cellKey) return
      const swap = settingsRef.current.swap
      const kind: MarkKind =
        e.button === 0 ? (swap ? 'rock' : 'water') : swap ? 'water' : 'rock'
      const c = hexToPixel(r.layout, parseKey(cellKey))
      mark(cellKey, kind, c.x, c.y)
    },
    [mark],
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
        setTotalPools(session.pools.length)
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
      setTotalPools(session.pools.length)
      hoveredRef.current = null
      highlightRef.current = new Set()
      setComplete(false)
      syncChrome()
      redraw()
      setLoading(false)
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
        applyDelta(e.shiftKey ? s.redo() : s.undo())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [applyDelta])

  const doUndo = useCallback(() => {
    const s = sessionRef.current
    if (s) applyDelta(s.undo())
  }, [applyDelta])
  const doRedo = useCallback(() => {
    const s = sessionRef.current
    if (s) applyDelta(s.redo())
  }, [applyDelta])

  return (
    <div className="flex flex-col h-full w-full bg-sand">
      <TopBar
        label={label}
        poolsFound={poolsFound}
        totalPools={totalPools}
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
