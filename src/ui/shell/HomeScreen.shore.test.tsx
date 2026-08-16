// HomeScreen.shore.test.tsx — the 016 controls on Home: the Shore picker and
// the Edge hints switch, and what Play does with them.
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HomeScreen, type HomeScreenProps } from './HomeScreen'
import { renderShell, sampleShellPrefs } from './test-helpers'
import type { LastPlay } from './types'

const HEXAGON = 'Open water'

function props(lastPlay: LastPlay, over: Partial<HomeScreenProps> = {}): HomeScreenProps {
  return {
    prefs: sampleShellPrefs,
    onPrefsChange: vi.fn(),
    volume: 0.8,
    onVolumeChange: vi.fn(),
    lastPlay,
    resume: null,
    stats: {
      boardsSolved: 0,
      creaturesFound: 0,
      totalCreatures: 6,
      featuredCreature: null,
      curatedSolved: 0,
      curatedTotal: 36,
    },
    onPlay: vi.fn(),
    onResume: vi.fn(),
    onNavigate: vi.fn(),
    ...over,
  }
}

const medium: LastPlay = { size: 'Medium', difficulty: 'Deep', shore: 'hex', edgeHints: false }
const small: LastPlay = { size: 'Small', difficulty: 'Calm', shore: 'hex', edgeHints: false }

describe('Home — the Shore picker', () => {
  it('offers every shore the size supports, plus Any', () => {
    renderShell(<HomeScreen {...props(medium)} />)
    for (const name of [HEXAGON, 'Any', 'Atoll', 'Crescent', 'Wedge', 'Shoal']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${name}$`) })).toBeEnabled()
    }
  })

  it('sends the chosen shore to Play', () => {
    const onPlay = vi.fn()
    renderShell(<HomeScreen {...props(medium, { onPlay })} />)
    fireEvent.click(screen.getByRole('button', { name: /^Atoll$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(onPlay.mock.calls[0][0]).toMatchObject({ shape: 'atoll' })
    // The *choice* rides alongside, so the shell can keep varying under `Any`.
    expect(onPlay.mock.calls[0][1]).toMatchObject({ shore: 'atoll' })
  })

  it('resolves Any to a real shore, and reports Any as the choice', () => {
    const onPlay = vi.fn()
    renderShell(<HomeScreen {...props(medium, { onPlay })} />)
    fireEvent.click(screen.getByRole('button', { name: /^Any$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(onPlay.mock.calls[0][1]).toMatchObject({ shore: 'Any' })
  })

  // Discoverability: Small is the default size. A control that disappeared here
  // would mean a new player never learns shores exist.
  it('stays visible but inert on Small, with the reason', () => {
    renderShell(<HomeScreen {...props(small)} />)
    expect(screen.getByRole('button', { name: new RegExp(`^${HEXAGON}$`) })).toBeDisabled()
    expect(screen.getByText(/Medium or Large/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Atoll$/ })).not.toBeInTheDocument()
  })

  it('a Small board asks for no shape at all', () => {
    const onPlay = vi.fn()
    renderShell(<HomeScreen {...props(small, { onPlay })} />)
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(onPlay.mock.calls[0][0]).not.toHaveProperty('shape')
  })

  /**
   * Switching to a size that can't carry the held shore must not forget it.
   * Coercion belongs at the generator's door, not in the picker's state — a
   * player nudging the size to compare should come back to their choice.
   */
  it('remembers the shore across a trip through Small', () => {
    const onPlay = vi.fn()
    renderShell(<HomeScreen {...props(medium, { onPlay })} />)
    fireEvent.click(screen.getByRole('button', { name: /^Wedge$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Small$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Medium$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(onPlay.mock.calls[0][0]).toMatchObject({ shape: 'wedge' })
  })
})

describe('Home — the Edge hints switch', () => {
  it('turns on lineConnectivity at Deep', () => {
    const onPlay = vi.fn()
    renderShell(<HomeScreen {...props(medium, { onPlay })} />)
    fireEvent.click(screen.getByRole('switch', { name: /edge hints/i }))
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(onPlay.mock.calls[0][0].clues).toMatchObject({ lineConnectivity: true })
  })

  it('is inert below Deep, with the reason', () => {
    const onPlay = vi.fn()
    const tricky: LastPlay = { ...medium, difficulty: 'Tricky', edgeHints: true }
    renderShell(<HomeScreen {...props(tricky, { onPlay })} />)
    const toggle = screen.getByRole('switch', { name: /edge hints/i })
    expect(toggle).toBeDisabled()
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/Deep tides only/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    // Even with the pref stored as on, a Tricky board is the board it always was.
    expect(onPlay.mock.calls[0][0].clues).not.toHaveProperty('lineConnectivity')
  })

  it('reflects the persisted state on load', () => {
    renderShell(<HomeScreen {...props({ ...medium, edgeHints: true })} />)
    expect(screen.getByRole('switch', { name: /edge hints/i })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
