import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { resolveSettings } from '@/game'
import { keyFor } from '@/platform'
import { AppShell } from './AppShell'
import { HomeScreen, type HomeScreenProps } from './HomeScreen'
import { makeFakeStore, renderShell, sampleLastPlay } from './test-helpers'

function props(over: Partial<HomeScreenProps> = {}): HomeScreenProps {
  return {
    prefs: { theme: 'Day', muted: false, music: true, effects: true },
    onPrefsChange: vi.fn(),
    volume: 0.8,
    onVolumeChange: vi.fn(),
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
    expect(onPrefsChange).toHaveBeenCalledWith({ theme: 'Day', muted: true, music: true, effects: true })
  })

  it('the Day/Night toggle flips to Night', () => {
    const onPrefsChange = vi.fn()
    renderShell(<HomeScreen {...props({ onPrefsChange })} />)
    fireEvent.click(screen.getByRole('button', { name: /night/i }))
    expect(onPrefsChange).toHaveBeenCalledWith({ theme: 'Night', muted: false, music: true, effects: true })
  })

  it('reflects the current prefs as pressed', () => {
    renderShell(<HomeScreen {...props({ prefs: { theme: 'Night', muted: true, music: true, effects: true } })} />)
    expect(screen.getByRole('button', { name: /night/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /mute/i })).toHaveAttribute('aria-pressed', 'true')
  })

  // 014: music is its own switch, so "quiet room, but I still want to hear my
  // marks land" is one press rather than an all-or-nothing mute.
  it('the music toggle flips independently of mute', () => {
    const onPrefsChange = vi.fn()
    renderShell(<HomeScreen {...props({ onPrefsChange })} />)
    fireEvent.click(screen.getByRole('button', { name: /turn music off/i }))
    expect(onPrefsChange).toHaveBeenCalledWith({ theme: 'Day', muted: false, music: false, effects: true })
  })

  it('the music toggle reports its own state, not the mute state', () => {
    renderShell(<HomeScreen {...props({ prefs: { theme: 'Day', muted: true, music: false, effects: true } })} />)
    const music = screen.getByRole('button', { name: /turn music on/i })
    expect(music).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /unmute/i })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('AppShell theme application (US5)', () => {
  it('toggling Night sets data-theme app-wide and persists it', async () => {
    const store = makeFakeStore()
    renderShell(<AppShell store={store} initialScreen="Home" />)
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'day'))

    fireEvent.click(screen.getByRole('button', { name: /night/i }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'night'))

    // Theme lives in `settings` now (006 owns it). It used to be written to
    // shellPrefs as well, which meant two copies that could disagree.
    await waitFor(async () =>
      expect(resolveSettings(await store.get(keyFor('settings'))).visuals.theme).toBe('Night'),
    )
  })
})

describe('hover text on the Home glyph row', () => {
  // Every control up there is a bare emoji, and the water drop in particular
  // does not announce itself — a player asked what it was. `title` is the
  // repo's existing answer for an unlabelled glyph (see TopBar's counters).
  //
  // Deliberately NOT the same string as `aria-label`. The label says what a
  // click will do, which is what a screen reader wants from a button; the
  // tooltip names the control and its state, which is what someone hovering
  // because they cannot read the icon wants. Asserting them separately is what
  // keeps a later "tidy-up" from collapsing the two.
  const titleOf = (name: RegExp): string | null =>
    screen.getByRole('button', { name }).getAttribute('title')

  it('names each control and its state', () => {
    renderShell(<HomeScreen {...props()} />)
    expect(titleOf(/^mute$/i)).toBe('All sound on')
    expect(titleOf(/turn music off/i)).toBe('Music on')
    expect(titleOf(/turn sound effects off/i)).toBe('Sound effects on')
    expect(titleOf(/night tide/i)).toBe('Day Tide')
  })

  it('follows the state when everything is off', () => {
    renderShell(
      <HomeScreen
        {...props({ prefs: { theme: 'Night', muted: true, music: false, effects: false } })}
      />,
    )
    expect(titleOf(/^unmute$/i)).toBe('All sound off')
    expect(titleOf(/turn music on/i)).toBe('Music off')
    expect(titleOf(/turn sound effects on/i)).toBe('Sound effects off')
    expect(titleOf(/night tide/i)).toBe('Night Tide')
  })

  it('matches the words Pause uses for the same two switches', () => {
    // Pause spells these out as text; Home is the only place they are icons
    // alone. One vocabulary, so a player who learns them in one place reads
    // them in the other.
    renderShell(<HomeScreen {...props()} />)
    expect(titleOf(/turn music off/i)).toBe('Music on')
    expect(titleOf(/turn sound effects off/i)).toBe('Sound effects on')
  })

  it('tells you the volume slider is muted, which is why dragging does nothing', () => {
    renderShell(<HomeScreen {...props({ prefs: { theme: 'Day', muted: true, music: true, effects: true } })} />)
    expect(screen.getByRole('slider', { name: /volume/i }).getAttribute('title')).toBe(
      'Volume — muted',
    )
  })
})
