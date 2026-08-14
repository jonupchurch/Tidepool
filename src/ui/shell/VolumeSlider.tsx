// VolumeSlider.tsx — the master volume control (015). Sets one level that the
// audio engine applies to its master gain, which both the sound-effect and music
// channels hang beneath — so this moves the two together and never mixes them.
//
// This is the app's first range input, so it sets the convention: a real
// `<input type="range">`, not a div with pointer handlers. Native buys keyboard
// operation, touch dragging and the slider ARIA contract outright, and the shell
// is already held to "every control is a real, named element" by `a11y.test.tsx`.
//
// `accent-color` alone was tried first and isn't enough: Chromium paints the
// unfilled track a fixed charcoal — rgb(59,59,59), sampled, not guessed —
// regardless of `color-scheme`, in both themes and under a dark OS. That reads
// as a hard dark bar across the daylight palette, so the appearance is stripped
// and the track rebuilt from the design tokens; see `.tp-range` in index.css.
import type { CSSProperties } from 'react'

export interface VolumeSliderProps {
  /** Current level, 0..1. */
  value: number
  /** Called with the new level as a number in 0..1. */
  onChange: (value: number) => void
  /** Whether master mute is on. Mute is an independent switch (FR-007), so this
   *  only changes how the control *presents*: a level set while muted is real
   *  but inaudible, and the control says so rather than looking live (FR-008). */
  muted?: boolean
  /** Accessible name. */
  label?: string
  className?: string
}

/**
 * Detent size. Fine enough to level a game by, coarse enough that dragging the
 * full track fires ~20 changes rather than one per pixel — each change persists
 * a settings record, so this is the difference between a handful of writes and
 * a hundred.
 */
const STEP = 0.05

export function VolumeSlider({
  value,
  onChange,
  muted = false,
  label = 'Volume',
  className = '',
}: VolumeSliderProps) {
  const percent = Math.round(value * 100)
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={STEP}
      value={value}
      onChange={(e) => onChange(Number(e.currentTarget.value))}
      aria-label={label}
      // A screen reader would otherwise announce "0.35". Percentages are the
      // unit players actually have a feel for.
      aria-valuetext={muted ? `${percent}%, muted` : `${percent}%`}
      // The filled portion is the one thing the stylesheet can't work out for
      // itself, so it comes across as a custom property; everything else about
      // `.tp-range` lives in index.css with the rest of the themed CSS.
      style={{ '--tp-range-pct': `${percent}%` } as CSSProperties}
      className={`tp-range h-6 transition-opacity ${muted ? 'opacity-40' : ''} ${className}`}
    />
  )
}
