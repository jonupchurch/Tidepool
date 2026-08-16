// effects-switch.test.tsx — 017. The reported gap, stated as a test.
//
// Before this, the sound switches could say: everything off (mute), or
// everything on, or the marks without the bed (music off). The one thing they
// could NOT say was **the bed without the marks** — a quiet room where you still
// want the music. Mute took the music with it, and there was no switch for the
// effects alone. (There is no Settings screen in the app, so `sound.sfx` — which
// has existed all along — was never reachable by any means.)
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { resolveSettings } from '@/game'
import { keyFor } from '@/platform'
import { AppShell } from './AppShell'
import { HomeScreen, type HomeScreenProps } from './HomeScreen'
import { PauseOverlay } from './PauseOverlay'
import { makeFakeStore, renderShell, sampleLastPlay } from './test-helpers'

function props(over: Partial<HomeScreenProps> = {}): HomeScreenProps {
  return {
    prefs: { theme: 'Day', muted: false, music: true, effects: true },
    onPrefsChange: vi.fn(),
    volume: 0.8,
    onVolumeChange: vi.fn(),
    lastPlay: sampleLastPlay,
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

describe('the effects switch on Home', () => {
  it('turns the effects off without touching mute or music — the missing combination', () => {
    const onPrefsChange = vi.fn()
    renderShell(<HomeScreen {...props({ onPrefsChange })} />)
    fireEvent.click(screen.getByRole('button', { name: /turn sound effects off/i }))
    expect(onPrefsChange).toHaveBeenCalledWith({
      theme: 'Day',
      muted: false,
      music: true,
      effects: false,
    })
  })

  it('turns them back on', () => {
    const onPrefsChange = vi.fn()
    renderShell(
      <HomeScreen
        {...props({ prefs: { theme: 'Day', muted: false, music: true, effects: false }, onPrefsChange })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /turn sound effects on/i }))
    expect(onPrefsChange.mock.calls[0][0].effects).toBe(true)
  })

  it('reports its state to assistive tech', () => {
    renderShell(<HomeScreen {...props()} />)
    expect(screen.getByRole('button', { name: /sound effects/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  // Three independent switches, not one three-way control.
  it('is a separate control from mute and music', () => {
    renderShell(<HomeScreen {...props()} />)
    expect(screen.getByRole('button', { name: /^mute$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /music/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sound effects/i })).toBeInTheDocument()
  })
})

describe('the effects switch on Pause', () => {
  it('is offered mid-board, like the music switch', () => {
    const onEffectsChange = vi.fn()
    renderShell(
      <PauseOverlay
        onResume={vi.fn()}
        onNewBoard={vi.fn()}
        onRestart={vi.fn()}
        onHome={vi.fn()}
        music
        onMusicChange={vi.fn()}
        effects
        onEffectsChange={onEffectsChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /sound effects on/i }))
    expect(onEffectsChange).toHaveBeenCalledWith(false)
  })

  it('stays hidden when the host offers no handler', () => {
    renderShell(
      <PauseOverlay onResume={vi.fn()} onNewBoard={vi.fn()} onRestart={vi.fn()} onHome={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: /sound effects/i })).not.toBeInTheDocument()
  })
})

describe('the choice survives a restart', () => {
  it('persists to the settings record and comes back', async () => {
    const store = makeFakeStore()
    renderShell(<AppShell store={store} initialScreen="Home" />)

    await waitFor(() => expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /turn sound effects off/i }))

    await waitFor(async () => {
      const raw = await store.get(keyFor('settings'))
      expect(resolveSettings(raw).sound.effects).toBe(false)
    })
    // And the music switch is untouched by it — the whole point.
    const raw = await store.get(keyFor('settings'))
    expect(resolveSettings(raw).sound.music).toBe(true)
    expect(resolveSettings(raw).sound.muted).toBe(false)
  })
})

describe('a settings record written before 017', () => {
  it('loads with the effects on, rather than silently muting them', () => {
    const old = {
      v: 1,
      sound: { muted: false, volume: 0.8, sfx: 1, ambient: 0.5, music: true },
      visuals: {},
      controls: {},
      play: {},
    }
    expect(resolveSettings(old).sound.effects).toBe(true)
  })
})
