// types.ts — the shell's shared vocabulary: the screen set the app navigates
// between, the persisted shell prefs (theme + mute), the resume snapshot Home
// reads from persistence, and the launch descriptor handed to Gameplay.
// Pure types only — no runtime, no DOM.
import type { BoardParams, DifficultyTier, SizeTier } from '@/core'

/** Every top-level view the shell can show. Only Home/Gameplay/Splash are fully
 *  built in this feature; Curated/Journal/Settings/Tutorial render warm
 *  placeholders until their owning features (004/005/006/007) land. */
export type Screen = 'Splash' | 'Home' | 'Gameplay' | 'Curated' | 'Journal' | 'Tutorial' | 'About'

/** Day / Night Tide. Token *values* are owned by Settings (006); the shell only
 *  stores the choice and applies it via a `data-theme` attribute. */
export type Theme = 'Day' | 'Night'

/** Persisted, applied app-wide: the theme choice + global mute. */
export interface ShellPrefs {
  theme: Theme
  muted: boolean
}

/** The size/difficulty a fresh Play uses — the "last-used" board request. */
export interface LastPlay {
  size: SizeTier
  difficulty: DifficultyTier
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
