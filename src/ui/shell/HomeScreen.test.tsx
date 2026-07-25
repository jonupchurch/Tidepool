import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HomeScreen, type HomeScreenProps } from './HomeScreen'
import { renderShell, sampleLastPlay, sampleResumeSnapshot, sampleShellPrefs } from './test-helpers'

function props(over: Partial<HomeScreenProps> = {}): HomeScreenProps {
  return {
    prefs: sampleShellPrefs,
    onPrefsChange: vi.fn(),
    lastPlay: sampleLastPlay, // Medium / Tricky
    resume: null,
    stats: { boardsSolved: 0, creaturesFound: 0, totalCreatures: 6, featuredCreature: null, curatedSolved: 0, curatedTotal: 36 },
    onPlay: vi.fn(),
    onResume: vi.fn(),
    onNavigate: vi.fn(),
    ...over,
  }
}

describe('HomeScreen (US1)', () => {
  it('renders Play plus every secondary entry, all reachable', () => {
    renderShell(<HomeScreen {...props()} />)
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
    for (const label of [/curated/i, /journal/i, /how to play/i, /about/i]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    // Endless picker: size + difficulty options.
    for (const size of ['Small', 'Medium', 'Large']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${size}$`, 'i') })).toBeInTheDocument()
    }
    for (const diff of ['Calm', 'Tricky', 'Deep']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${diff}$`, 'i') })).toBeInTheDocument()
    }
    // Seed entry.
    expect(screen.getByRole('textbox', { name: /enter a seed/i })).toBeInTheDocument()
  })

  it('Play requests a board at the last-used size/difficulty', () => {
    const onPlay = vi.fn()
    renderShell(<HomeScreen {...props({ onPlay })} />)
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onPlay.mock.calls[0][0]).toMatchObject({ size: 'Medium', difficulty: 'Tricky' })
  })

  it('the Endless picker changes what Play requests', () => {
    const onPlay = vi.fn()
    renderShell(<HomeScreen {...props({ onPlay })} />)
    fireEvent.click(screen.getByRole('button', { name: /^Large$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Deep$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(onPlay.mock.calls[0][0]).toMatchObject({ size: 'Large', difficulty: 'Deep' })
  })

  it('selected size/difficulty are marked pressed', () => {
    renderShell(<HomeScreen {...props()} />)
    expect(screen.getByRole('button', { name: /^Medium$/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Tricky$/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Small$/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('secondary entries navigate to their screens', () => {
    const onNavigate = vi.fn()
    renderShell(<HomeScreen {...props({ onNavigate })} />)
    fireEvent.click(screen.getByRole('button', { name: /curated/i }))
    fireEvent.click(screen.getByRole('button', { name: /journal/i }))
    fireEvent.click(screen.getByRole('button', { name: /how to play/i }))
    fireEvent.click(screen.getByRole('button', { name: /about/i }))
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual(['Curated', 'Journal', 'Tutorial', 'About'])
  })

  it('seed entry jumps to that exact board', () => {
    const onPlay = vi.fn()
    renderShell(<HomeScreen {...props({ onPlay })} />)
    fireEvent.change(screen.getByRole('textbox', { name: /enter a seed/i }), {
      target: { value: 'KELP-2231' },
    })
    fireEvent.click(screen.getByRole('button', { name: /jump/i }))
    expect(onPlay.mock.calls[0][0]).toMatchObject({ seed: 'KELP-2231', size: 'Medium', difficulty: 'Tricky' })
  })

  it('the seed submit is disabled until a seed is typed', () => {
    renderShell(<HomeScreen {...props()} />)
    expect(screen.getByRole('button', { name: /jump/i })).toBeDisabled()
  })

  // T015 — cold start (SC-005): zero saved data still renders a warm Home.
  it('renders warm defaults with zero saved data (no crash, no empty void)', () => {
    const onPlay = vi.fn()
    renderShell(
      <HomeScreen
        {...props({
          lastPlay: { size: 'Small', difficulty: 'Calm' },
          resume: null,
          stats: { boardsSolved: 0, creaturesFound: 0, totalCreatures: 6, featuredCreature: null, curatedSolved: 0, curatedTotal: 36 },
          onPlay,
        })}
      />,
    )
    expect(screen.getByRole('heading', { name: /tidepool/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(onPlay.mock.calls[0][0]).toMatchObject({ size: 'Small', difficulty: 'Calm' })
  })
})

describe('HomeScreen resume + stats (US2)', () => {
  it('shows the resume card when a board is in progress, and activates it', () => {
    const onResume = vi.fn()
    renderShell(<HomeScreen {...props({ resume: sampleResumeSnapshot, onResume })} />)
    expect(screen.getByText(/continue your pool/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /continue your pool/i }))
    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it('omits the resume card when no board is in progress (not an empty shell)', () => {
    renderShell(<HomeScreen {...props({ resume: null })} />)
    expect(screen.queryByText(/continue your pool/i)).not.toBeInTheDocument()
  })

  it('renders light stats', () => {
    renderShell(
      <HomeScreen
        {...props({
          stats: { boardsSolved: 12, creaturesFound: 2, totalCreatures: 6, featuredCreature: 'Shore Crab', curatedSolved: 0, curatedTotal: 36 },
        })}
      />,
    )
    expect(screen.getByText(/12/)).toBeInTheDocument()
    expect(screen.getByText(/boards solved/i)).toBeInTheDocument()
    expect(screen.getByText(/of 6 creatures/i)).toBeInTheDocument()
    expect(screen.getByText(/newest find: shore crab/i)).toBeInTheDocument()
  })

  it('shows a warm zero-state when nothing has been found yet', () => {
    renderShell(<HomeScreen {...props()} />)
    expect(screen.getByText(/your shore awaits/i)).toBeInTheDocument()
  })
})
