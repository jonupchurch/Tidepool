// SplashScreen.tsx — the calm wordmark + crab + loader + rotating tip. US3.
export interface SplashScreenProps {
  /** Fires once the splash has shown its minimum beat and the target is ready. */
  onDone: () => void
  /** True when the screen behind the splash is ready to reveal. */
  ready?: boolean
  /** Minimum time the splash stays up (ms). Tests pass 0. */
  minDurationMs?: number
}

export function SplashScreen(_props: SplashScreenProps) {
  return null
}
