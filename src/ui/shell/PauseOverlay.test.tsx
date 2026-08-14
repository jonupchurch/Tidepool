import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PauseOverlay, type PauseOverlayProps } from './PauseOverlay'
import { renderShell } from './test-helpers'

function props(over: Partial<PauseOverlayProps> = {}): PauseOverlayProps {
  return {
    onResume: vi.fn(),
    onNewBoard: vi.fn(),
    onRestart: vi.fn(),
    onHome: vi.fn(),
    ...over,
  }
}

describe('PauseOverlay (US4)', () => {
  it('shows the four actions and the "board is saved" reassurance', () => {
    renderShell(<PauseOverlay {...props()} />)
    expect(screen.getByRole('button', { name: /^resume$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new board/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restart this board/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^home$/i })).toBeInTheDocument()
    expect(screen.getByText(/your board is saved/i)).toBeInTheDocument()
  })

  it('Resume returns to the board', () => {
    const onResume = vi.fn()
    renderShell(<PauseOverlay {...props({ onResume })} />)
    fireEvent.click(screen.getByRole('button', { name: /^resume$/i }))
    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it('Home leaves the board (navigates away)', () => {
    const onHome = vi.fn()
    renderShell(<PauseOverlay {...props({ onHome })} />)
    fireEvent.click(screen.getByRole('button', { name: /^home$/i }))
    expect(onHome).toHaveBeenCalledTimes(1)
  })

  it('routes New board and Restart', () => {
    const onNewBoard = vi.fn()
    const onRestart = vi.fn()
    renderShell(<PauseOverlay {...props({ onNewBoard, onRestart })} />)
    fireEvent.click(screen.getByRole('button', { name: /new board/i }))
    fireEvent.click(screen.getByRole('button', { name: /restart this board/i }))
    expect(onNewBoard).toHaveBeenCalledTimes(1)
    expect(onRestart).toHaveBeenCalledTimes(1)
  })

  it('offers no Settings action — there is no Settings screen', () => {
    renderShell(<PauseOverlay {...props()} />)
    expect(screen.queryByRole('button', { name: /^settings$/i })).not.toBeInTheDocument()
  })

  it('exposes a modal dialog for focus/scrim semantics', () => {
    renderShell(<PauseOverlay {...props()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  // T030 — SC-003: closing then reopening Pause returns to a safe state with the
  // actions intact (Resume always available).
  it('is safe to close and reopen', () => {
    const onResume = vi.fn()
    const { unmount } = renderShell(<PauseOverlay {...props({ onResume })} />)
    unmount()
    renderShell(<PauseOverlay {...props({ onResume })} />)
    fireEvent.click(screen.getByRole('button', { name: /^resume$/i }))
    expect(onResume).toHaveBeenCalledTimes(1)
  })
})

// 014 US3: needing quiet is usually urgent, so the switch is reachable without
// abandoning the board.
describe('PauseOverlay music switch', () => {
  it('is absent when no handler is supplied', () => {
    renderShell(<PauseOverlay {...props()} />)
    expect(screen.queryByRole('button', { name: /music/i })).not.toBeInTheDocument()
  })

  it('reports its state and toggles it', () => {
    const onMusicChange = vi.fn()
    renderShell(<PauseOverlay {...props({ music: true, onMusicChange })} />)
    const btn = screen.getByRole('button', { name: /music on/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(btn)
    expect(onMusicChange).toHaveBeenCalledWith(false)
  })

  it('turns music back on from the off state', () => {
    const onMusicChange = vi.fn()
    renderShell(<PauseOverlay {...props({ music: false, onMusicChange })} />)
    const btn = screen.getByRole('button', { name: /music off/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btn)
    expect(onMusicChange).toHaveBeenCalledWith(true)
  })
})
