// difficulty.ts — map the solver's technique set + deduction depth onto a tier.
// Technique-dominant (honest, testable), with depth as a secondary bump for
// long chains. Size and clue density are generation inputs, not the rating
// (spec FR-010).
import type { DifficultyTier, Technique } from './board'

// Rating is technique-driven; depth only bumps genuinely extreme chains so it
// never accidentally mislabels an otherwise-Calm/Tricky board (SC-004).
/** Depth beyond which a Calm board is bumped to Tricky (long forced chains). */
export const CALM_DEPTH_MAX = 40
/** Depth beyond which a Tricky board is bumped to Deep (very long chains). */
export const TRICKY_DEPTH_MAX = 60

/**
 * The techniques a board of the given tier may require. Reduction gates on this
 * so a board never needs a technique harder than its target tier (which caps
 * the rating at that tier). forced-count / line-total are always available.
 */
export function allowedTechniquesFor(tier: DifficultyTier): Set<Technique> {
  switch (tier) {
    case 'Calm':
      // Pure adjacency forced-counts (line totals already read as Tricky-level).
      return new Set<Technique>(['forced-count'])
    case 'Tricky':
      // Line totals + region subtraction, but no connectivity reasoning.
      return new Set<Technique>(['forced-count', 'line-total', 'subset-overlap'])
    case 'Deep':
      // Centered on the connectivity mechanic. Line totals stay available (they
      // resolve isolated water cells, keeping boards solvable), but subset is
      // excluded so the reduction leans on `{}`/`--` — making Deep reliably
      // reachable and rated Deep. Row annotations (010) are the same class of
      // reasoning and live here too; they only ever appear on a board whose
      // clue toggles asked for them.
      // Parity (018) is the same class of reasoning and lives here too; like row
      // annotations it only ever appears on a board whose clue toggles asked
      // for it. Reduction needs it in the allowed set or no clue could ever be
      // weakened to `E`/`O` and the toggle would silently do nothing.
      return new Set<Technique>([
        'forced-count',
        'line-total',
        'connectivity',
        'line-connectivity',
        'parity',
      ])
  }
}

export function rateDifficulty(techniquesUsed: Technique[], maxDepth: number): DifficultyTier {
  const used = new Set(techniquesUsed)
  let tier: DifficultyTier
  if (used.has('connectivity') || used.has('line-connectivity') || used.has('parity')) {
    tier = 'Deep'
  } else if (used.has('subset-overlap') || used.has('line-total')) {
    tier = 'Tricky'
  } else {
    tier = 'Calm'
  }
  // Depth bump for long deduction chains within the simpler technique sets.
  if (tier === 'Calm' && maxDepth > CALM_DEPTH_MAX) tier = 'Tricky'
  if (tier === 'Tricky' && maxDepth > TRICKY_DEPTH_MAX) tier = 'Deep'
  return tier
}
