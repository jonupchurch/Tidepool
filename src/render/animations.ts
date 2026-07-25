// animations.ts — reduced-motion-aware animation primitives + the pool-complete
// and mis-mark-nudge effects. The pure `makeTimeline` is the tested core:
// reduced motion collapses every animation to instant, honoring FR-012.
export interface Timeline {
  /** effective duration in ms (0 under reduced motion) */
  duration: number
  /** eased progress 0→1 for an elapsed time */
  progress(elapsedMs: number): number
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

/** A timeline that collapses to instant (progress always 1) under reduced motion. */
export function makeTimeline(durationMs: number, reducedMotion: boolean): Timeline {
  const duration = reducedMotion ? 0 : Math.max(0, durationMs)
  return {
    duration,
    progress(elapsedMs: number): number {
      if (duration <= 0) return 1
      return easeOutCubic(Math.min(1, Math.max(0, elapsedMs / duration)))
    },
  }
}

export type FrameFn = (progress: number) => void

/**
 * Drive `onFrame` from 0→1 over a timeline using requestAnimationFrame, calling
 * `onDone` at the end. Under reduced motion it fires a single final frame. Falls
 * back to an immediate final frame where rAF/clock are unavailable (tests/SSR).
 */
export function animate(timeline: Timeline, onFrame: FrameFn, onDone?: () => void): void {
  if (
    timeline.duration <= 0 ||
    typeof requestAnimationFrame === 'undefined' ||
    typeof performance === 'undefined'
  ) {
    onFrame(1)
    onDone?.()
    return
  }
  const start = performance.now()
  const step = (now: number): void => {
    const p = timeline.progress(now - start)
    onFrame(p)
    if (p < 1) requestAnimationFrame(step)
    else onDone?.()
  }
  requestAnimationFrame(step)
}
