// VolumeSlider — the app's first range input (015). The component itself is
// thin, so these test the parts that carry signal: that it is a real slider with
// a name (a11y.test.tsx holds the shell to that), that it speaks percentages
// rather than 0–1 fractions, and that it tells the truth while muted.
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VolumeSlider } from './VolumeSlider'
import { renderShell } from './test-helpers'

describe('VolumeSlider', () => {
  it('is a named slider carrying the current level', () => {
    renderShell(<VolumeSlider value={0.6} onChange={vi.fn()} />)
    const slider = screen.getByRole('slider', { name: /volume/i })
    expect(slider).toHaveValue('0.6')
    expect(slider).toBeEnabled()
  })

  it('reports its level as a percentage, not a fraction', () => {
    renderShell(<VolumeSlider value={0.35} onChange={vi.fn()} />)
    // 0.35 read aloud as "0.35" is meaningless; "35%" is the thing a player has
    // a feel for. aria-valuetext is what a screen reader announces instead of
    // the raw value.
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '35%')
  })

  it('reports a change as a 0–1 number, not the input string', () => {
    const onChange = vi.fn()
    renderShell(<VolumeSlider value={0.5} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.75' } })
    expect(onChange).toHaveBeenCalledWith(0.75)
    // Not '0.75' — a string would sail through to the settings store and land in
    // persistence, where `resolveSettings` would reject it and silently reset the
    // level to its default on the next boot.
    expect(typeof onChange.mock.calls[0]?.[0]).toBe('number')
  })

  it('spans silence to full', () => {
    renderShell(<VolumeSlider value={0.5} onChange={vi.fn()} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '1')
  })

  it('steps coarsely enough that a drag does not write per pixel', () => {
    renderShell(<VolumeSlider value={0.5} onChange={vi.fn()} />)
    const step = Number(screen.getByRole('slider').getAttribute('step'))
    // Every change persists a settings record. A continuous slider would write
    // one per pixel of travel; 5% detents cap a full sweep at ~20 writes while
    // staying finer than anyone levels a game by.
    expect(step).toBeGreaterThan(0)
    expect(step).toBeLessThanOrEqual(0.05)
    expect(Math.round(1 / step)).toBeLessThanOrEqual(20)
  })

  // 015 FR-007/FR-008: mute is a separate switch, so while muted this control
  // sets a level that is real but not currently audible. It stays usable — "set
  // my level now, unmute later" is a legitimate move — but it must not look live.
  describe('while muted', () => {
    it('says so, so the announced level is not a lie', () => {
      renderShell(<VolumeSlider value={0.5} onChange={vi.fn()} muted />)
      expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '50%, muted')
    })

    it('stays operable', () => {
      const onChange = vi.fn()
      renderShell(<VolumeSlider value={0.5} onChange={onChange} muted />)
      const slider = screen.getByRole('slider')
      expect(slider).toBeEnabled()
      fireEvent.change(slider, { target: { value: '0.2' } })
      expect(onChange).toHaveBeenCalledWith(0.2)
    })

    it('does not clear mute by being used', () => {
      // The whole component surface is (value, onChange) — there is no mute
      // setter to call — so this is structural rather than behavioural: the
      // control cannot touch mute even if a future edit wanted it to.
      const onChange = vi.fn()
      renderShell(<VolumeSlider value={0.5} onChange={onChange} muted />)
      fireEvent.change(screen.getByRole('slider'), { target: { value: '0.9' } })
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith(0.9)
    })
  })

  it('accepts a custom accessible name', () => {
    renderShell(<VolumeSlider value={0.5} onChange={vi.fn()} label="Master volume" />)
    expect(screen.getByRole('slider', { name: 'Master volume' })).toBeInTheDocument()
  })
})
