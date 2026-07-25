// useSettings.ts — the React binding for the settings store. `useSyncExternalStore`
// keeps every screen reading the same live value, so a change in Settings applies
// everywhere at once without prop-drilling or a context provider.
import { useSyncExternalStore } from 'react'
import { type Settings, getSettings, subscribeSettings } from '@/game'

/** The live settings. Re-renders the caller whenever any setting changes. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings)
}
