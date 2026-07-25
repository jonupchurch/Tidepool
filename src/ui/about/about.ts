// about.ts — the game's identity strings, in one place. Pure data: the About
// screen renders these, and nothing else in the app should hard-code them.
//
// The copyright year is deliberately a fixed constant, not `new Date()`. A
// copyright year marks publication, so it shouldn't drift with the wall clock —
// and a build that changes with the date would break this repo's determinism
// habit. Bump it on a release that warrants it.

/** Player-facing version. Bump alongside `package.json` (guarded by a test). */
export const VERSION = '1.0.1'

/** Who made it. */
export const STUDIO = 'Gravytraining'

/** Year of publication. */
export const COPYRIGHT_YEAR = 2026

/** The single credit line shown on the About screen. */
export const CREDIT = `A game by ${STUDIO}, copyright ${COPYRIGHT_YEAR}`
