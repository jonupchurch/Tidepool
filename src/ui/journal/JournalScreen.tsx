// JournalScreen.tsx — the Shore Journal: a warm grid of every catalog creature
// (found cards vs faint silhouettes), an "X of Y found" header, an All/Found/
// Missing filter, and the gentle lifetime-stats footer. Reads discoveries + stats
// through the journal-store adapter (008 seam); the model derivations are pure.
import { useEffect, useState } from 'react'
import {
  type CreatureView,
  type JournalFilter,
  type JournalStats,
  buildJournalView,
  filterCards,
  loadDiscoveries,
  loadStats,
} from '@/game'
import type { SaveStore } from '@/platform'
import { CreatureCard } from './CreatureCard'
import { StatsFooter } from './StatsFooter'

export interface JournalScreenProps {
  store: SaveStore
  onBack: () => void
}

const FILTERS: { key: JournalFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'found', label: 'Found' },
  { key: 'missing', label: 'Missing' },
]

export function JournalScreen({ store, onBack }: JournalScreenProps) {
  const [cards, setCards] = useState<CreatureView[] | null>(null)
  const [foundCount, setFoundCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<JournalStats | null>(null)
  const [filter, setFilter] = useState<JournalFilter>('all')

  useEffect(() => {
    let live = true
    void (async () => {
      const [discoveries, s] = await Promise.all([loadDiscoveries(store), loadStats(store)])
      if (!live) return
      const view = buildJournalView(discoveries)
      setCards(view.cards)
      setFoundCount(view.foundCount)
      setTotal(view.total)
      setStats(s)
    })()
    return () => {
      live = false
    }
  }, [store])

  const visible = cards ? filterCards(cards, filter) : []
  const empty = foundCount === 0
  const complete = total > 0 && foundCount === total

  return (
    <div className="h-full w-full overflow-y-auto bg-sand text-ink">
      <div className="mx-auto flex max-w-3xl flex-col px-6 py-10">
        <header className="mb-4 text-center">
          <h1 className="font-display text-4xl text-deep-pool">Shore Journal</h1>
          <p className="mt-1 text-tide" aria-live="polite">
            {cards ? `${foundCount} of ${total} found` : 'Opening the journal…'}
          </p>
          {complete && (
            <p className="mt-1 font-display text-coral">The shore's full — every creature found. 🐚</p>
          )}
          {empty && cards && (
            <p className="mt-1 text-rock">
              No creatures yet — fill a pool and the first will wash up here.
            </p>
          )}
        </header>

        {/* All / Found / Missing filter */}
        <div
          className="mx-auto mb-6 flex gap-1 rounded-full bg-foam p-1 shadow-sm"
          role="group"
          aria-label="Filter creatures"
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-full px-4 py-1.5 text-sm font-display transition-colors ${
                filter === f.key ? 'bg-tide text-foam' : 'text-deep-pool hover:bg-driftwood'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {visible.map((card) => (
            <li key={card.def.id}>
              <CreatureCard card={card} />
            </li>
          ))}
        </ul>

        {stats && <StatsFooter stats={stats} />}

        <button
          type="button"
          onClick={onBack}
          className="mx-auto mt-8 rounded-full bg-foam px-5 py-2 text-sm text-deep-pool hover:bg-driftwood"
        >
          Back to shore
        </button>
      </div>
    </div>
  )
}
