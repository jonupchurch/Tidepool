import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { manifestRows } from '@/game/board-source'
import { sampleManifest } from '@/game/board-source/test-helpers'
import { CuratedScreen } from './CuratedScreen'

describe('CuratedScreen (US2)', () => {
  it('renders entries in order with name, difficulty, and seed', () => {
    const rows = manifestRows(sampleManifest, {})
    render(<CuratedScreen rows={rows} onSelect={vi.fn()} onBack={vi.fn()} />)
    const names = screen.getAllByText(/First Cove|Quiet Reef|Kelp Forest/).map((n) => n.textContent)
    expect(names).toEqual(['First Cove', 'Quiet Reef', 'Kelp Forest'])
    expect(screen.getByRole('button', { name: /copy seed COVE-0001/i })).toBeInTheDocument()
  })

  it('reflects merged completion + earned creature', () => {
    const rows = manifestRows(sampleManifest, { 'reef-2': { earnedCreatureId: 'crab' } })
    render(<CuratedScreen rows={rows} onSelect={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/found Shore Crab/i)).toBeInTheDocument()
    // Solved entries offer Replay; unsolved offer Play.
    expect(screen.getAllByRole('button', { name: /^replay$/i })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /^play$/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('selecting an entry emits its BoardRequest', () => {
    const onSelect = vi.fn()
    const rows = manifestRows(sampleManifest, {})
    render(<CuratedScreen rows={rows} onSelect={onSelect} onBack={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /^play$/i })[0])
    expect(onSelect).toHaveBeenCalledWith(
      { seed: 'COVE-0001', size: 'Small', difficulty: 'Calm' },
      'cove-1',
    )
  })
})

describe('CuratedScreen gating (US4)', () => {
  const GATING = { enabled: true, unlockAfter: 1 }

  it('shows a soft lock on gated entries and makes them non-selectable', () => {
    const onSelect = vi.fn()
    const rows = manifestRows(sampleManifest, {}, GATING) // kelp-3 locked
    render(<CuratedScreen rows={rows} onSelect={onSelect} onBack={vi.fn()} />)
    expect(screen.getByText(/unlock soon/i)).toBeInTheDocument()
    // Only the two open entries expose a Play action; the locked one does not.
    expect(screen.getAllByRole('button', { name: /^play$/i })).toHaveLength(2)
  })

  it('unlocks the gated entry once its prerequisite is solved', () => {
    const rows = manifestRows(sampleManifest, { 'cove-1': { earnedCreatureId: 'limpet' } }, GATING)
    render(<CuratedScreen rows={rows} onSelect={vi.fn()} onBack={vi.fn()} />)
    expect(screen.queryByText(/unlock soon/i)).not.toBeInTheDocument()
  })
})
