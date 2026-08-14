import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { groupRows, manifestRows, pagesOf } from '@/game/board-source'
import { groupedManifest, sampleManifest } from '@/game/board-source/test-helpers'
import { CuratedScreen } from './CuratedScreen'

const grouped = (
  solved: Parameters<typeof manifestRows>[1] = {},
  gating?: Parameters<typeof manifestRows>[2],
) => pagesOf(groupRows(sampleManifest, manifestRows(sampleManifest, solved, gating)))

/** The "solved/total" tally in the hollow at the centre of the arrangement. */
const tally = () =>
  screen.getByText(
    (_, el) => el?.tagName === 'P' && /^\d+\/\d+$/.test(el.textContent ?? ''),
  ).textContent

describe('CuratedScreen (US2)', () => {
  it('renders every board as a hex tile, in order', () => {
    render(<CuratedScreen pages={grouped()} onSelect={vi.fn()} onBack={vi.fn()} />)
    const names = screen.getAllByText(/First Cove|Quiet Reef|Kelp Forest/).map((n) => n.textContent)
    expect(names).toEqual(['First Cove', 'Quiet Reef', 'Kelp Forest'])
  })

  it('reflects merged completion + earned creature', () => {
    render(
      <CuratedScreen
        pages={grouped({ 'reef-2': { earnedCreatureId: 'crab' } })}
        onSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByText(/Shore Crab/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Quiet Reef.*solved/i })).toBeInTheDocument()
    // The tally lives in the hollow at the centre of the whole arrangement.
    expect(tally()).toBe('1/3')
  })

  // 011 FR-006: a board finished clean is marked, not merely un-flagged.
  it('marks a board whose best run had zero mistakes as clean', () => {
    render(
      <CuratedScreen
        pages={grouped({ 'reef-2': { earnedCreatureId: 'crab', errors: 0 } })}
        onSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    const tile = screen.getByRole('button', { name: /Quiet Reef.*finished clean/i })
    // Distinguished by glyph, not only by the absence of the coral ring. Scoped
    // to the tile: the page tally now carries a ✨ count of its own.
    expect(within(tile).getByText(/✨/)).toBeInTheDocument()
  })

  it('does not mark a fumbled board clean, however it was finished', () => {
    render(
      <CuratedScreen
        pages={grouped({ 'reef-2': { earnedCreatureId: 'crab', errors: 2 } })}
        onSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.queryByText(/✨/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Quiet Reef.*2 mistakes/i })).toBeInTheDocument()
  })

  it('does not claim a board solved before mistakes were tracked was clean', () => {
    // No `errors` at all = an older build recorded it. Absence of evidence is
    // not evidence of a clean run.
    render(
      <CuratedScreen
        pages={grouped({ 'reef-2': { earnedCreatureId: 'crab' } })}
        onSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.queryByText(/✨/)).not.toBeInTheDocument()
  })

  it('selecting a tile emits its BoardRequest', () => {
    const onSelect = vi.fn()
    render(<CuratedScreen pages={grouped()} onSelect={onSelect} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /First Cove/i }))
    expect(onSelect).toHaveBeenCalledWith(
      { seed: 'COVE-0001', size: 'Small', difficulty: 'Calm' },
      'cove-1',
    )
  })
})

describe('CuratedScreen groups', () => {
  it('renders one titled cluster per group, boards nested inside', () => {
    const groups = pagesOf(groupRows(groupedManifest, manifestRows(groupedManifest, {})))
    render(<CuratedScreen pages={groups} onSelect={vi.fn()} onBack={vi.fn()} />)

    const shallows = screen.getByRole('region', { name: 'Shallows' })
    const deeps = screen.getByRole('region', { name: 'Deeps' })
    // Each cluster carries its own band label...
    expect(shallows).toHaveTextContent(/Medium · Calm/)
    expect(deeps).toHaveTextContent(/Large · Deep/)
    // ...and its own boards, in order, with no bleed between clusters.
    expect(shallows).toHaveTextContent('One')
    expect(shallows).toHaveTextContent('Two')
    expect(deeps).toHaveTextContent('Three')
    expect(deeps).toHaveTextContent('Four')
    expect(shallows).not.toHaveTextContent('Three')
  })

  it('counts progress per group as well as overall', () => {
    const groups = pagesOf(
      groupRows(groupedManifest, manifestRows(groupedManifest, { 'a-1': { earnedCreatureId: 'crab' } })),
    )
    render(<CuratedScreen pages={groups} onSelect={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('region', { name: 'Shallows' })).toHaveTextContent('(1/2)')
    expect(screen.getByRole('region', { name: 'Deeps' })).toHaveTextContent('(0/2)')
    expect(tally()).toBe('1/4')
  })
})

describe('CuratedScreen mistakes', () => {
  const withErrors = (errors: number) =>
    pagesOf(
      groupRows(
        groupedManifest,
        manifestRows(groupedManifest, { 'a-1': { earnedCreatureId: 'crab', errors } }),
      ),
    )

  it('shows mistakes per group and in the overall tally', () => {
    render(<CuratedScreen pages={withErrors(3)} onSelect={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('region', { name: 'Shallows' })).toHaveTextContent('⚠3')
    expect(screen.getByText('⚠ 3')).toBeInTheDocument()
    // The flawed board says so in its accessible name too.
    expect(screen.getByRole('button', { name: /One.*3 mistakes/i })).toBeInTheDocument()
  })

  it('rings only the flawed board, and drops the ring when replayed clean', () => {
    const { container, rerender } = render(
      <CuratedScreen pages={withErrors(2)} onSelect={vi.fn()} onBack={vi.fn()} />,
    )
    expect(container.querySelectorAll('svg polygon')).toHaveLength(1)

    rerender(<CuratedScreen pages={withErrors(0)} onSelect={vi.fn()} onBack={vi.fn()} />)
    expect(container.querySelectorAll('svg polygon')).toHaveLength(0)
  })

  it('reads as clean once a solved board has no mistakes left', () => {
    render(<CuratedScreen pages={withErrors(0)} onSelect={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/⚠ clean/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Shallows' })).not.toHaveTextContent('⚠')
  })
})

describe('CuratedScreen gating (US4)', () => {
  const GATING = { enabled: true, unlockAfter: 1 }

  it('shows a soft lock on gated entries and makes them non-selectable', () => {
    const onSelect = vi.fn()
    render(<CuratedScreen pages={grouped({}, GATING)} onSelect={onSelect} onBack={vi.fn()} />)
    const locked = screen.getByRole('button', { name: /Kelp Forest, locked/i })
    expect(locked).toBeDisabled()
    fireEvent.click(locked)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('unlocks the gated entry once its prerequisite is solved', () => {
    render(
      <CuratedScreen
        pages={grouped({ 'cove-1': { earnedCreatureId: 'limpet' } }, GATING)}
        onSelect={vi.fn()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /locked/i })).not.toBeInTheDocument()
  })
})

// 013 US2: a page nobody can find, or can't get back from, is worse than no
// second page.
describe('CuratedScreen pager', () => {
  const twoPages = () => {
    const rows = manifestRows(groupedManifest, {})
    const grouped = groupRows(groupedManifest, rows)
    // Force the second group onto page two.
    return pagesOf(
      grouped.map((g, i) => (i === 0 ? g : { ...g, group: { ...g.group, page: 2 } })),
    )
  }

  it('shows no pager at all when there is only one page', () => {
    render(<CuratedScreen pages={grouped()} onSelect={vi.fn()} onBack={vi.fn()} />)
    expect(screen.queryByRole('navigation', { name: /pages/i })).not.toBeInTheDocument()
  })

  it('starts on page one, and says which page you are on', () => {
    render(<CuratedScreen pages={twoPages()} onSelect={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Shallows' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Deeps' })).not.toBeInTheDocument()
  })

  it('moves forward and back, and back lands on page one unchanged', () => {
    render(<CuratedScreen pages={twoPages()} onSelect={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    expect(screen.getByText(/page 2 of 2/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Deeps' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Shallows' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /previous page/i }))
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Shallows' })).toBeInTheDocument()
  })

  it('cannot page off either end', () => {
    render(<CuratedScreen pages={twoPages()} onSelect={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /next page/i }))
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled()
  })

  it('reports overall progress alongside the page you are looking at', () => {
    const rows = manifestRows(groupedManifest, { 'a-1': { earnedCreatureId: 'crab' } })
    const grouped = groupRows(groupedManifest, rows)
    const pages = pagesOf(
      grouped.map((g, i) => (i === 0 ? g : { ...g, group: { ...g.group, page: 2 } })),
    )
    render(<CuratedScreen pages={pages} onSelect={vi.fn()} onBack={vi.fn()} />)
    // The hollow shows this page; the pager shows the whole coast.
    expect(tally()).toBe('1/2')
    expect(screen.getByText(/1\/4 overall/)).toBeInTheDocument()
  })
})
