// TopBar — board label/seed, pool progress, pause + undo/redo controls (FR-009).
interface TopBarProps {
  label: string
  poolsFound: number
  totalPools: number
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onPause: () => void
}

export function TopBar({
  label,
  poolsFound,
  totalPools,
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
      <div className="ml-auto text-sm text-tide tabular-nums" aria-live="polite">
        {poolsFound}/{totalPools} pools
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
