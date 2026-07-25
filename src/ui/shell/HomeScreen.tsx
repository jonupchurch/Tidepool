// HomeScreen.tsx — the warm shoreline landing. Aggregates Play, the Endless
// picker, seed entry, secondary entries, resume card, stats, and the global
// toggles. Accretes across US1 (play + picker + seed), US2 (resume + stats),
// US5 (toggles). This foundational version wires Play + the secondary entries.
import { boardRequest, freshSeed } from './board-request'
import type { HomeStats, LastPlay, ResumeSnapshot, Screen, ShellPrefs } from './types'
import type { BoardParams } from '@/core'

export interface HomeScreenProps {
  prefs: ShellPrefs
  onPrefsChange: (prefs: ShellPrefs) => void
  lastPlay: LastPlay
  resume: ResumeSnapshot | null
  stats: HomeStats
  /** Start a fresh board from the given request. */
  onPlay: (params: BoardParams) => void
  /** Restore the saved in-progress board. */
  onResume: () => void
  /** Go to a secondary screen (Curated / Journal / Settings / Tutorial). */
  onNavigate: (screen: Screen) => void
}

const SECONDARY: readonly { label: string; screen: Screen }[] = [
  { label: 'Curated shores', screen: 'Curated' },
  { label: 'Shore journal', screen: 'Journal' },
  { label: 'Settings', screen: 'Settings' },
  { label: 'How to play', screen: 'Tutorial' },
]

export function HomeScreen({ lastPlay, onPlay, onNavigate }: HomeScreenProps) {
  const play = () => onPlay(boardRequest(freshSeed(), lastPlay.size, lastPlay.difficulty))

  return (
    <div className="grid h-full w-full place-items-center bg-sand text-ink">
      <div className="flex w-full max-w-md flex-col items-center gap-6 px-6 text-center">
        <div>
          <h1 className="font-display text-5xl text-deep-pool">Tidepools</h1>
          <p className="mt-2 text-tide">Read the shoreline. Fill the pools.</p>
        </div>

        <button
          type="button"
          onClick={play}
          className="w-full rounded-2xl bg-tide px-6 py-4 font-display text-xl text-foam shadow-sm hover:bg-deep-pool"
        >
          Play
        </button>

        <nav className="flex flex-wrap justify-center gap-2">
          {SECONDARY.map(({ label, screen }) => (
            <button
              key={screen}
              type="button"
              onClick={() => onNavigate(screen)}
              className="rounded-full bg-foam px-4 py-2 text-sm text-deep-pool hover:bg-driftwood"
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
