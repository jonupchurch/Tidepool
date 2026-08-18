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
    expect(await getLastPlay(store)).toEqual({
      size: 'Small',
      difficulty: 'Calm',
      shore: 'hex',
      edgeHints: false,
      evenOdd: false,
    })
  })

  it('round-trips the last-used size/difficulty', async () => {
    const store = makeFakeStore()
    const last = {
      size: 'Large', difficulty: 'Deep', shore: 'Any', edgeHints: true, evenOdd: true,
    } as const
    await setLastPlay(store, last)
    expect(await getLastPlay(store)).toEqual(last)
  })

  /**
   * Regression (018): every play choice must survive the round trip through the
   * persisted record. `evenOdd` was added to the settings *model* but not to the
   * persisted *schema*, so the switch on Home reset itself the moment the player
   * left the screen — the value was written into a field the record type did not
   * have. These assert each field individually, which is what would have caught
   * it: the whole-object `toEqual` tests above passed happily, because both
   * sides of the comparison were missing the same field.
   */
  it('round-trips every play choice individually', async () => {
    const store = makeFakeStore()
    await setLastPlay(store, {
      size: 'Large', difficulty: 'Deep', shore: 'atoll', edgeHints: true, evenOdd: true,
    })
    const got = await getLastPlay(store)
    expect(got.size).toBe('Large')
    expect(got.difficulty).toBe('Deep')
    expect(got.shore).toBe('atoll')
    expect(got.edgeHints).toBe(true)
    expect(got.evenOdd).toBe(true)
  })

  it('turns a play choice back off again', async () => {
    // Silence must be expressible: writing `false` has to persist as `false`,
    // not fall back to a default that happens to match.
    const store = makeFakeStore()
    const on = {
      size: 'Large' as const, difficulty: 'Deep' as const, shore: 'hex' as const,
      edgeHints: true, evenOdd: true,
    }
    await setLastPlay(store, on)
    await setLastPlay(store, { ...on, evenOdd: false })
    expect((await getLastPlay(store)).evenOdd).toBe(false)
  })

  it('preserves other settings when writing last play', async () => {
    const settings: SettingsRecord = {
      v: 1,
      sound: { muted: true, volume: 0.5 },
      visuals: { theme: 'Night', reducedMotion: true, textScale: 1, colorblind: false },
      controls: { swapMarkButtons: true },
      play: { defaultSize: 'Small', defaultDifficulty: 'Calm', stopwatch: true },
    }
    const store = makeFakeStore({ settings })
    await setLastPlay(store, {
      size: 'Medium',
      difficulty: 'Tricky',
      shore: 'crescent',
      edgeHints: false,
      evenOdd: false,
    })
    const back = await store.get<SettingsRecord>('tp:v1:settings')
    expect(back?.controls.swapMarkButtons).toBe(true)
    expect(back?.play).toEqual({
      defaultSize: 'Medium',
      defaultDifficulty: 'Tricky',
      // `stopwatch` is owned by Settings (006) and is not the shell's to clear.
      // This used to rebuild `play` from scratch, so every Play silently reset
      // it — and would have reset the shore fields on the very press that set
      // them.
      stopwatch: true,
      defaultShore: 'crescent',
      edgeHints: false,
      evenOdd: false,
    })
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
    const stats: StatsRecord = {
      v: 2,
      boardsSolved: 12,
      poolsFilled: 40,
      creaturesFound: 2,
      boardsPerfect: 5,
      perfectSeeded: true,
    }
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
