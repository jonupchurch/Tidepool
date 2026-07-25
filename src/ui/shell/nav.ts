// nav.ts — the pure navigation model: a bounded history stack of screen entries
// plus a reducer. No DOM, no React — the tested unit behind AppShell. Guards
// against duplicate/stuck transitions on rapid double-activation and never lets
// history grow unbounded or empty.
import type { GameplayLaunch, Screen } from './types'

export interface NavEntry {
  screen: Screen
  /** Present only for Gameplay: how to open the board. */
  launch?: GameplayLaunch
}

export interface NavState {
  /** Non-empty; the last entry is the active screen. */
  stack: NavEntry[]
}

export type NavAction =
  | { type: 'navigate'; entry: NavEntry }
  | { type: 'back' }
  | { type: 'reset'; entry: NavEntry }

/** Cap on retained history — deep enough for any real path, bounded for safety. */
const MAX_HISTORY = 24

/** A fresh nav state rooted at `screen`. */
export function initialNav(screen: Screen): NavState {
  return { stack: [{ screen }] }
}

/** The active entry. */
export function current(state: NavState): NavEntry {
  return state.stack[state.stack.length - 1]
}

/** Two entries are "the same destination" — screen matches, and for Gameplay the
 *  launch (seed + resume) matches too. Used to collapse double-activation. */
function sameEntry(a: NavEntry, b: NavEntry): boolean {
  if (a.screen !== b.screen) return false
  if (a.launch || b.launch) {
    return a.launch?.resume === b.launch?.resume && a.launch?.params.seed === b.launch?.params.seed
  }
  return true
}

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'navigate': {
      // Rapid double-activation must not push a duplicate or a stuck transition.
      if (sameEntry(current(state), action.entry)) return state
      const stack = [...state.stack, action.entry]
      if (stack.length > MAX_HISTORY) stack.splice(0, stack.length - MAX_HISTORY)
      return { stack }
    }
    case 'back': {
      // Never empty the stack — back at the root stays put.
      if (state.stack.length <= 1) return state
      return { stack: state.stack.slice(0, -1) }
    }
    case 'reset':
      return { stack: [action.entry] }
  }
}
