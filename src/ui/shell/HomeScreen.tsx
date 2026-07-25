// HomeScreen.tsx — the warm shoreline landing. Aggregates Play, the Endless
// size/difficulty picker, seed entry, and the secondary entries. Accretes across
// US1 (play + picker + seed), US2 (resume + stats), US5 (toggles). The shell
// renders these controls; the board-*source* behavior belongs to feature 004.
import { useEffect, useState } from 'react'
import type { BoardParams, DifficultyTier, SizeTier } from '@/core'
import { DIFFICULTY_TIERS, SIZE_TIERS } from '@/core'
import { toBoardParams } from '@/game/board-source'
import { SeedEntry } from '@/ui/modes/SeedEntry'
import { ResumeCard } from './ResumeCard'
import { boardRequest, freshSeed } from './board-request'
import type { HomeStats, LastPlay, ResumeSnapshot, Screen, ShellPrefs } from './types'

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
  { label: 'Shore journal', screen: 'Journal' },
  { label: 'How to play', screen: 'Tutorial' },
]

export function HomeScreen({
  prefs,
  onPrefsChange,
  lastPlay,
  resume,
  stats,
  onPlay,
  onResume,
  onNavigate,
}: HomeScreenProps) {
  const [size, setSize] = useState<SizeTier>(lastPlay.size)
  const [difficulty, setDifficulty] = useState<DifficultyTier>(lastPlay.difficulty)

  const toggleMute = () => onPrefsChange({ ...prefs, muted: !prefs.muted })
  const toggleTheme = () => onPrefsChange({ ...prefs, theme: prefs.theme === 'Night' ? 'Day' : 'Night' })

  // Reflect the persisted last-used selection whenever it (re)loads.
  useEffect(() => {
    setSize(lastPlay.size)
    setDifficulty(lastPlay.difficulty)
  }, [lastPlay.size, lastPlay.difficulty])

  const play = () => onPlay(boardRequest(freshSeed(), size, difficulty))

  return (
    <div className="relative grid h-full w-full place-items-center overflow-y-auto bg-sand text-ink">
      {/* Global toggles (US5) — mute + Day/Night Tide. */}
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          aria-label={prefs.muted ? 'Unmute' : 'Mute'}
          aria-pressed={prefs.muted}
          onClick={toggleMute}
          className="grid h-10 w-10 place-items-center rounded-full bg-foam text-lg hover:bg-driftwood"
        >
          {prefs.muted ? '🔇' : '🔊'}
        </button>
        <button
          type="button"
          aria-label="Night Tide"
          aria-pressed={prefs.theme === 'Night'}
          onClick={toggleTheme}
          className="grid h-10 w-10 place-items-center rounded-full bg-foam text-lg hover:bg-driftwood"
        >
          {prefs.theme === 'Night' ? '🌙' : '☀️'}
        </button>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-6 px-6 py-10 text-center">
        <div>
          <h1 className="font-display text-5xl text-deep-pool">Tidepools</h1>
          <p className="mt-2 text-tide">Read the shoreline. Fill the pools.</p>
        </div>

        {/* Continue your pool — shown only when a board is in progress (US2). */}
        {resume && <ResumeCard snapshot={resume} onResume={onResume} />}

        {/* Primary Play — drops into a board at the current selection. */}
        <button
          type="button"
          aria-label="Play"
          onClick={play}
          className="flex w-full flex-col items-center rounded-2xl bg-tide px-6 py-4 text-foam shadow-sm transition-colors hover:bg-deep-pool"
        >
          <span className="font-display text-2xl">Play</span>
          <span className="text-sm text-foam/80">
            {size} · {difficulty}
          </span>
        </button>

        {/* Curated shores — a primary destination alongside Play, not a
            secondary link: it's the authored progression through the game. */}
        <button
          type="button"
          aria-label="Curated shores"
          onClick={() => onNavigate('Curated')}
          className="flex w-full items-center gap-3 rounded-2xl border border-tide/30 bg-foam px-6 py-4 text-left shadow-sm transition-colors hover:bg-tide-fill"
        >
          <span aria-hidden className="text-2xl">
            🗺️
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl text-deep-pool">Curated shores</span>
            <span className="block text-sm text-tide">
              A hand-tuned coastline, gently rising
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-display text-xl tabular-nums text-deep-pool">
              {stats.curatedSolved}
              <span className="text-rock">/{stats.curatedTotal}</span>
            </span>
            <span className="block text-xs text-rock">shores</span>
          </span>
        </button>

        {/* Endless tide — size + difficulty pickers. */}
        <section className="w-full rounded-2xl bg-foam/70 p-4" aria-label="Endless tide">
          <h2 className="mb-3 font-display text-deep-pool">Endless tide</h2>
          <Segmented
            legend="Size"
            options={SIZE_TIERS}
            value={size}
            onChange={(v) => setSize(v as SizeTier)}
          />
          <Segmented
            legend="Difficulty"
            options={DIFFICULTY_TIERS}
            value={difficulty}
            onChange={(v) => setDifficulty(v as DifficultyTier)}
          />
        </section>

        {/* Enter a seed — jump to a friend's exact board (004 seed-entry). */}
        <SeedEntry
          currentPrefs={{ size, difficulty }}
          onSubmit={(request) => onPlay(toBoardParams(request))}
        />

        {/* Light stats — warm even at zero (US2). */}
        <section aria-label="Your shore" className="w-full text-sm text-tide">
          <div className="flex justify-center gap-6">
            <span>
              <span className="font-display text-2xl text-deep-pool">{stats.boardsSolved}</span>{' '}
              boards solved
            </span>
            <span>
              <span className="font-display text-2xl text-deep-pool">{stats.creaturesFound}</span> of{' '}
              {stats.totalCreatures} creatures
            </span>
          </div>
          <p className="mt-1 text-xs text-rock">
            {stats.featuredCreature
              ? `Newest find: ${stats.featuredCreature}`
              : 'Your shore awaits — fill your first pool.'}
          </p>
        </section>

        {/* Secondary entries. */}
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

/** A small segmented single-select control (size / difficulty). */
function Segmented({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: readonly string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 text-xs uppercase tracking-wide text-rock">{legend}</div>
      <div className="flex gap-2">
        {options.map((opt) => {
          const active = opt === value
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? 'bg-tide text-foam' : 'bg-sand text-deep-pool hover:bg-driftwood'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
