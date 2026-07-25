import { describe, expect, it } from 'vitest'
import type { InProgressBoardRecord, JournalRecord, SettingsRecord, StatsRecord } from '@/platform'
import {
  getHomeStats,
  getLastPlay,
  getResumeSnapshot,
  loadShellPrefs,
  saveShellPrefs,
  setLastPlay,
} from './shell-store'
import { makeFakeStore, sampleInProgressRecord } from './test-helpers'

describe('shell-store: prefs', () => {
  it('defaults to Day / unmuted on a cold store', async () => {
    const store = makeFakeStore()
    expect(await loadShellPrefs(store)).toEqual({ theme: 'Day', muted: false })
  })

  it('round-trips prefs', async () => {
    const store = makeFakeStore()
    await saveShellPrefs(store, { theme: 'Night', muted: true })
    expect(await loadShellPrefs(store)).toEqual({ theme: 'Night', muted: true })
  })
})

describe('shell-store: resume snapshot', () => {
  it('is absent on cold start (no in-progress board)', async () => {
    const store = makeFakeStore()
    expect(await getResumeSnapshot(store)).toBeNull()
  })

  it('summarizes a saved in-progress board', async () => {
    const store = makeFakeStore({ inProgressBoard: sampleInProgressRecord() })
    const snap = await getResumeSnapshot(store)
    expect(snap).toEqual({
      seed: 'KELP-2231',
      size: 'Medium',
      difficulty: 'Tricky',
      poolsFilled: 3,
      marksPlaced: 3,
    })
  })

  it('treats an empty-seed record as no board', async () => {
    const empty: InProgressBoardRecord = {
      v: 1,
      request: { seed: '', size: 'Small', difficulty: 'Calm', clues: { connectivity: true, lineTotals: true } },
      marks: {},
      revealed: [],
    }
    const store = makeFakeStore({ inProgressBoard: empty })
    expect(await getResumeSnapshot(store)).toBeNull()
  })
})

describe('shell-store: last play', () => {
  it('defaults to Small / Calm', async () => {
    const store = makeFakeStore()
    expect(await getLastPlay(store)).toEqual({ size: 'Small', difficulty: 'Calm' })
  })

  it('round-trips the last-used size/difficulty', async () => {
    const store = makeFakeStore()
    await setLastPlay(store, { size: 'Large', difficulty: 'Deep' })
    expect(await getLastPlay(store)).toEqual({ size: 'Large', difficulty: 'Deep' })
  })

  it('preserves other settings when writing last play', async () => {
    const settings: SettingsRecord = {
      v: 1,
      sound: { muted: true, volume: 0.5 },
      visuals: { theme: 'Night', reducedMotion: true, textScale: 1, colorblind: false },
      controls: { swapMarkButtons: true },
      play: { defaultSize: 'Small', defaultDifficulty: 'Calm' },
    }
    const store = makeFakeStore({ settings })
    await setLastPlay(store, { size: 'Medium', difficulty: 'Tricky' })
    const back = await store.get<SettingsRecord>('tp:v1:settings')
    expect(back?.controls.swapMarkButtons).toBe(true)
    expect(back?.play).toEqual({ defaultSize: 'Medium', defaultDifficulty: 'Tricky' })
  })
})

describe('shell-store: home stats', () => {
  it('is a warm zero-state on a cold store', async () => {
    const store = makeFakeStore()
    const stats = await getHomeStats(store)
    expect(stats.boardsSolved).toBe(0)
    expect(stats.creaturesFound).toBe(0)
    expect(stats.featuredCreature).toBeNull()
    expect(stats.totalCreatures).toBeGreaterThan(0)
  })

  it('reflects solved boards and the newest creature', async () => {
    const stats: StatsRecord = { v: 1, boardsSolved: 12, poolsFilled: 40, creaturesFound: 2 }
    const journal: JournalRecord = {
      v: 1,
      discoveries: {
        limpet: { firstFoundSeed: 'A', count: 3 },
        crab: { firstFoundSeed: 'B', count: 1 },
      },
    }
    const store = makeFakeStore({ stats, journal })
    const home = await getHomeStats(store)
    expect(home.boardsSolved).toBe(12)
    expect(home.creaturesFound).toBe(2)
    expect(home.featuredCreature).toBe('Shore Crab')
  })
})
