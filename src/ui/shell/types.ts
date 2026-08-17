// types.ts — the shell's shared vocabulary: the screen set the app navigates
// between, the persisted shell prefs (theme + mute), the resume snapshot Home
// reads from persistence, and the launch descriptor handed to Gameplay.
// Pure types only — no runtime, no DOM.
import type { BoardParams, DifficultyTier, SizeTier } from '@/core'
import type { ShoreChoice } from '@/game/board-source'

/** Every top-level view the shell can show. Only Home/Gameplay/Splash are fully
 *  built in this feature; Curated/Journal/Settings/Tutorial render warm
 *  placeholders until their owning features (004/005/006/007) land. */
export type Screen = 'Splash' | 'Home' | 'Gameplay' | 'Curated' | 'Journal' | 'Tutorial' | 'About'

/** Day / Night Tide. Token *values* are owned by Settings (006); the shell only
 *  stores the choice and applies it via a `data-theme` attribute. */
export type Theme = 'Day' | 'Night'

/** Persisted, applied app-wide: the theme choice + global mute. */
/**
 * The 003-era persisted shell-prefs shape. Superseded by settings (006), which
 * is now the single source of truth for theme and sound — these accessors sit on
 * no live path. Kept as its own type so `ShellPrefs` can grow without dragging
 * new fields into a legacy record nothing reads.
 */
export interface StoredShellPrefs {
  theme: Theme
  muted: boolean
}

export interface ShellPrefs {
  theme: Theme
  /** Master switch — silences everything, music included. */
  muted: boolean
  /** The ambient bed alone, independent of `muted` (014). */
  music: boolean
  /** The sound effects alone, independent of `muted` and of `music` (017). */
  effects: boolean
}

/** The selection a fresh Play uses — the "last-used" board request. */
export interface LastPlay {
  size: SizeTier
  difficulty: DifficultyTier
  /** Silhouette choice (016) — `hex` by default, `Any` derives from the seed. */
  shore: ShoreChoice
  /** `{n}` / `-n-` on row totals (016). Only bites at Deep. */
  edgeHints: boolean
  /** `+` / `|` parity clues (018). Also only bites at Deep. Optional so a
   *  caller that predates it still compiles. */
  evenOdd?: boolean
}

/** Home's summary of an in-progress board (read from persistence 008). Present
 *  iff a real saved board exists. No live board thumbnail — a decorative
 *  preview keeps the shell free of the engine/renderer. */
export interface ResumeSnapshot {
  seed: string
  size: SizeTier
  difficulty: DifficultyTier
  /** Pools already filled (revealed) in the saved board. */
  poolsFilled: number
  /** Cells the player has marked so far. */
  marksPlaced: number
}

/** The light stats Home surfaces (sourced from persistence/journal). */
export interface HomeStats {
  boardsSolved: number
  creaturesFound: number
  totalCreatures: number
  /** A creature name to celebrate on Home, or null when none found yet. */
  featuredCreature: string | null
  /** Curated shores solved, and how many the shipped pack holds. */
  curatedSolved: number
  curatedTotal: number
}

/** How Gameplay should open. `resume: true` restores the saved in-progress
 *  board; otherwise a fresh board is generated from `params`. `curatedId` marks
 *  a curated launch so completion records against that entry (004/US2). */
export interface GameplayLaunch {
  params: BoardParams
  resume: boolean
  curatedId?: string
}
