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
import { getAudioEngine } from '@/audio'
import { hydrateSettings, seedPerfectFromCurated, setSetting } from '@/game'
import { type SaveStore, getSaveStore } from '@/platform'
import { AboutScreen } from '@/ui/about/AboutScreen'
import { CuratedScreen } from '@/ui/curated/CuratedScreen'
import { GameplayScreen } from '@/ui/gameplay/GameplayScreen'
import { JournalScreen } from '@/ui/journal/JournalScreen'
import { useSettings } from '@/ui/settings/useSettings'
import { resolveTheme, useTheme } from '@/ui/theme/useTheme'
import { HowToPlayScreen } from '@/ui/tutorial/HowToPlayScreen'
import { HomeScreen } from './HomeScreen'
import { PauseOverlay } from './PauseOverlay'
import { SplashScreen } from './SplashScreen'
import { boardRequest, freshSeed } from './board-request'
import { current, initialNav, navReducer } from './nav'
import {
  getHomeStats,
  getLastPlay,
  getResumeSnapshot,
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
  // Theme + mute are settings (006 owns them), not a second shell-local copy —
  // the two used to be stored twice and could disagree. Home's quick toggles
  // and the Settings screen now write to the same place.
  const settings = useSettings()
  const prefs: ShellPrefs = {
    theme: resolveTheme(settings.visuals.theme) === 'night' ? 'Night' : 'Day',
    muted: settings.sound.muted,
    music: settings.sound.music,
  }
  // The audio engine is owned HERE, not by Gameplay. Sound effects only ever
  // fire on a board, so Gameplay used to configure the engine — but the ambient
  // bed has to survive navigation and start on the first interaction anywhere,
  // and neither is possible from a screen that unmounts (014 FR-005/FR-006).
  useEffect(() => {
    const audio = getAudioEngine()
    audio.setMuted(settings.sound.muted)
    audio.setVolume(settings.sound.volume)
    audio.setSfxVolume(settings.sound.sfx)
    audio.setMusicVolume(settings.sound.ambient)
    audio.setMusicEnabled(settings.sound.music)
  }, [
    settings.sound.muted,
    settings.sound.volume,
    settings.sound.sfx,
    settings.sound.ambient,
    settings.sound.music,
  ])

  // Autoplay policy: audio may only begin inside a user gesture. Any first
  // interaction counts, so listen at the root rather than waiting for a board.
  useEffect(() => {
    const unlock = () => getAudioEngine().unlock()
    const opts = { once: true, passive: true } as const
    window.addEventListener('pointerdown', unlock, opts)
    window.addEventListener('keydown', unlock, opts)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])
  useTheme(settings.visuals.theme)
  // High contrast is a second axis on top of the theme — the token sheet keys
  // off both, so either theme can be firmed up without a separate palette.
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-high-contrast',
      settings.visuals.highContrast ? 'on' : 'off',
    )
  }, [settings.visuals.highContrast])
  const [lastPlay, setLastPlay] = useState<LastPlay>({ size: 'Small', difficulty: 'Calm' })
  const [resume, setResume] = useState<ResumeSnapshot | null>(null)
  const [stats, setStats] = useState<HomeStats>(DEFAULT_STATS)
  const [paused, setPaused] = useState(false)
  const [booted, setBooted] = useState(false)
  const [launchKey, setLaunchKey] = useState(0)
  const [curatedRows, setCuratedRows] = useState<CuratedRow[]>([])

  const entry = current(nav)
  const screen = entry.screen

  // Boot: hydrate settings (theme applies as soon as they land) + the last-used
  // play request, then release the splash.
  useEffect(() => {
    void (async () => {
      await hydrateSettings(store)
      // One-time (self-flagging) backfill of the perfect-solve total from
      // curated progress, so a player upgrading with clean solves already on
      // record doesn't meet a zero. No-op on every boot after the first.
      await seedPerfectFromCurated(store)
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

  // Home's quick toggles write to the same settings the Settings screen does.
  // The quick toggle is a two-way switch, so it commits an explicit Day/Night —
  // 'Auto' stays reachable from Settings, where it can be explained.
  const changePrefs = useCallback((next: ShellPrefs) => {
    setSetting('visuals', 'theme', next.theme === 'Night' ? 'Night' : 'Day')
    setSetting('sound', 'muted', next.muted)
    setSetting('sound', 'music', next.music)
  }, [])

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
            // Offered only on the curated ladder — there's no map to go back to
            // from an Endless board.
            onCurated={curatedId ? () => navigate('Curated') : undefined}
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
      case 'Tutorial':
        return (
          <HowToPlayScreen
            onBack={goHome}
            onPlay={() => onPlay(boardRequest(freshSeed(), lastPlay.size, lastPlay.difficulty))}
          />
        )
      case 'About':
        return <AboutScreen onBack={goHome} />
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
          onHome={goHome}
          music={prefs.music}
          onMusicChange={(music) => setSetting('sound', 'music', music)}
        />
      )}
    </main>
  )
}
