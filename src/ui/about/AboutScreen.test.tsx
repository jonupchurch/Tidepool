import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AboutScreen } from './AboutScreen'
import { CREDIT, VERSION } from './about'

describe('AboutScreen', () => {
  it('shows the version', () => {
    render(<AboutScreen onBack={vi.fn()} />)
    expect(screen.getByText(`Version ${VERSION}`)).toBeInTheDocument()
  })

  it('shows the credit line', () => {
    render(<AboutScreen onBack={vi.fn()} />)
    expect(screen.getByText(CREDIT)).toBeInTheDocument()
    expect(screen.getByText(/gravytraining/i)).toBeInTheDocument()
  })

  it('goes back to shore', () => {
    const onBack = vi.fn()
    render(<AboutScreen onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /back to shore/i }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
