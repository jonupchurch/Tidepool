// shell-store.ts — the shell's persistence adapter over the SaveStore seam (008).
// Reads/writes shell prefs, the last-used play request, and derives the resume
// snapshot + Home stats from persisted records. Never touches localStorage
// directly (enforced by platform's no-direct-storage guard). The shell owns none
// of this data — it reads records other features own and applies the choices.
import type { DifficultyTier, SizeTier } from '@/core'
import { DIFFICULTY_TIERS, SIZE_TIERS } from '@/core'
import { CREATURES, creatureDef } from '@/game'
import { type SaveStore, loadRecord, saveRecord } from '@/platform'
import type { HomeStats, LastPlay, ResumeSnapshot, ShellPrefs, Theme } from './types'

const asTheme = (x: string): Theme => (x === 'Night' ? 'Night' : 'Day')
const asSize = (x: string): SizeTier =>
  (SIZE_TIERS as readonly string[]).includes(x) ? (x as SizeTier) : 'Small'
const asDifficulty = (x: string): DifficultyTier =>
  (DIFFICULTY_TIERS as readonly string[]).includes(x) ? (x as DifficultyTier) : 'Calm'

// ── Shell prefs (theme + mute) — owned by 003 ─────────────────────────────────

export async function loadShellPrefs(store: SaveStore): Promise<ShellPrefs> {
  const rec = await loadRecord(store, 'shellPrefs')
  return { theme: asTheme(rec.theme), muted: rec.muted }
}

export async function saveShellPrefs(store: SaveStore, prefs: ShellPrefs): Promise<void> {
  await saveRecord(store, 'shellPrefs', { v: 1, theme: prefs.theme, muted: prefs.muted })
}

// ── Last-used play request — read/written on the Settings record (008/006) ────

export async function getLastPlay(store: SaveStore): Promise<LastPlay> {
  const s = await loadRecord(store, 'settings')
  return { size: asSize(s.play.defaultSize), difficulty: asDifficulty(s.play.defaultDifficulty) }
}

export async function setLastPlay(store: SaveStore, lastPlay: LastPlay): Promise<void> {
  const s = await loadRecord(store, 'settings')
  await saveRecord(store, 'settings', {
    ...s,
    play: { defaultSize: lastPlay.size, defaultDifficulty: lastPlay.difficulty },
  })
}

// ── Resume snapshot — derived from the in-progress board record (008) ─────────

export async function getResumeSnapshot(store: SaveStore): Promise<ResumeSnapshot | null> {
  const rec = await loadRecord(store, 'inProgressBoard')
  // Empty seed = the default/absent record → no board to resume.
  if (!rec.request.seed) return null
  return {
    seed: rec.request.seed,
    size: rec.request.size,
    difficulty: rec.request.difficulty,
    poolsFilled: rec.revealed.length,
    marksPlaced: Object.keys(rec.marks).length,
  }
}

// ── Home stats — from stats (008) + the journal (005), with the creature table ─

export async function getHomeStats(store: SaveStore): Promise<HomeStats> {
  const [stats, journal] = await Promise.all([
    loadRecord(store, 'stats'),
    loadRecord(store, 'journal'),
  ])
  const foundIds = Object.keys(journal.discoveries)
  // Insertion order is preserved, so the last key is the most-recent discovery.
  const newest = foundIds.length ? foundIds[foundIds.length - 1] : null
  return {
    boardsSolved: stats.boardsSolved,
    creaturesFound: foundIds.length || stats.creaturesFound,
    totalCreatures: CREATURES.length,
    featuredCreature: newest ? (creatureDef(newest)?.name ?? null) : null,
  }
}
