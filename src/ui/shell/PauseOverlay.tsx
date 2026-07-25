// PauseOverlay.tsx — the soft Pause scrim over a frozen board. "Pausing is just
// stepping away": a calm dialog with Resume, New board, Restart, Home
// and a reassurance line. The scrim covers the canvas, freezing input. Fade is
// gated by prefers-reduced-motion (Tailwind motion-reduce variant).
import { useEffect, useState } from 'react'

export interface PauseOverlayProps {
  onResume: () => void
  onNewBoard: () => void
  onRestart: () => void
  onHome: () => void
}

const ACTIONS: readonly { label: string; key: keyof PauseOverlayProps; primary?: boolean }[] = [
  { label: 'Resume', key: 'onResume', primary: true },
  { label: 'New board', key: 'onNewBoard' },
  { label: 'Restart this board', key: 'onRestart' },
  { label: 'Home', key: 'onHome' },
]

export function PauseOverlay(props: PauseOverlayProps) {
  const [shown, setShown] = useState(false)
  useEffect(() => setShown(true), [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paused"
      className={`absolute inset-0 z-20 grid place-items-center bg-deep-pool/40 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
        shown ? 'opacity-100' : 'opacity-0'
      } motion-reduce:opacity-100`}
    >
      <div className="w-full max-w-xs rounded-2xl bg-foam p-6 text-center shadow-lg">
        <h2 className="font-display text-2xl text-deep-pool">Paused</h2>
        <p className="mt-1 mb-5 text-sm text-tide">Your board is saved. Step away anytime.</p>
        <div className="flex flex-col gap-2">
          {ACTIONS.map(({ label, key, primary }) => (
            <button
              key={key}
              type="button"
              onClick={props[key]}
              className={
                primary
                  ? 'rounded-xl bg-tide px-4 py-3 font-display text-foam hover:bg-deep-pool'
                  : 'rounded-xl bg-sand px-4 py-2 text-deep-pool hover:bg-driftwood'
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
