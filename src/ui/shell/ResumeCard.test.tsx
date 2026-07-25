import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ResumeCard } from './ResumeCard'
import { renderShell, sampleResumeSnapshot } from './test-helpers'

describe('ResumeCard (US2)', () => {
  it('shows the saved board’s seed, size/difficulty, and progress', () => {
    renderShell(<ResumeCard snapshot={sampleResumeSnapshot} onResume={vi.fn()} />)
    expect(screen.getByText(/KELP-2231/)).toBeInTheDocument()
    expect(screen.getByText(/medium/i)).toBeInTheDocument()
    expect(screen.getByText(/tricky/i)).toBeInTheDocument()
    // poolsFilled = 3
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('activation restores the saved board', () => {
    const onResume = vi.fn()
    renderShell(<ResumeCard snapshot={sampleResumeSnapshot} onResume={onResume} />)
    fireEvent.click(screen.getByRole('button', { name: /resume|continue/i }))
    expect(onResume).toHaveBeenCalledTimes(1)
  })
})
