// useSettings.ts — the React binding for the settings store. `useSyncExternalStore`
// keeps every screen reading the same live value, so a change applies everywhere
// at once without prop-drilling or a context provider.
//
// There is no Settings screen: Home's mute + theme toggles are the whole surface,
// and everything else takes its default. The comfort/accessibility fields stay in
// the model because gameplay reads them, and because the OS-preference overlay
// below is what actually drives reduce-motion today.
import { useSyncExternalStore } from 'react'
import { type Settings, getSettings, subscribeSettings } from '@/game'
import { usePrefersReducedMotion } from '@/ui/shell/use-reduced-motion'

/** The live settings. Re-renders the caller whenever any setting changes. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings)
}

/**
 * Settings with the OS accessibility preferences folded in. With no Settings
 * screen to tick, honouring `prefers-reduced-motion` from the system is what
 * keeps the game usable for players who need it — the setting can still force
 * it on, but the OS alone is enough.
 */
export function useEffectiveSettings(): Settings {
  const s = useSettings()
  const osReducedMotion = usePrefersReducedMotion()
  if (!osReducedMotion || s.visuals.reducedMotion) return s
  return { ...s, visuals: { ...s.visuals, reducedMotion: true } }
}
