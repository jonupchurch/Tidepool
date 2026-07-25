// useTheme.ts — resolve the theme setting to the `data-theme` attribute the
// token sheet keys off. 'Auto' follows the OS via matchMedia and keeps
// following it, so a player who changes their system theme mid-session sees the
// app follow without a reload. Falls back to Daylight wherever there's no OS
// signal (older webviews, SSR, tests).
import { useEffect } from 'react'
import type { ThemeChoice } from '@/game'

/** What actually gets rendered, once 'Auto' has been resolved. */
export type ResolvedTheme = 'day' | 'night'

const QUERY = '(prefers-color-scheme: dark)'

/** Does the OS currently ask for dark? False wherever we can't tell. */
export function prefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia(QUERY).matches
  } catch {
    return false
  }
}

/** The theme a choice resolves to right now. */
export function resolveTheme(choice: ThemeChoice, osDark = prefersDark()): ResolvedTheme {
  if (choice === 'Night') return 'night'
  if (choice === 'Day') return 'day'
  return osDark ? 'night' : 'day'
}

/**
 * Stamp the resolved theme on the document root, re-resolving whenever the
 * choice changes or — under 'Auto' — the OS preference does.
 */
export function useTheme(choice: ThemeChoice): void {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const apply = () => {
      document.documentElement.setAttribute('data-theme', resolveTheme(choice))
    }
    apply()

    if (choice !== 'Auto') return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    let mq: MediaQueryList
    try {
      mq = window.matchMedia(QUERY)
    } catch {
      return
    }
    // `addEventListener` is the modern form; older WebKit only has addListener.
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
    mq.addListener?.(apply)
    return () => mq.removeListener?.(apply)
  }, [choice])
}
