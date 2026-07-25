// HomeScreen.tsx — the warm shoreline landing. Aggregates Play, the Endless
// picker, seed entry, secondary entries, resume card, stats, and the global
// toggles. Accretes across US1 (play), US2 (resume + stats), US5 (toggles).
import type { BoardParams } from '@/core'
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

export function HomeScreen(_props: HomeScreenProps) {
  return null
}
