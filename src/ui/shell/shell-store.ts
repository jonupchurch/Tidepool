// shell-store.ts — the shell's persistence adapter over the SaveStore seam (008).
// Reads/writes shell prefs, the last-used play request, and derives the resume
// snapshot + Home stats from persisted records. Never touches localStorage
// directly (enforced by platform's no-direct-storage guard). The shell owns none
// of this data — it reads records other features own and applies the choices.
import type { DifficultyTier, SizeTier } from '@/core'
import { DIFFICULTY_TIERS, SIZE_TIERS } from '@/core'
import { CREATURES, creatureDef } from '@/game'
import { DEFAULT_SHORE, isShoreChoice, loadCuratedPack } from '@/game/board-source'
import { type SaveStore, loadRecord, saveRecord } from '@/platform'
import type { HomeStats, LastPlay, ResumeSnapshot, StoredShellPrefs, Theme } from './types'

const asTheme = (x: string): Theme => (x === 'Night' ? 'Night' : 'Day')
const asSize = (x: string): SizeTier =>
  (SIZE_TIERS as readonly string[]).includes(x) ? (x as SizeTier) : 'Small'
const asDifficulty = (x: string): DifficultyTier =>
  (DIFFICULTY_TIERS as readonly string[]).includes(x) ? (x as DifficultyTier) : 'Calm'

// ── Shell prefs (theme + mute) — owned by 003 ─────────────────────────────────

export async function loadShellPrefs(store: SaveStore): Promise<StoredShellPrefs> {
  const rec = await loadRecord(store, 'shellPrefs')
  return { theme: asTheme(rec.theme), muted: rec.muted }
}

export async function saveShellPrefs(store: SaveStore, prefs: StoredShellPrefs): Promise<void> {
  await saveRecord(store, 'shellPrefs', { v: 1, theme: prefs.theme, muted: prefs.muted })
}

// ── Last-used play request — read/written on the Settings record (008/006) ────

export async function getLastPlay(store: SaveStore): Promise<LastPlay> {
  const s = await loadRecord(store, 'settings')
  return {
    size: asSize(s.play.defaultSize),
    difficulty: asDifficulty(s.play.defaultDifficulty),
    // Coerced rather than trusted: an unknown shore would reach `generateBoard`,
    // which refuses a shape its catalog doesn't claim.
    shore: isShoreChoice(s.play.defaultShore) ? s.play.defaultShore : DEFAULT_SHORE,
    edgeHints: s.play.edgeHints === true,
    evenOdd: s.play.evenOdd === true,
  }
}

export async function setLastPlay(store: SaveStore, lastPlay: LastPlay): Promise<void> {
  const s = await loadRecord(store, 'settings')
  await saveRecord(store, 'settings', {
    ...s,
    // Spread `s.play`, don't rebuild it. This wrote a bare three-field object
    // and so silently dropped `stopwatch` on every Play — a setting owned by
    // 006 that the shell has no business clearing. With the 016 shore fields
    // it would have dropped those too, on the very press that sets them.
    play: {
      ...s.play,
      defaultSize: lastPlay.size,
      defaultDifficulty: lastPlay.difficulty,
      defaultShore: lastPlay.shore,
      edgeHints: lastPlay.edgeHints,
      // 018. Written and read back like every other play default — without it
      // the switch on Home reset itself the moment you left the screen.
      evenOdd: lastPlay.evenOdd === true,
    },
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
  const [stats, journal, curated] = await Promise.all([
    loadRecord(store, 'stats'),
    loadRecord(store, 'journal'),
    loadRecord(store, 'curatedProgress'),
  ])
  const foundIds = Object.keys(journal.discoveries)
  // Insertion order is preserved, so the last key is the most-recent discovery.
  const newest = foundIds.length ? foundIds[foundIds.length - 1] : null
  const pack = loadCuratedPack()
  const packIds = new Set(pack.entries.map((e) => e.id))
  return {
    boardsSolved: stats.boardsSolved,
    creaturesFound: foundIds.length || stats.creaturesFound,
    totalCreatures: CREATURES.length,
    featuredCreature: newest ? (creatureDef(newest)?.name ?? null) : null,
    // Count only entries the shipped pack still contains, so progress from a
    // retired board can't push the tally past the total.
    curatedSolved: Object.keys(curated.solved).filter((id) => packIds.has(id)).length,
    curatedTotal: pack.entries.length,
  }
}
