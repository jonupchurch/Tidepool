// achievements.ts — what the player has earned, derived from what's been saved.
//
// This is a *pure function over persisted state*, not a stream of events, and
// that shape is the whole point:
//
//   - A player who earns something offline still gets it on next launch, because
//     the answer is recomputed from the save rather than fired once and lost.
//   - Adding an achievement later unlocks it retroactively for players who
//     already met the condition — no backfill, no migration.
//   - Steam becomes a thin adapter at one call site: diff this against what
//     Steam already has and push the difference.
//
// It deliberately knows nothing about Steam, the platform seam, or React.
import {
  type CuratedManifest,
  loadCuratedPack,
} from './board-source'
import { CREATURES } from './creatures'
import type { CuratedProgressRecord, JournalRecord, StatsRecord } from '@/platform'

/** Everything an achievement is allowed to look at. */
export interface AchievementState {
  journal: JournalRecord
  stats: StatsRecord
  curated: CuratedProgressRecord
}

export interface Achievement {
  /** Stable id — this is what gets registered with Steam. Never reuse or
   *  repurpose one: a player who earned it keeps it forever. */
  id: string
  name: string
  description: string
  /** Groups the list for display; not meaningful to Steam. */
  category: 'First steps' | 'Journal' | 'Curated' | 'Volume' | 'Collector'
  earned(state: AchievementState): boolean
}

// ── Helpers over the saved records ───────────────────────────────────────────

/** How many of `creatureId` the player has found. */
function found(state: AchievementState, creatureId: string): number {
  return state.journal.discoveries[creatureId]?.count ?? 0
}

/** Curated entry ids the player has solved. */
function solvedIds(state: AchievementState): string[] {
  return Object.keys(state.curated.solved)
}

/**
 * Was this entry solved cleanly? `errors` is absent on records written before
 * mistakes were tracked — those are deliberately NOT treated as flawless, since
 * we genuinely don't know and quietly granting it would be a lie.
 */
function flawless(state: AchievementState, id: string): boolean {
  return state.curated.solved[id]?.errors === 0
}

// ── The catalogue ────────────────────────────────────────────────────────────

function buildCatalog(pack: CuratedManifest): Achievement[] {
  const groups = pack.groups ?? []
  const entriesIn = (groupId: string) => pack.entries.filter((e) => e.group === groupId)
  const allEntryIds = pack.entries.map((e) => e.id)

  const list: Achievement[] = [
    {
      id: 'first-pool',
      name: 'First Pool',
      description: 'Fill your first pool.',
      category: 'First steps',
      earned: (s) => s.stats.poolsFilled >= 1,
    },
    {
      id: 'first-board',
      name: 'Low Tide',
      description: 'Solve your first board.',
      category: 'First steps',
      earned: (s) => s.stats.boardsSolved >= 1,
    },
  ]

  // One per creature, in catalogue order, so the Journal and this list agree.
  for (const c of CREATURES) {
    list.push({
      id: `creature-${c.id}`,
      name: c.name,
      description: `Find ${aOrAn(c.name)} for your journal.`,
      category: 'Journal',
      earned: (s) => found(s, c.id) >= 1,
    })
  }

  list.push({
    id: 'journal-complete',
    name: 'Full Shore Journal',
    description: `Find all ${CREATURES.length} creatures.`,
    category: 'Journal',
    earned: (s) => CREATURES.every((c) => found(s, c.id) >= 1),
  })

  // One per curated group, in the order they appear on the map.
  for (const g of [...groups].sort((a, b) => a.order - b.order)) {
    const ids = entriesIn(g.id).map((e) => e.id)
    list.push({
      id: `group-${g.id}`,
      name: g.name,
      description: `Clear every shore in ${g.name}.`,
      category: 'Curated',
      // A group with no entries must never auto-unlock — `every` over an empty
      // list is true, which would hand out an achievement for nothing.
      earned: (s) => ids.length > 0 && ids.every((id) => id in s.curated.solved),
    })
  }

  list.push(
    {
      id: 'curated-complete',
      name: 'The Whole Coastline',
      description: `Clear all ${allEntryIds.length} curated shores.`,
      category: 'Curated',
      earned: (s) =>
        allEntryIds.length > 0 && allEntryIds.every((id) => id in s.curated.solved),
    },
    {
      id: 'flawless-shore',
      name: 'Clean Water',
      description: 'Clear a curated shore without a single mistake.',
      category: 'Curated',
      earned: (s) => solvedIds(s).some((id) => flawless(s, id)),
    },
    {
      id: 'flawless-coast',
      name: 'Still Waters',
      description: 'Clear every curated shore without a single mistake.',
      category: 'Curated',
      earned: (s) => allEntryIds.length > 0 && allEntryIds.every((id) => flawless(s, id)),
    },
    {
      id: 'boards-10',
      name: 'Regular Visitor',
      description: 'Solve 10 boards.',
      category: 'Volume',
      earned: (s) => s.stats.boardsSolved >= 10,
    },
    {
      id: 'boards-50',
      name: 'Tidewatcher',
      description: 'Solve 50 boards.',
      category: 'Volume',
      earned: (s) => s.stats.boardsSolved >= 50,
    },
    {
      id: 'boards-200',
      name: 'Shorekeeper',
      description: 'Solve 200 boards.',
      category: 'Volume',
      earned: (s) => s.stats.boardsSolved >= 200,
    },
    {
      id: 'pools-100',
      name: 'A Hundred Pools',
      description: 'Fill 100 pools.',
      category: 'Volume',
      earned: (s) => s.stats.poolsFilled >= 100,
    },
    {
      id: 'collector-10',
      name: 'Familiar Face',
      description: 'Find the same creature ten times.',
      category: 'Collector',
      earned: (s) => CREATURES.some((c) => found(s, c.id) >= 10),
    },
  )

  return list
}

/** "a limpet" / "an anemone" — descriptions read as prose, so this matters. */
function aOrAn(name: string): string {
  const article = /^[aeiou]/i.test(name) ? 'an' : 'a'
  return `${article} ${name.toLowerCase()}`
}

/** The shipped catalogue. */
export const ACHIEVEMENTS: readonly Achievement[] = buildCatalog(loadCuratedPack())

/** Look one up by id. */
export function achievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/**
 * Every achievement the state satisfies, in catalogue order.
 *
 * Total: recomputed from scratch each call rather than accumulated, so it can't
 * drift from the save it describes.
 */
export function evaluateAchievements(
  state: AchievementState,
  catalog: readonly Achievement[] = ACHIEVEMENTS,
): string[] {
  return catalog.filter((a) => a.earned(state)).map((a) => a.id)
}

/**
 * What's newly earned since `already` — the set to hand to Steam.
 *
 * Kept separate from evaluation because unlocking is not idempotent everywhere:
 * re-pushing a known achievement can re-fire a player's toast notification.
 */
export function newlyEarned(
  state: AchievementState,
  already: Iterable<string>,
  catalog: readonly Achievement[] = ACHIEVEMENTS,
): string[] {
  const have = new Set(already)
  return evaluateAchievements(state, catalog).filter((id) => !have.has(id))
}
