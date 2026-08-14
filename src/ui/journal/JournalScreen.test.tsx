import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CREATURES } from '@/game'
import { memoryStore } from '@/game/journal-fixtures'
import { saveDiscoveries, saveStats } from '@/game/journal-store'
import type { SaveStore } from '@/platform'
import { JournalScreen } from './JournalScreen'

async function seeded(): Promise<SaveStore> {
  const store = memoryStore()
  await saveDiscoveries(store, { crab: { firstFoundSeed: 'TIDE-0007', count: 2 } })
  await saveStats(store, { boardsSolved: 4, poolsFilled: 17, creaturesFound: 1, boardsPerfect: 2 })
  return store
}

describe('JournalScreen (US1)', () => {
  it('renders a card per catalog creature with an accurate "X of Y found" header', async () => {
    render(<JournalScreen store={await seeded()} onBack={vi.fn()} />)
    expect(await screen.findByText(`1 of ${CREATURES.length} found`)).toBeInTheDocument()
    expect(screen.getByText('Shore Crab')).toBeInTheDocument()
    // every catalog creature has a card (found or silhouette)
    const grid = screen.getByRole('list')
    expect(within(grid).getAllByRole('listitem')).toHaveLength(CREATURES.length)
    // the untouched creatures render as silhouettes
    expect(screen.getAllByText(/not yet found/i)).toHaveLength(CREATURES.length - 1)
  })

  it('renders the warm zero-discovery empty state', async () => {
    render(<JournalScreen store={memoryStore()} onBack={vi.fn()} />)
    expect(await screen.findByText(`0 of ${CREATURES.length} found`)).toBeInTheDocument()
    expect(screen.getByText(/fill a pool and the first will wash up/i)).toBeInTheDocument()
  })

  it('renders the full-completion "shore\'s full" state', async () => {
    const store = memoryStore()
    await saveDiscoveries(
      store,
      Object.fromEntries(CREATURES.map((c) => [c.id, { firstFoundSeed: 'COVE-0001', count: 1 }])),
    )
    render(<JournalScreen store={store} onBack={vi.fn()} />)
    expect(await screen.findByText(/the shore's full/i)).toBeInTheDocument()
  })
})

describe('JournalScreen filter + footer (US3)', () => {
  it('filters to exactly the matching subset', async () => {
    render(<JournalScreen store={await seeded()} onBack={vi.fn()} />)
    await screen.findByText('Shore Crab')
    const grid = screen.getByRole('list')

    fireEvent.click(screen.getByRole('button', { name: 'Found' }))
    expect(within(grid).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Shore Crab')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Missing' }))
    expect(within(grid).getAllByRole('listitem')).toHaveLength(CREATURES.length - 1)
    expect(screen.queryByText('Shore Crab')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(within(grid).getAllByRole('listitem')).toHaveLength(CREATURES.length)
  })

  it('shows the lifetime stats footer from persistence', async () => {
    render(<JournalScreen store={await seeded()} onBack={vi.fn()} />)
    const footer = await screen.findByLabelText(/lifetime shore stats/i)
    expect(within(footer).getByText(/4 boards solved/i)).toBeInTheDocument()
    expect(within(footer).getByText(/17 pools filled/i)).toBeInTheDocument()
    expect(within(footer).getByText(/1 creatures found/i)).toBeInTheDocument()
  })
})
