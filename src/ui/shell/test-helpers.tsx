// test-helpers.tsx — shell test utilities: a thin RTL render wrapper, an
// in-memory fake SaveStore that tests can pre-seed per namespace, and sample
// fixtures (prefs, resume snapshot, last-play, in-progress record).
import { type RenderResult, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { InProgressBoardRecord, Namespace, SaveStore } from '@/platform'
import { keyFor } from '@/platform'
import type { LastPlay, ResumeSnapshot, ShellPrefs } from './types'

/** Render a shell surface. (No providers yet — kept as a seam for future ones.) */
export function renderShell(ui: ReactElement): RenderResult {
  return render(ui)
}

/** A minimal in-memory SaveStore for tests. `seed` pre-populates namespace
 *  records (stored under their real `tp:v{N}:{ns}` keys). */
export function makeFakeStore(seed: Partial<Record<Namespace, unknown>> = {}): SaveStore {
  const map = new Map<string, unknown>()
  for (const [ns, value] of Object.entries(seed)) {
    map.set(keyFor(ns as Namespace), value)
  }
  return {
    async get<T>(key: string): Promise<T | null> {
      return (map.has(key) ? (map.get(key) as T) : null)
    },
    async set<T>(key: string, value: T): Promise<void> {
      map.set(key, value)
    },
    async remove(key: string): Promise<void> {
      map.delete(key)
    },
    async exportAll() {
      return { appVersion: '0.0.0', schemaVersion: 1, records: {} }
    },
    async importAll() {
      return { ok: true as const }
    },
  }
}

export const sampleShellPrefs: ShellPrefs = { theme: 'Day', muted: false, music: true, effects: true }

export const sampleLastPlay: LastPlay = {
  size: 'Medium',
  difficulty: 'Tricky',
  shore: 'hex',
  edgeHints: false,
}

export const sampleResumeSnapshot: ResumeSnapshot = {
  seed: 'KELP-2231',
  size: 'Medium',
  difficulty: 'Tricky',
  poolsFilled: 3,
  marksPlaced: 14,
}

/** A saved in-progress board record for seeding the fake store. */
export function sampleInProgressRecord(): InProgressBoardRecord {
  return {
    v: 1,
    request: {
      seed: 'KELP-2231',
      size: 'Medium',
      difficulty: 'Tricky',
      clues: { connectivity: true, lineTotals: true },
    },
    marks: { '0,0': 'water', '1,0': 'rock', '0,1': 'water' },
    revealed: ['0,0', '2,-1', '3,0'],
  }
}
