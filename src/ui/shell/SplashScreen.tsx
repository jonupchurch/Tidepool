// SplashScreen.tsx — the calm first impression: wordmark + crab + a themed pool
// loader + a rotating flavor tip. No progress percentage; it's a tone-setter that
// dismisses as soon as its minimum beat has passed and the target is ready.
// Reduced-motion aware (FR-009).
import { useEffect, useState } from 'react'
import { SPLASH_TIPS } from './tips'
import { usePrefersReducedMotion } from './use-reduced-motion'

export interface SplashScreenProps {
  /** Fires once the splash has shown its minimum beat and the target is ready. */
  onDone: () => void
  /** True when the screen behind the splash is ready to reveal. */
  ready?: boolean
  /** Minimum time the splash stays up (ms). Tests pass 0. */
  minDurationMs?: number
}

const TIP_INTERVAL_MS = 4200

export function SplashScreen({ onDone, ready = true, minDurationMs = 1100 }: SplashScreenProps) {
  const reduced = usePrefersReducedMotion()
  const [tip, setTip] = useState(0)

  // Rotate the flavor tip; interval cleared on unmount.
  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % SPLASH_TIPS.length), TIP_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Dismiss once ready, after the minimum beat.
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(onDone, minDurationMs)
    return () => clearTimeout(t)
  }, [ready, minDurationMs, onDone])

  return (
    <div
      data-testid="splash"
      data-motion={reduced ? 'reduced' : 'full'}
      className="grid h-full w-full place-items-center bg-sand text-ink"
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <img src="/img/crab.png" alt="A friendly shore crab" className="h-24 w-24 object-contain" />
        <div>
          <h1 className="font-display text-5xl text-deep-pool">Tidepool</h1>
          <p className="mt-1 text-tide">A deduction game at low tide</p>
        </div>

        {/* Themed loader — pool ripples, no progress percentage. */}
        <div role="status" aria-label="Loading" className="relative h-6 w-6">
          <span
            className={`absolute inset-0 rounded-full bg-tide/40 ${reduced ? '' : 'animate-ping'}`}
          />
          <span className="absolute inset-1 rounded-full bg-tide" />
        </div>

        <p className="min-h-5 max-w-xs text-sm italic text-tide">{SPLASH_TIPS[tip]}</p>
        <p className="text-xs text-rock">Made with care, by the shore.</p>
      </div>
    </div>
  )
}
