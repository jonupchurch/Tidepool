// Achievements are derived from the save, so the tests that matter are: does a
// fresh player get nothing, does each condition fire exactly when it should, and
// — the one that would actually embarrass us — does anything unlock for free.
import { DEFAULTS } from '@/platform'
import {
  ACHIEVEMENTS,
  type AchievementState,
  achievement,
  evaluateAchievements,
  newlyEarned,
} from './achievements'
import { loadCuratedPack } from './board-source'
import { CREATURES } from './creatures'

const pack = loadCuratedPack()

/** A save with nothing in it. */
function fresh(): AchievementState {
  return {
    journal: DEFAULTS.journal(),
    stats: DEFAULTS.stats(),
    curated: DEFAULTS.curatedProgress(),
  }
}

function withCreature(state: AchievementState, id: string, count: number): AchievementState {
  return {
    ...state,
    journal: {
      ...state.journal,
      discoveries: { ...state.journal.discoveries, [id]: { firstFoundSeed: 'SEED-1', count } },
    },
  }
}

/** Mark curated entries solved, optionally recording a mistake count. */
function withSolved(state: AchievementState, ids: string[], errors?: number): AchievementState {
  const solved = { ...state.curated.solved }
  for (const id of ids) solved[id] = { earnedCreatureId: 'crab', ...(errors === undefined ? {} : { errors }) }
  return { ...state, curated: { ...state.curated, solved } }
}

describe('the catalogue', () => {
  it('has unique ids', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers every creature and every curated group', () => {
    for (const c of CREATURES) expect(achievement(`creature-${c.id}`)).toBeDefined()
    for (const g of pack.groups ?? []) expect(achievement(`group-${g.id}`)).toBeDefined()
  })

  it('gives everything a name and a description', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length).toBeGreaterThan(0)
      expect(a.description.length).toBeGreaterThan(0)
    }
  })

  it('stays within Steam’s 100-achievement limit', () => {
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(100)
  })

  it('reads as prose, article and all', () => {
    expect(achievement('creature-anemone')?.description).toContain('an anemone')
    expect(achievement('creature-crab')?.description).toContain('a shore crab')
  })
})

describe('a brand-new player', () => {
  // The failure this guards is the nasty one: an `every` over an empty list is
  // true, so a mis-specified achievement hands itself out on first launch.
  it('has earned absolutely nothing', () => {
    expect(evaluateAchievements(fresh())).toEqual([])
  })
})

describe('first steps', () => {
  it('unlocks on the first pool and the first board', () => {
    const s = fresh()
    expect(evaluateAchievements({ ...s, stats: { ...s.stats, poolsFilled: 1 } })).toContain(
      'first-pool',
    )
    expect(evaluateAchievements({ ...s, stats: { ...s.stats, boardsSolved: 1 } })).toContain(
      'first-board',
    )
  })
})

describe('journal achievements', () => {
  it('unlocks a creature the moment it is found once', () => {
    const s = withCreature(fresh(), 'crab', 1)
    expect(evaluateAchievements(s)).toContain('creature-crab')
    expect(evaluateAchievements(s)).not.toContain('creature-urchin')
  })

  it('completes only when every creature is found', () => {
    let s = fresh()
    for (const c of CREATURES.slice(0, -1)) s = withCreature(s, c.id, 1)
    expect(evaluateAchievements(s)).not.toContain('journal-complete')

    s = withCreature(s, CREATURES[CREATURES.length - 1].id, 1)
    expect(evaluateAchievements(s)).toContain('journal-complete')
  })

  it('rewards finding the same creature ten times', () => {
    expect(evaluateAchievements(withCreature(fresh(), 'crab', 9))).not.toContain('collector-10')
    expect(evaluateAchievements(withCreature(fresh(), 'crab', 10))).toContain('collector-10')
  })
})

describe('curated achievements', () => {
  const firstGroup = (pack.groups ?? [])[0]
  const firstGroupIds = pack.entries.filter((e) => e.group === firstGroup.id).map((e) => e.id)
  const allIds = pack.entries.map((e) => e.id)

  it('clears a group only when all of its shores are solved', () => {
    const partial = withSolved(fresh(), firstGroupIds.slice(0, -1))
    expect(evaluateAchievements(partial)).not.toContain(`group-${firstGroup.id}`)

    const complete = withSolved(fresh(), firstGroupIds)
    expect(evaluateAchievements(complete)).toContain(`group-${firstGroup.id}`)
  })

  it('clears the coastline only when every shore is solved', () => {
    expect(evaluateAchievements(withSolved(fresh(), allIds.slice(0, -1)))).not.toContain(
      'curated-complete',
    )
    expect(evaluateAchievements(withSolved(fresh(), allIds))).toContain('curated-complete')
  })

  it('needs a genuinely clean run for the flawless awards', () => {
    const messy = withSolved(fresh(), allIds, 3)
    expect(evaluateAchievements(messy)).not.toContain('flawless-shore')
    expect(evaluateAchievements(messy)).not.toContain('flawless-coast')

    const clean = withSolved(fresh(), allIds, 0)
    expect(evaluateAchievements(clean)).toContain('flawless-shore')
    expect(evaluateAchievements(clean)).toContain('flawless-coast')
  })

  it('does not call a shore flawless when mistakes were never recorded', () => {
    // Entries solved before mistake tracking existed have no `errors` field. We
    // don't know how they went, and guessing in the player's favour would put a
    // "no mistakes" award next to a run that may have been full of them.
    const unknown = withSolved(fresh(), allIds)
    expect(evaluateAchievements(unknown)).not.toContain('flawless-shore')
    expect(evaluateAchievements(unknown)).not.toContain('flawless-coast')
  })

  it('one clean shore among messy ones still earns Clean Water', () => {
    let s = withSolved(fresh(), allIds.slice(1), 2)
    s = withSolved(s, [allIds[0]], 0)
    expect(evaluateAchievements(s)).toContain('flawless-shore')
    expect(evaluateAchievements(s)).not.toContain('flawless-coast')
  })
})

describe('volume achievements', () => {
  it('unlock at their thresholds and not before', () => {
    const at = (boardsSolved: number) => {
      const s = fresh()
      return evaluateAchievements({ ...s, stats: { ...s.stats, boardsSolved } })
    }
    expect(at(9)).not.toContain('boards-10')
    expect(at(10)).toContain('boards-10')
    expect(at(49)).not.toContain('boards-50')
    expect(at(50)).toContain('boards-50')
    expect(at(200)).toContain('boards-200')
    // Lower tiers stay earned at a higher count.
    expect(at(200)).toContain('boards-10')
  })

  it('counts pools separately from boards', () => {
    const s = fresh()
    const many = { ...s, stats: { ...s.stats, poolsFilled: 100 } }
    expect(evaluateAchievements(many)).toContain('pools-100')
    expect(evaluateAchievements(many)).not.toContain('boards-10')
  })
})

describe('newlyEarned', () => {
  it('reports only what Steam has not already been told', () => {
    const s = { ...fresh(), stats: { ...fresh().stats, poolsFilled: 1, boardsSolved: 1 } }
    expect(newlyEarned(s, [])).toEqual(['first-pool', 'first-board'])
    expect(newlyEarned(s, ['first-pool'])).toEqual(['first-board'])
    expect(newlyEarned(s, ['first-pool', 'first-board'])).toEqual([])
  })

  // The offline case this whole design exists for: earn something with Steam
  // unreachable, and it still gets pushed on the next launch.
  it('re-offers an achievement that was earned while Steam was unavailable', () => {
    const s = { ...fresh(), stats: { ...fresh().stats, boardsSolved: 10 } }
    const pushed: string[] = [] // Steam never received anything
    expect(newlyEarned(s, pushed)).toContain('boards-10')
  })
})
