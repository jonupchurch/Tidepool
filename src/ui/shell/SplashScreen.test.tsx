import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SplashScreen } from './SplashScreen'
import { SPLASH_TIPS } from './tips'
import { renderShell } from './test-helpers'

describe('SplashScreen (US3)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the wordmark, crab, a themed loader, and a rotating tip', () => {
    renderShell(<SplashScreen onDone={vi.fn()} minDurationMs={1000} />)
    expect(screen.getByRole('heading', { name: /tidepools/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /crab/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    // The first tip is shown.
    expect(screen.getByText(SPLASH_TIPS[0])).toBeInTheDocument()
  })

  it('rotates the tip over time', () => {
    renderShell(<SplashScreen onDone={vi.fn()} minDurationMs={100000} />)
    expect(screen.getByText(SPLASH_TIPS[0])).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(4500)
    })
    expect(screen.getByText(SPLASH_TIPS[1])).toBeInTheDocument()
  })

  it('dismisses (onDone) once its minimum beat elapses and the target is ready', () => {
    const onDone = vi.fn()
    renderShell(<SplashScreen onDone={onDone} ready minDurationMs={800} />)
    expect(onDone).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('waits for ready before dismissing', () => {
    const onDone = vi.fn()
    const { rerender } = renderShell(<SplashScreen onDone={onDone} ready={false} minDurationMs={0} />)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onDone).not.toHaveBeenCalled()
    rerender(<SplashScreen onDone={onDone} ready minDurationMs={0} />)
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('minimizes animation under prefers-reduced-motion (FR-009)', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    renderShell(<SplashScreen onDone={vi.fn()} minDurationMs={1000} />)
    expect(screen.getByTestId('splash')).toHaveAttribute('data-motion', 'reduced')
  })
})
