// CuratedScreen.tsx — the curated coastline: an ordered list of blessed boards,
// each showing name, difficulty, a copyable seed, and completion (with the
// earned creature peeking out when solved). Selecting a row hands its
// BoardRequest to Gameplay. Locked rows (US4 gating) are not selectable.
import { useState } from 'react'
import type { BoardRequest, CuratedRow } from '@/game/board-source'

export interface CuratedScreenProps {
  rows: CuratedRow[]
  onSelect: (request: BoardRequest, curatedId: string) => void
  onBack: () => void
}

export function CuratedScreen({ rows, onSelect, onBack }: CuratedScreenProps) {
  return (
    <div className="h-full w-full overflow-y-auto bg-sand text-ink">
      <div className="mx-auto flex max-w-md flex-col gap-3 px-6 py-10">
        <header className="mb-2 text-center">
          <h1 className="font-display text-4xl text-deep-pool">Curated shores</h1>
          <p className="mt-1 text-tide">A gentle coastline of hand-tuned pools.</p>
        </header>

        <ol className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.entry.id}>
              <CuratedRowCard row={row} onSelect={onSelect} />
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onBack}
          className="mx-auto mt-4 rounded-full bg-foam px-5 py-2 text-sm text-deep-pool hover:bg-driftwood"
        >
          Back to shore
        </button>
      </div>
    </div>
  )
}

const DIFF_STYLE: Record<string, string> = {
  Calm: 'bg-tide-fill text-deep-pool',
  Tricky: 'bg-sea-glass text-deep-pool',
  Deep: 'bg-deep-pool text-foam',
}

function CuratedRowCard({
  row,
  onSelect,
}: { row: CuratedRow; onSelect: (r: BoardRequest, id: string) => void }) {
  const { entry, solved, earnedCreature, locked } = row
  const [copied, setCopied] = useState(false)

  const copySeed = async () => {
    try {
      await navigator.clipboard?.writeText(entry.seed)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // clipboard unavailable — the seed text is still visible to copy manually
    }
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl bg-foam p-4 shadow-sm ${locked ? 'opacity-60' : ''}`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand font-display text-deep-pool">
        {entry.order}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-display text-deep-pool">{entry.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${DIFF_STYLE[entry.difficulty]}`}>
            {entry.difficulty}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-rock">
          <span>{entry.size}</span>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={copySeed}
            aria-label={`Copy seed ${entry.seed}`}
            className="rounded font-mono hover:text-deep-pool"
          >
            {entry.seed} {copied ? '✓' : '⧉'}
          </button>
        </div>
        {solved && earnedCreature && (
          <div className="mt-1 text-xs text-coral">✓ Solved · found {earnedCreature}</div>
        )}
      </div>

      {locked ? (
        <span className="shrink-0 text-xs text-rock">🔒 unlock soon</span>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(row.request, entry.id)}
          className="shrink-0 rounded-xl bg-tide px-4 py-2 font-display text-sm text-foam hover:bg-deep-pool"
        >
          {solved ? 'Replay' : 'Play'}
        </button>
      )}
    </div>
  )
}
