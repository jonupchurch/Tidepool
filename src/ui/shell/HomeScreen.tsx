// HomeScreen.tsx — the warm shoreline landing. Aggregates Play, the Endless
// size/difficulty picker, seed entry, and the secondary entries. Accretes across
// US1 (play + picker + seed), US2 (resume + stats), US5 (toggles). The shell
// renders these controls; the board-*source* behavior belongs to feature 004.
import { useEffect, useState } from 'react'
import type { BoardParams, DifficultyTier, SizeTier } from '@/core'
import { DEFAULT_SHAPE, DIFFICULTY_TIERS, SIZE_TIERS } from '@/core'
import {
  type ShoreChoice,
  edgeHintsApply,
  isShoreChoice,
  shoreName,
  shoresFor,
  toBoardParams,
} from '@/game/board-source'
import { SeedEntry } from '@/ui/modes/SeedEntry'
import { ResumeCard } from './ResumeCard'
import { VolumeSlider } from './VolumeSlider'
import { boardRequest, freshSeed } from './board-request'
import type { HomeStats, LastPlay, ResumeSnapshot, Screen, ShellPrefs } from './types'

export interface HomeScreenProps {
  prefs: ShellPrefs
  onPrefsChange: (prefs: ShellPrefs) => void
  /** Master level, 0..1 (015). Its own prop rather than a `ShellPrefs` field:
   *  `onPrefsChange` rewrites every switch on each call, and this one is dragged.
   *  Keeping it separate means a drag writes exactly one setting. */
  volume: number
  onVolumeChange: (volume: number) => void
  lastPlay: LastPlay
  resume: ResumeSnapshot | null
  stats: HomeStats
  /** Start a fresh board from the given request. The second argument is the
   *  *selection* behind it — `params` carries a resolved silhouette, which
   *  can't tell `Any` apart from a shore the player named. */
  onPlay: (params: BoardParams, selection?: LastPlay) => void
  /** Restore the saved in-progress board. */
  onResume: () => void
  /** Go to a secondary screen (Curated / Journal / Settings / Tutorial). */
  onNavigate: (screen: Screen) => void
}

/** What the Shore row shows where no silhouette fits — the hexagon, alone and
 *  inert, so the control is still discoverable at the default Small size. */
const SHORE_PLACEHOLDER: readonly string[] = [DEFAULT_SHAPE]

const SECONDARY: readonly { label: string; screen: Screen }[] = [
  { label: 'Shore journal', screen: 'Journal' },
  { label: 'How to play', screen: 'Tutorial' },
  { label: 'About', screen: 'About' },
]

export function HomeScreen({
  prefs,
  onPrefsChange,
  volume,
  onVolumeChange,
  lastPlay,
  resume,
  stats,
  onPlay,
  onResume,
  onNavigate,
}: HomeScreenProps) {
  const [size, setSize] = useState<SizeTier>(lastPlay.size)
  const [difficulty, setDifficulty] = useState<DifficultyTier>(lastPlay.difficulty)
  const [shore, setShore] = useState<ShoreChoice>(lastPlay.shore)
  const [edgeHints, setEdgeHints] = useState<boolean>(lastPlay.edgeHints)

  // Which choices this size can actually carry, and whether the hints toggle
  // does anything at this tier. Both stay *offered* when they don't apply —
  // disabled with a reason reads as a rule of the game; a control that vanishes
  // reads as a bug, and nothing on Home would ever mention shores on Small.
  const shoreOptions = shoresFor(size)
  const shoreAvailable = shoreOptions.length > 1
  const hintsAvailable = edgeHintsApply(difficulty)

  const toggleMute = () => onPrefsChange({ ...prefs, muted: !prefs.muted })
  const toggleMusic = () => onPrefsChange({ ...prefs, music: !prefs.music })
  const toggleTheme = () => onPrefsChange({ ...prefs, theme: prefs.theme === 'Night' ? 'Day' : 'Night' })

  // Reflect the persisted last-used selection whenever it (re)loads.
  useEffect(() => {
    setSize(lastPlay.size)
    setDifficulty(lastPlay.difficulty)
    setShore(lastPlay.shore)
    setEdgeHints(lastPlay.edgeHints)
  }, [lastPlay.size, lastPlay.difficulty, lastPlay.shore, lastPlay.edgeHints])

  // The *held* choice survives a trip through a size that can't carry it, so
  // Medium → Small → Medium comes back to the shore you picked. Only what the
  // board is generated with is coerced (`resolveShore`), and only there.
  const selection: LastPlay = { size, difficulty, shore, edgeHints }
  const play = () =>
    onPlay(boardRequest(freshSeed(), size, difficulty, { shore, edgeHints }), selection)

  return (
    <div className="relative grid h-full w-full place-items-center overflow-y-auto bg-sand text-ink">
      {/* Global toggles (US5) — mute + music + Day/Night Tide. Mute is the
          master ("everything off, one press"); music is the finer control, so
          you can keep the marks audible in a quiet room (014 US1). The volume
          slider sits under them (015): the switches answer "any sound?", it
          answers "how much?". */}
      <div className="absolute right-4 top-4 flex flex-col items-stretch gap-2">
        <div className="flex gap-2">
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
            aria-label={prefs.music ? 'Turn music off' : 'Turn music on'}
            aria-pressed={prefs.music}
            onClick={toggleMusic}
            className="grid h-10 w-10 place-items-center rounded-full bg-foam text-lg hover:bg-driftwood"
          >
            {/* One glyph, struck through when off. A second speaker emoji beside
                the mute button read as a duplicate of it; a note that is plainly
                crossed out doesn't. State is carried by aria-pressed regardless. */}
            <span className={prefs.music ? '' : 'line-through decoration-2 opacity-50'}>🎵</span>
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
        <VolumeSlider
          value={volume}
          onChange={onVolumeChange}
          muted={prefs.muted}
          className="w-full"
        />
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-6 px-6 py-10 text-center">
        <div>
          <h1 className="font-display text-5xl text-deep-pool">Tidepool</h1>
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

        {/* Endless tide — size, difficulty, and the 016 variety choices. */}
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
          {/* Shore — the silhouette the board is carved from. `Any` lets the
              seed choose, so a run varies board to board and still reproduces. */}
          <Segmented
            legend="Shore"
            options={shoreAvailable ? shoreOptions : SHORE_PLACEHOLDER}
            value={shoreAvailable ? shore : DEFAULT_SHAPE}
            labelOf={(v) => (isShoreChoice(v) ? shoreName(v) : v)}
            disabled={!shoreAvailable}
            note={shoreAvailable ? undefined : 'Shores need a Medium or Large tide.'}
            onChange={(v) => isShoreChoice(v) && setShore(v)}
          />
          {/* Edge hints — `{n}` / `-n-` on the row totals. Offered only at Deep,
              because reduction strips every annotation the lower tiers'
              technique sets can't use; see `edgeHintsApply`. */}
          <Switch
            legend="Edge hints"
            caption={
              hintsAvailable
                ? 'Row totals may show {n} or -n- — one run of water, or more than one.'
                : 'Deep tides only — gentler tides solve without them.'
            }
            checked={hintsAvailable && edgeHints}
            disabled={!hintsAvailable}
            onChange={setEdgeHints}
          />
        </section>

        {/* Enter a seed — jump to a friend's exact board (004 seed-entry). */}
        <SeedEntry
          currentPrefs={{ size, difficulty, shore, edgeHints }}
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

/**
 * A small segmented single-select control (size / difficulty / shore).
 *
 * Wraps rather than dividing the row evenly: with six shores, `flex-1` squeezed
 * every label to an ellipsis. `basis` keeps the three-item rows looking as they
 * always have while letting a longer set fall onto a second line.
 */
function Segmented({
  legend,
  options,
  value,
  onChange,
  labelOf = (v) => v,
  disabled = false,
  note,
}: {
  legend: string
  options: readonly string[]
  value: string
  onChange: (value: string) => void
  /** Display text for an option value (shore ids are not player-facing). */
  labelOf?: (value: string) => string
  /** Offered but inert — the choice doesn't apply at the current selection. */
  disabled?: boolean
  /** Why it's inert. Shown under the row, so the rule is visible where it bites. */
  note?: string
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 text-xs uppercase tracking-wide text-rock">{legend}</div>
      <div className={`flex flex-wrap gap-2 ${disabled ? 'opacity-50' : ''}`}>
        {options.map((opt) => {
          const active = opt === value
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`min-w-20 flex-1 basis-24 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? 'bg-tide text-foam' : 'bg-sand text-deep-pool hover:bg-driftwood'
              } ${disabled ? 'cursor-not-allowed hover:bg-sand' : ''}`}
            >
              {labelOf(opt)}
            </button>
          )
        })}
      </div>
      {note && <p className="mt-1 text-xs text-rock">{note}</p>}
    </div>
  )
}

/** An on/off control with a caption — for a choice that isn't one-of-several. */
function Switch({
  legend,
  caption,
  checked,
  onChange,
  disabled = false,
}: {
  legend: string
  caption: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={`mb-3 last:mb-0 ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-1 text-xs uppercase tracking-wide text-rock">{legend}</div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={legend}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
          checked ? 'bg-tide text-foam' : 'bg-sand text-deep-pool'
        } ${disabled ? 'cursor-not-allowed' : 'hover:bg-driftwood hover:text-deep-pool'}`}
      >
        <span
          aria-hidden
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
            checked ? 'border-foam/60 bg-foam/20' : 'border-driftwood bg-foam'
          }`}
        >
          {checked ? '✓' : ''}
        </span>
        <span className="min-w-0 flex-1">{caption}</span>
      </button>
    </div>
  )
}
