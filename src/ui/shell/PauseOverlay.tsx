// PauseOverlay.tsx — the soft Pause scrim over a frozen board. "Pausing is just
// stepping away": a calm dialog with Resume, New board, Restart, Home
// and a reassurance line. The scrim covers the canvas, freezing input. Fade is
// gated by prefers-reduced-motion (Tailwind motion-reduce variant).
import { useEffect, useState } from 'react'
import { VolumeSlider } from './VolumeSlider'

export interface PauseOverlayProps {
  onResume: () => void
  onNewBoard: () => void
  onRestart: () => void
  onHome: () => void
  /** Ambient bed on/off. Absent = the control is hidden (older callers/tests). */
  music?: boolean
  onMusicChange?: (music: boolean) => void
  /** The effects switch (017). Absent = hidden, same contract as `music`. */
  effects?: boolean
  onEffectsChange?: (effects: boolean) => void
  /** Master level, 0..1. Absent = hidden, same contract as `music` above (015). */
  volume?: number
  onVolumeChange?: (volume: number) => void
  /** Master mute, for presentation only — the slider dims and says "muted"
   *  rather than looking live. Pause has no mute switch of its own. */
  muted?: boolean
}

type ActionKey = 'onResume' | 'onNewBoard' | 'onRestart' | 'onHome'

const ACTIONS: readonly { label: string; key: ActionKey; primary?: boolean }[] = [
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
        {/* Needing quiet is usually urgent — making someone leave a board to get
            it is a poor answer, so the music switch is reachable from here too
            (014 US3). Same setting as Home's; changing it applies at once. The
            volume slider is here for exactly the same reason (015 US2). */}
        {props.onMusicChange && (
          <button
            type="button"
            aria-pressed={props.music}
            onClick={() => props.onMusicChange?.(!props.music)}
            className="mt-4 w-full rounded-xl px-4 py-2 text-sm text-tide hover:bg-sand"
          >
            {props.music ? 'Music on' : 'Music off'}
          </button>
        )}
        {/* The effects switch sits beside the music one for the same reason it
            exists at all: the two channels are independently silenceable, and
            the moment you want that is usually mid-board (017). */}
        {props.onEffectsChange && (
          <button
            type="button"
            aria-pressed={props.effects}
            onClick={() => props.onEffectsChange?.(!props.effects)}
            className="mt-1 w-full rounded-xl px-4 py-2 text-sm text-tide hover:bg-sand"
          >
            {props.effects ? 'Sound effects on' : 'Sound effects off'}
          </button>
        )}
        {props.onVolumeChange && (
          <div className="mt-2 flex items-center gap-3 px-4">
            <span aria-hidden className="text-sm text-tide">
              Volume
            </span>
            <VolumeSlider
              value={props.volume ?? 0}
              onChange={props.onVolumeChange}
              muted={props.muted}
              className="min-w-0 flex-1"
            />
          </div>
        )}
      </div>
    </div>
  )
}
