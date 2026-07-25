import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { keyFor } from '@/platform'
import { AppShell } from './AppShell'
import { HomeScreen, type HomeScreenProps } from './HomeScreen'
import { makeFakeStore, renderShell, sampleLastPlay } from './test-helpers'

function props(over: Partial<HomeScreenProps> = {}): HomeScreenProps {
  return {
    prefs: { theme: 'Day', muted: false },
    onPrefsChange: vi.fn(),
    lastPlay: sampleLastPlay,
    resume: null,
    stats: { boardsSolved: 0, creaturesFound: 0, totalCreatures: 6, featuredCreature: null, curatedSolved: 0, curatedTotal: 36 },
    onPlay: vi.fn(),
    onResume: vi.fn(),
    onNavigate: vi.fn(),
    ...over,
  }
}

describe('Home toggles (US5)', () => {
  it('the mute toggle flips and reports state', () => {
    const onPrefsChange = vi.fn()
    renderShell(<HomeScreen {...props({ onPrefsChange })} />)
    fireEvent.click(screen.getByRole('button', { name: /mute/i }))
    expect(onPrefsChange).toHaveBeenCalledWith({ theme: 'Day', muted: true })
  })

  it('the Day/Night toggle flips to Night', () => {
    const onPrefsChange = vi.fn()
    renderShell(<HomeScreen {...props({ onPrefsChange })} />)
    fireEvent.click(screen.getByRole('button', { name: /night/i }))
    expect(onPrefsChange).toHaveBeenCalledWith({ theme: 'Night', muted: false })
  })

  it('reflects the current prefs as pressed', () => {
    renderShell(<HomeScreen {...props({ prefs: { theme: 'Night', muted: true } })} />)
    expect(screen.getByRole('button', { name: /night/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /mute/i })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('AppShell theme application (US5)', () => {
  it('toggling Night sets data-theme app-wide and persists it', async () => {
    const store = makeFakeStore()
    renderShell(<AppShell store={store} initialScreen="Home" />)
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'day'))

    fireEvent.click(screen.getByRole('button', { name: /night/i }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'night'))

    const saved = await store.get(keyFor('shellPrefs'))
    expect(saved).toMatchObject({ theme: 'Night' })
  })
})
