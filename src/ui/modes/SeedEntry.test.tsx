import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SeedEntry } from './SeedEntry'

const prefs = { size: 'Medium', difficulty: 'Tricky' } as const

describe('SeedEntry (US3)', () => {
  it('emits the exact board request for a valid seed', () => {
    const onSubmit = vi.fn()
    render(<SeedEntry currentPrefs={prefs} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole('textbox', { name: /enter a seed/i }), {
      target: { value: 'coral-4417' },
    })
    fireEvent.click(screen.getByRole('button', { name: /jump/i }))
    expect(onSubmit).toHaveBeenCalledWith({ seed: 'CORAL-4417', size: 'Medium', difficulty: 'Tricky' })
  })

  it('shows a gentle inline message on invalid input and emits nothing', () => {
    const onSubmit = vi.fn()
    render(<SeedEntry currentPrefs={prefs} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole('textbox', { name: /enter a seed/i }), {
      target: { value: 'nonsense' },
    })
    fireEvent.click(screen.getByRole('button', { name: /jump/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables submit until a seed is typed', () => {
    render(<SeedEntry currentPrefs={prefs} onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /jump/i })).toBeDisabled()
  })
})
