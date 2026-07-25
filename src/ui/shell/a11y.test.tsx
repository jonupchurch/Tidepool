// a11y.test.tsx — accessibility + reduced-motion sweep across the shell surfaces:
// every Home entry is a keyboard-reachable control with a name, Pause is a modal
// with an ordered action list, and Splash honors prefers-reduced-motion (FR-009).
import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeScreen, type HomeScreenProps } from './HomeScreen'
import { PauseOverlay, type PauseOverlayProps } from './PauseOverlay'
import { SplashScreen } from './SplashScreen'
import { renderShell, sampleLastPlay, sampleShellPrefs } from './test-helpers'

const homeProps = (over: Partial<HomeScreenProps> = {}): HomeScreenProps => ({
  prefs: sampleShellPrefs,
  onPrefsChange: vi.fn(),
  lastPlay: sampleLastPlay,
  resume: null,
  stats: { boardsSolved: 0, creaturesFound: 0, totalCreatures: 6, featuredCreature: null, curatedSolved: 0, curatedTotal: 36 },
  onPlay: vi.fn(),
  onResume: vi.fn(),
  onNavigate: vi.fn(),
  ...over,
})

const pauseProps = (): PauseOverlayProps => ({
  onResume: vi.fn(),
  onNewBoard: vi.fn(),
  onRestart: vi.fn(),
  onSettings: vi.fn(),
  onHome: vi.fn(),
})

afterEach(() => vi.restoreAllMocks())

describe('shell accessibility', () => {
  it('every Home control is a keyboard-reachable element with an accessible name', () => {
    renderShell(<HomeScreen {...homeProps()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(8) // play, 4 secondary, 2 toggles, seed
    // Every control is a real, named button (no div-onClick focus traps).
    for (const b of buttons) {
      expect((b.getAttribute('aria-label') ?? b.textContent ?? '').trim().length).toBeGreaterThan(0)
    }
    // The primary Play action is reachable and enabled.
    expect(screen.getByRole('button', { name: /^play$/i })).toBeEnabled()
    // The seed field is labeled.
    expect(screen.getByRole('textbox', { name: /enter a seed/i })).toBeInTheDocument()
  })

  it('Pause is a modal dialog whose actions are in a sensible focus order', () => {
    renderShell(<PauseOverlay {...pauseProps()} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    const labels = screen.getAllByRole('button').map((b) => b.textContent)
    expect(labels).toEqual(['Resume', 'New board', 'Restart this board', 'Settings', 'Home'])
  })

  it('Splash honors prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    renderShell(<SplashScreen onDone={vi.fn()} minDurationMs={999999} />)
    expect(screen.getByTestId('splash')).toHaveAttribute('data-motion', 'reduced')
  })
})
