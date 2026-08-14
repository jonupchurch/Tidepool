// request.ts — the single funnel every mode produces: a BoardRequest that maps
// to the engine's BoardParams. Human labels (Small/Medium/Large, Calm/Tricky/
// Deep) are the engine tiers verbatim; this module validates + attaches clues.
// Pure — no DOM, no randomness (determinism lives in the engine, Principle XI).
import type { BoardParams, ClueToggles, DifficultyTier, ShapeId, SizeTier } from '@/core'
import { DIFFICULTY_TIERS, SIZE_TIERS, isShapeId, parseSeed, shapeSupportsSize } from '@/core'

export interface BoardRequest {
  seed: string
  size: SizeTier
  difficulty: DifficultyTier
  /** Per-board clue set (013). Absent = DEFAULT_CLUES, i.e. what every board
   *  served before curated page two existed. */
  clues?: ClueToggles
  /** Per-board silhouette (013). Absent = the filled hexagon. */
  shape?: ShapeId
}

/** Default clue set for board-source boards (both signature clue types on). */
export const DEFAULT_CLUES: ClueToggles = { connectivity: true, lineTotals: true }

/** Narrow a human size label to the engine `SizeTier` (throws on unknown). */
export function toSizeTier(label: string): SizeTier {
  if (!(SIZE_TIERS as readonly string[]).includes(label)) throw new Error(`unknown size: ${label}`)
  return label as SizeTier
}

/** Narrow a human difficulty label to the engine `DifficultyTier`. */
export function toDifficultyTier(label: string): DifficultyTier {
  if (!(DIFFICULTY_TIERS as readonly string[]).includes(label))
    throw new Error(`unknown difficulty: ${label}`)
  return label as DifficultyTier
}

/** Structural + value check that `x` is a launchable BoardRequest. The optional
 *  fields are VALIDATED when present rather than trusted — same posture as the
 *  rest of this module, and they can arrive from a shipped manifest. */
export function isBoardRequest(x: unknown): x is BoardRequest {
  if (typeof x !== 'object' || x === null) return false
  const r = x as Record<string, unknown>
  if (
    typeof r.seed !== 'string' ||
    parseSeed(r.seed) === null ||
    typeof r.size !== 'string' ||
    !(SIZE_TIERS as readonly string[]).includes(r.size) ||
    typeof r.difficulty !== 'string' ||
    !(DIFFICULTY_TIERS as readonly string[]).includes(r.difficulty)
  ) {
    return false
  }
  if (r.shape !== undefined) {
    if (!isShapeId(r.shape)) return false
    if (!shapeSupportsSize(r.shape, r.size as SizeTier)) return false
  }
  if (r.clues !== undefined) {
    const c = r.clues as Record<string, unknown>
    if (typeof c !== 'object' || c === null) return false
    if (typeof c.connectivity !== 'boolean' || typeof c.lineTotals !== 'boolean') return false
    if (c.lineConnectivity !== undefined && typeof c.lineConnectivity !== 'boolean') return false
  }
  return true
}

/** Map a validated request to engine `BoardParams` (throws on invalid input). */
export function toBoardParams(request: BoardRequest): BoardParams {
  const seed = parseSeed(request.seed)
  if (!seed) throw new Error(`invalid seed: ${request.seed}`)
  return {
    seed,
    size: toSizeTier(request.size),
    difficulty: toDifficultyTier(request.difficulty),
    // A request that names neither gets exactly what every board got before
    // page two existed — which is what keeps page one bit-for-bit unchanged.
    clues: request.clues ?? DEFAULT_CLUES,
    ...(request.shape ? { shape: request.shape } : {}),
  }
}

/** The validated funnel handed to Gameplay (002): normalize the seed + tiers,
 *  or throw. Callers that accept player input validate first (seed-entry). */
export function launchBoard(request: BoardRequest): BoardRequest {
  const seed = parseSeed(request.seed)
  if (!seed) throw new Error(`invalid seed: ${request.seed}`)
  return {
    seed,
    size: toSizeTier(request.size),
    difficulty: toDifficultyTier(request.difficulty),
    ...(request.clues ? { clues: request.clues } : {}),
    ...(request.shape ? { shape: request.shape } : {}),
  }
}
