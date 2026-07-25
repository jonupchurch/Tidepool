// CompletePanel — the calm board-complete panel ("The tide's in.") with the
// Next board / Journal / Home actions (FR-006), plus a way back to the map
// when the board you just finished came from the curated coastline.
interface CompletePanelProps {
  onNext: () => void
  onJournal: () => void
  onHome: () => void
  /** Present only on a curated board — returns to the coastline map. */
  onCurated?: () => void
}

export function CompletePanel({ onNext, onJournal, onHome, onCurated }: CompletePanelProps) {
  return (
    <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
      <div className="pointer-events-auto mb-12 rounded-3xl bg-foam shadow-xl px-8 py-6 text-center">
        <h2 className="font-display text-2xl text-deep-pool mb-1">The tide's in.</h2>
        <p className="text-tide mb-5">Every pool is settled.</p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onNext}
            className="font-display bg-tide text-foam px-5 py-2 rounded-full hover:bg-deep-pool transition-colors"
          >
            Next board
          </button>
          {onCurated && (
            <button
              type="button"
              onClick={onCurated}
              className="text-deep-pool px-4 py-2 rounded-full hover:bg-driftwood"
            >
              Curated shores
            </button>
          )}
          <button
            type="button"
            onClick={onJournal}
            className="text-deep-pool px-4 py-2 rounded-full hover:bg-driftwood"
          >
            Journal
          </button>
          <button
            type="button"
            onClick={onHome}
            className="text-deep-pool px-4 py-2 rounded-full hover:bg-driftwood"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  )
}
