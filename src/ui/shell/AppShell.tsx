// AppShell.tsx — the app root. Hosts navigation (via the pure nav reducer),
// swaps the active screen, applies the persisted theme app-wide (data-theme),
// and overlays Pause on Gameplay. Owns none of its data: prefs/resume/stats come
// through the shell-store seam (008/005); Play/Resume launch Gameplay (002);
// theme token *values* live in Settings (006).
import { useCallback, useEffect, useReducer, useState } from 'react'
import type { BoardParams } from '@/core'
import {
  type BoardRequest,
  type CuratedRow,
  getCuratedRows,
  groupRows,
  loadCuratedPack,
  markCuratedSolved,
  nextCuratedEntry,
  nextSeed,
  toBoardParams,
} from '@/game/board-source'
import { type SaveStore, getSaveStore } from '@/platform'
import { CuratedScreen } from '@/ui/curated/CuratedScreen'
import { GameplayScreen } from '@/ui/gameplay/GameplayScreen'
import { JournalScreen } from '@/ui/journal/JournalScreen'
import { HomeScreen } from './HomeScreen'
import { PauseOverlay } from './PauseOverlay'
import { SplashScreen } from './SplashScreen'
import { boardRequest, freshSeed } from './board-request'
import { current, initialNav, navReducer } from './nav'
import {
  getHomeStats,
  getLastPlay,
  getResumeSnapshot,
  loadShellPrefs,
  saveShellPrefs,
  setLastPlay as persistLastPlay,
} from './shell-store'
import type { HomeStats, LastPlay, ResumeSnapshot, Screen, ShellPrefs } from './types'

const DEFAULT_STATS: HomeStats = {
  boardsSolved: 0,
  creaturesFound: 0,
  totalCreatures: 0,
  featuredCreature: null,
  curatedSolved: 0,
  curatedTotal: 0,
}

export interface AppShellProps {
  /** Test seam — defaults to the process-wide SaveStore. */
  store?: SaveStore
  /** Test seam — the screen to start on (default Splash → dismisses to Home). */
  initialScreen?: Screen
}

export function AppShell({ store = getSaveStore(), initialScreen = 'Splash' }: AppShellProps = {}) {
  const [nav, dispatch] = useReducer(navReducer, initialScreen, initialNav)
  const [prefs, setPrefs] = useState<ShellPrefs>({ theme: 'Day', muted: false })
  const [lastPlay, setLastPlay] = useState<LastPlay>({ size: 'Small', difficulty: 'Calm' })
  const [resume, setResume] = useState<ResumeSnapshot | null>(null)
  const [stats, setStats] = useState<HomeStats>(DEFAULT_STATS)
  const [paused, setPaused] = useState(false)
  const [booted, setBooted] = useState(false)
  const [launchKey, setLaunchKey] = useState(0)
  const [curatedRows, setCuratedRows] = useState<CuratedRow[]>([])

  const entry = current(nav)
  const screen = entry.screen

  // Apply the theme app-wide. Token values are owned by Settings (006).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme === 'Night' ? 'night' : 'day')
  }, [prefs.theme])

  // Boot: load persisted prefs + last-used play request, then release the splash.
  useEffect(() => {
    void (async () => {
      setPrefs(await loadShellPrefs(store))
      setLastPlay(await getLastPlay(store))
      setBooted(true)
    })()
  }, [store])

  // Refresh Home's derived data whenever Home becomes active (a board may have
  // completed or been abandoned since it was last shown).
  useEffect(() => {
    if (screen !== 'Home') return
    void (async () => {
      setResume(await getResumeSnapshot(store))
      setStats(await getHomeStats(store))
      setLastPlay(await getLastPlay(store))
    })()
  }, [screen, store, launchKey])

  // Refresh the curated list whenever Curated becomes active (completion marks
  // may have changed since it was last shown).
  useEffect(() => {
    if (screen !== 'Curated') return
    void (async () => setCuratedRows(await getCuratedRows(store)))()
  }, [screen, store, launchKey])

  const navigate = useCallback((to: Screen) => dispatch({ type: 'navigate', entry: { screen: to } }), [])
  const goHome = useCallback(() => {
    setPaused(false)
    dispatch({ type: 'navigate', entry: { screen: 'Home' } })
  }, [])

  const changePrefs = useCallback(
    (next: ShellPrefs) => {
      setPrefs(next)
      void saveShellPrefs(store, next)
    },
    [store],
  )

  const launchGameplay = useCallback(
    (params: BoardParams, doResume: boolean, curatedId?: string) => {
      setPaused(false)
      setLaunchKey((k) => k + 1)
      dispatch({
        type: 'navigate',
        entry: { screen: 'Gameplay', launch: { params, resume: doResume, curatedId } },
      })
    },
    [],
  )

  const onPlay = useCallback(
    (params: BoardParams) => {
      void persistLastPlay(store, { size: params.size, difficulty: params.difficulty })
      launchGameplay(params, false)
    },
    [store, launchGameplay],
  )

  // Curated: launch the entry's exact board, tagged so completion records it.
  const onSelectCurated = useCallback(
    (request: BoardRequest, curatedId: string) => launchGameplay(toBoardParams(request), false, curatedId),
    [launchGameplay],
  )

  // Record curated completion (the largest-pool creature) against its entry.
  const curatedId = entry.launch?.curatedId
  const onSolved = useCallback(
    (earnedCreatureId: string | null, errors: number) => {
      // Curated entries keep a mistake record (best run wins); Endless does not.
      if (curatedId && earnedCreatureId) {
        void markCuratedSolved(store, curatedId, earnedCreatureId, errors)
      }
    },
    [curatedId, store],
  )

  const onResume = useCallback(() => {
    if (!resume) return
    launchGameplay(boardRequest(resume.seed, resume.size, resume.difficulty), true)
  }, [resume, launchGameplay])

  // "Next board" advances the deterministic Endless stream (004); the same seed
  // always yields the same next board, so a stream is reproducible/shareable.
  const nextBoard = useCallback(
    (cur: BoardParams): BoardParams => ({ ...cur, seed: nextSeed(cur.seed) }),
    [],
  )

  /**
   * "Next board" goes through the shell rather than Gameplay's own advance, so
   * the launch entry — and with it `curatedId` — moves with the board. Playing
   * the curated ladder used to leave `curatedId` pinned to the entry you first
   * selected, so every later completion re-recorded THAT entry and the boards
   * you actually played were Endless seeds, not curated ones.
   */
  const currentParams = entry.launch?.params
  const onNextBoard = useCallback(() => {
    if (curatedId) {
      const next = nextCuratedEntry(loadCuratedPack(), curatedId)
      // Off the end of the coastline: back to the list to pick what's next.
      if (!next) {
        navigate('Curated')
        return
      }
      const request = { seed: next.seed, size: next.size, difficulty: next.difficulty }
      launchGameplay(toBoardParams(request), false, next.id)
      return
    }
    if (currentParams) launchGameplay(nextBoard(currentParams), false)
  }, [curatedId, currentParams, launchGameplay, nextBoard, navigate])

  // Pause actions — the board stays saved throughout; Resume returns to it.
  const onNewBoard = useCallback(
    () => onPlay(boardRequest(freshSeed(), lastPlay.size, lastPlay.difficulty)),
    [onPlay, lastPlay],
  )
  const onRestart = useCallback(() => {
    if (currentParams) launchGameplay(currentParams, false)
    else onNewBoard()
  }, [currentParams, launchGameplay, onNewBoard])
  const onPauseSettings = useCallback(() => {
    setPaused(false)
    navigate('Settings')
  }, [navigate])

  function renderScreen() {
    switch (screen) {
      case 'Home':
        return (
          <HomeScreen
            prefs={prefs}
            onPrefsChange={changePrefs}
            lastPlay={lastPlay}
            resume={resume}
            stats={stats}
            onPlay={onPlay}
            onResume={onResume}
            onNavigate={navigate}
          />
        )
      case 'Gameplay':
        return (
          <GameplayScreen
            key={launchKey}
            params={entry.launch?.params}
            resume={entry.launch?.resume ?? false}
            onHome={goHome}
            onJournal={() => navigate('Journal')}
            onPause={() => setPaused(true)}
            onSolved={onSolved}
            onNextBoard={onNextBoard}
            nextParams={nextBoard}
          />
        )
      case 'Curated':
        return (
          <CuratedScreen
            groups={groupRows(loadCuratedPack(), curatedRows)}
            onSelect={onSelectCurated}
            onBack={goHome}
          />
        )
      case 'Journal':
        return <JournalScreen store={store} onBack={goHome} />
      case 'Settings':
        return <Placeholder title="Settings" blurb="Fine-tune your tide pools soon." onBack={goHome} />
      case 'Tutorial':
        return <Placeholder title="How to play" blurb="A gentle walkthrough is coming." onBack={goHome} />
      case 'Splash':
        return (
          <SplashScreen
            ready={booted}
            onDone={() => dispatch({ type: 'reset', entry: { screen: 'Home' } })}
          />
        )
    }
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-sand text-ink">
      {/* Calm cross-fade on screen change; instant under reduced-motion. */}
      <div key={screen} className="h-full w-full motion-safe:animate-[tp-fade_240ms_ease-out]">
        {renderScreen()}
      </div>
      {paused && screen === 'Gameplay' && (
        <PauseOverlay
          onResume={() => setPaused(false)}
          onNewBoard={onNewBoard}
          onRestart={onRestart}
          onSettings={onPauseSettings}
          onHome={goHome}
        />
      )}
    </main>
  )
}

function Placeholder({ title, blurb, onBack }: { title: string; blurb: string; onBack: () => void }) {
  return (
    <div className="h-full w-full grid place-items-center bg-sand text-ink">
      <div className="max-w-sm px-6 text-center">
        <h1 className="mb-2 font-display text-3xl text-deep-pool">{title}</h1>
        <p className="mb-6 text-tide">{blurb}</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-tide px-5 py-2 font-display text-foam hover:bg-deep-pool"
        >
          Back to shore
        </button>
      </div>
    </div>
  )
}
