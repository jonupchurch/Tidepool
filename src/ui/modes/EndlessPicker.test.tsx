import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { parseSeed } from '@/core'
import { EndlessPicker } from './EndlessPicker'

describe('EndlessPicker (US1)', () => {
  it('renders every size and difficulty tier', () => {
    render(<EndlessPicker initial={{ size: 'Small', difficulty: 'Calm' }} onStart={vi.fn()} />)
    for (const t of ['Small', 'Medium', 'Large', 'Calm', 'Tricky', 'Deep']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${t}$`) })).toBeInTheDocument()
    }
  })

  it('defaults to the last-saved choice', () => {
    render(<EndlessPicker initial={{ size: 'Medium', difficulty: 'Tricky' }} onStart={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^Medium$/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Tricky$/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('Start emits a valid BoardRequest at the chosen tier', () => {
    const onStart = vi.fn()
    render(<EndlessPicker initial={{ size: 'Small', difficulty: 'Calm' }} onStart={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: /^Large$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Deep$/ }))
    fireEvent.click(screen.getByRole('button', { name: /start endless/i }))
    expect(onStart).toHaveBeenCalledTimes(1)
    const request = onStart.mock.calls[0][0]
    expect(request).toMatchObject({ size: 'Large', difficulty: 'Deep' })
    expect(parseSeed(request.seed), 'a valid shareable seed').not.toBeNull()
  })
})
