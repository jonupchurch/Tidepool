// shell-store.ts — the shell's persistence adapter over the SaveStore seam (008).
// Reads/writes shell prefs, the last-used play request, and derives the resume
// snapshot + Home stats from persisted records. Never touches localStorage
// directly (enforced by platform's no-direct-storage guard).
import type { HomeStats, LastPlay, ResumeSnapshot, ShellPrefs } from './types'
import type { SaveStore } from '@/platform'

// stub — implemented in Phase 2 (T007) + US2 (T020)
export async function loadShellPrefs(_store: SaveStore): Promise<ShellPrefs> {
  return { theme: 'Day', muted: false }
}

export async function saveShellPrefs(_store: SaveStore, _prefs: ShellPrefs): Promise<void> {}

export async function getResumeSnapshot(_store: SaveStore): Promise<ResumeSnapshot | null> {
  return null
}

export async function getLastPlay(_store: SaveStore): Promise<LastPlay> {
  return { size: 'Small', difficulty: 'Calm' }
}

export async function setLastPlay(_store: SaveStore, _lastPlay: LastPlay): Promise<void> {}

export async function getHomeStats(_store: SaveStore): Promise<HomeStats> {
  return { boardsSolved: 0, creaturesFound: 0, totalCreatures: 0, featuredCreature: null }
}
