// volume.test.tsx — the master volume control where it is actually wired (015).
// The slider's own behaviour lives in `VolumeSlider.test.tsx`; this covers the
// two surfaces that host it, and the one thing a wiring bug would break without
// any of those tests noticing: that dragging it writes `sound.volume` and
// nothing else.
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, resetSettingsStore, resolveSettings } from '@/game'
import { keyFor } from '@/platform'
import { AppShell } from './AppShell'
import { HomeScreen, type HomeScreenProps } from './HomeScreen'
import { PauseOverlay, type PauseOverlayProps } from './PauseOverlay'
import { makeFakeStore, renderShell, sampleLastPlay } from './test-helpers'

function homeProps(over: Partial<HomeScreenProps> = {}): HomeScreenProps {
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

function pauseProps(over: Partial<PauseOverlayProps> = {}): PauseOverlayProps {
  return {
    onResume: vi.fn(),
    onNewBoard: vi.fn(),
    onRestart: vi.fn(),
    onHome: vi.fn(),
    ...over,
  }
}

describe('the volume control on Home', () => {
  it('shows the current level and reports changes', () => {
    const onVolumeChange = vi.fn()
    renderShell(<HomeScreen {...homeProps({ volume: 0.4, onVolumeChange })} />)
    const slider = screen.getByRole('slider', { name: /volume/i })
    expect(slider).toHaveValue('0.4')
    fireEvent.change(slider, { target: { value: '0.7' } })
    expect(onVolumeChange).toHaveBeenCalledWith(0.7)
  })

  it('does not disturb the switches beside it', () => {
    const onPrefsChange = vi.fn()
    renderShell(<HomeScreen {...homeProps({ onPrefsChange })} />)
    fireEvent.change(screen.getByRole('slider', { name: /volume/i }), { target: { value: '0.3' } })
    // The toggles and the level are separate settings; moving one must not
    // rewrite the others (FR-010).
    expect(onPrefsChange).not.toHaveBeenCalled()
  })

  it('reflects mute without being disabled by it', () => {
    renderShell(<HomeScreen {...homeProps({ prefs: { theme: 'Day', muted: true, music: true, effects: true }, volume: 0.5 })} />)
    const slider = screen.getByRole('slider', { name: /volume/i })
    expect(slider).toHaveAttribute('aria-valuetext', '50%, muted')
    expect(slider).toBeEnabled()
  })
})

describe('the volume control on Pause', () => {
  it('is absent when no handler is supplied', () => {
    renderShell(<PauseOverlay {...pauseProps()} />)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  it('shows the current level and reports changes', () => {
    const onVolumeChange = vi.fn()
    renderShell(<PauseOverlay {...pauseProps({ volume: 0.6, onVolumeChange })} />)
    const slider = screen.getByRole('slider', { name: /volume/i })
    expect(slider).toHaveValue('0.6')
    fireEvent.change(slider, { target: { value: '0.15' } })
    expect(onVolumeChange).toHaveBeenCalledWith(0.15)
  })

  it('leaves the four actions exactly as they were', () => {
    // The action list is asserted verbatim in a11y.test.tsx; adding a control
    // below it must not join that list or reorder it.
    renderShell(<PauseOverlay {...pauseProps({ volume: 0.5, onVolumeChange: vi.fn() })} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Resume',
      'New board',
      'Restart this board',
      'Home',
    ])
  })
})

describe('volume end to end through the shell', () => {
  it('persists the level to settings, and only the level', async () => {
    const store = makeFakeStore()
    renderShell(<AppShell store={store} initialScreen="Home" />)
    await waitFor(() => expect(screen.getByRole('slider', { name: /volume/i })).toBeInTheDocument())

    fireEvent.change(screen.getByRole('slider', { name: /volume/i }), { target: { value: '0.35' } })

    await waitFor(async () => {
      const saved = resolveSettings(await store.get(keyFor('settings')))
      expect(saved.sound.volume).toBeCloseTo(0.35, 6)
    })

    const saved = resolveSettings(await store.get(keyFor('settings')))
    // Everything else in the sound group is untouched — in particular the two
    // channel levels, because the master scales them rather than mixing them.
    expect(saved.sound.muted).toBe(DEFAULT_SETTINGS.sound.muted)
    expect(saved.sound.music).toBe(DEFAULT_SETTINGS.sound.music)
    expect(saved.sound.sfx).toBe(DEFAULT_SETTINGS.sound.sfx)
    expect(saved.sound.ambient).toBe(DEFAULT_SETTINGS.sound.ambient)
    expect(saved.visuals.theme).toBe(DEFAULT_SETTINGS.visuals.theme)
  })

  it('survives a restart', async () => {
    const store = makeFakeStore()
    const first = renderShell(<AppShell store={store} initialScreen="Home" />)
    await waitFor(() => expect(screen.getByRole('slider', { name: /volume/i })).toBeInTheDocument())
    fireEvent.change(screen.getByRole('slider', { name: /volume/i }), { target: { value: '0.2' } })
    await waitFor(async () =>
      expect(resolveSettings(await store.get(keyFor('settings'))).sound.volume).toBeCloseTo(0.2, 6),
    )
    first.unmount()

    // The settings store is a module singleton and outlives the unmount, so
    // without this the second render would simply still be holding 0.2 in
    // memory and the assertion below would prove nothing. Dropping it back to
    // first-run defaults is what makes this a real cold boot: the only way the
    // level can come back is by being read off the store.
    resetSettingsStore()
    expect(DEFAULT_SETTINGS.sound.volume).not.toBeCloseTo(0.2, 6)

    renderShell(<AppShell store={store} initialScreen="Home" />)
    await waitFor(() =>
      expect(screen.getByRole('slider', { name: /volume/i })).toHaveValue('0.2'),
    )
  })
})
