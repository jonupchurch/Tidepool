// ResumeCard.tsx — Home's "Continue your pool" affordance. A decorative pool
// motif (no live board thumbnail — keeps the shell free of the engine/renderer),
// the saved board's size/difficulty + seed + progress, and a resume action.
import type { ResumeSnapshot } from './types'

export interface ResumeCardProps {
  snapshot: ResumeSnapshot
  onResume: () => void
}

export function ResumeCard({ snapshot, onResume }: ResumeCardProps) {
  const { seed, size, difficulty, poolsFilled, marksPlaced } = snapshot
  return (
    <button
      type="button"
      onClick={onResume}
      aria-label={`Continue your pool — ${seed}, ${size} ${difficulty}`}
      className="flex w-full items-center gap-4 rounded-2xl bg-foam p-4 text-left shadow-sm transition-colors hover:bg-driftwood"
    >
      {/* Decorative mini-pool motif. */}
      <span
        aria-hidden="true"
        className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-tide-fill text-deep-pool"
      >
        <span className="font-display text-lg">{'{ }'}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-deep-pool">Continue your pool</span>
        <span className="block text-sm text-tide">
          {size} · {difficulty}
        </span>
        <span className="block text-xs text-rock">
          {poolsFilled} pools filled · {marksPlaced} marks · seed {seed}
        </span>
      </span>
      <span className="shrink-0 font-display text-sm text-coral">Resume →</span>
    </button>
  )
}
