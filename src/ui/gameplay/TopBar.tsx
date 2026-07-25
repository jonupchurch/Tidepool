// TopBar — board label/seed, remaining pools + stones, a gentle mistake flag,
// pause + undo/redo (FR-009).
interface TopBarProps {
  label: string
  /** Water cells left to fill — in cells, so it reads in the same unit as stones. */
  waterRemaining: number
  stonesRemaining: number
  /** Whole pools left to complete — counted in pools, hence its own counter. */
  poolsRemaining: number
  /** Running tally of wrong marks placed this session. */
  errorsMade: number
  /** Cells currently marked against the solution — surfaced as a soft flag. */
  mistakeCount: number
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onPause: () => void
}

export function TopBar({
  label,
  waterRemaining,
  stonesRemaining,
  poolsRemaining,
  errorsMade,
  mistakeCount,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPause,
}: TopBarProps) {
  return (
    <header className="flex items-center gap-4 px-4 py-2 bg-foam/85 backdrop-blur border-b border-driftwood">
      <button
        type="button"
        onClick={onPause}
        aria-label="Menu"
        className="text-deep-pool text-xl leading-none px-2 py-1 rounded hover:bg-driftwood"
      >
        ☰
      </button>
      <div className="font-display text-deep-pool truncate">{label}</div>
      <div className="ml-auto flex items-center gap-3 text-sm tabular-nums" aria-live="polite">
        <span className="text-tide" title="Water cells left to fill">
          🌊 {waterRemaining} water left
        </span>
        <span className="text-rock" title="Stones left to place">
          🪨 {stonesRemaining} {stonesRemaining === 1 ? 'stone' : 'stones'} left
        </span>
        {/* Counted in whole pools, not cells — hence its own counter. */}
        <span className="text-tide" title="Whole pools left to complete">
          🐚 {poolsRemaining} {poolsRemaining === 1 ? 'pool' : 'pools'} left
        </span>
        {/* A running record, not a penalty: it never counts back down. */}
        <span
          className={errorsMade > 0 ? 'text-coral' : 'text-rock'}
          title="Wrong marks made so far this board"
        >
          ⚠ {errorsMade} {errorsMade === 1 ? 'error' : 'errors'}
        </span>
        {mistakeCount > 0 && (
          <span
            className="rounded-full bg-coral/15 px-2 py-0.5 text-coral"
            title="A tile is marked against the solution — take another look"
          >
            ⚠ {mistakeCount} to fix
          </span>
        )}
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          className="text-deep-pool text-lg px-2 py-1 rounded hover:bg-driftwood disabled:opacity-30"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          className="text-deep-pool text-lg px-2 py-1 rounded hover:bg-driftwood disabled:opacity-30"
        >
          ↷
        </button>
      </div>
    </header>
  )
}
