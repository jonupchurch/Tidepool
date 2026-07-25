// nav.ts — the pure navigation model: a bounded history stack of screen entries
// plus a reducer. No DOM, no React — the tested unit behind AppShell.
import type { GameplayLaunch, Screen } from './types'

// stub — implemented in Phase 2 (T005)
export interface NavEntry {
  screen: Screen
  launch?: GameplayLaunch
}

export interface NavState {
  stack: NavEntry[]
}

export type NavAction =
  | { type: 'navigate'; entry: NavEntry }
  | { type: 'back' }
  | { type: 'reset'; entry: NavEntry }

export function navReducer(state: NavState, _action: NavAction): NavState {
  return state
}

export function current(state: NavState): NavEntry {
  return state.stack[state.stack.length - 1]
}
