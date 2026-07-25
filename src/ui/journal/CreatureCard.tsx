// CreatureCard.tsx — one creature in the Shore Journal. Found → art (or a styled
// placeholder when art is missing, FR-008) + name + rarity + warm description +
// gentle discovery detail. Unfound → a faint silhouette labelled "not yet found."
// Theme tokens only (no hardcoded hex).
import { useState } from 'react'
import { type CreatureView, creatureArtUrl } from '@/game'

const RARITY_CLASS: Record<string, string> = {
  Common: 'text-rock',
  Uncommon: 'text-tide',
  Rare: 'text-deep-pool',
  Legendary: 'text-coral',
}

export function CreatureCard({ card }: { card: CreatureView }) {
  const { def, found, count, firstFoundSeed } = card

  if (!found) {
    return (
      <div
        className="flex flex-col items-center rounded-2xl border border-driftwood bg-driftwood/30 p-4 text-center"
        aria-label="Undiscovered creature — not yet found"
      >
        <div
          className="grid h-16 w-16 place-items-center rounded-full bg-rock/20 text-3xl text-rock/40"
          aria-hidden
        >
          ?
        </div>
        <p className="mt-2 font-display text-sm text-rock/70">not yet found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-driftwood bg-foam p-4 text-center shadow-sm">
      <CreatureArt name={def.name} id={def.id} />
      <h3 className="mt-2 font-display text-deep-pool">{def.name}</h3>
      <p className={`text-xs uppercase tracking-wide ${RARITY_CLASS[def.rarity] ?? 'text-rock'}`}>
        {def.rarity}
      </p>
      <p className="mt-1 text-sm text-ink/80">{def.description}</p>
      <p className="mt-2 text-xs text-tide">
        Found ×{count}
        {firstFoundSeed ? ` · first at ${firstFoundSeed}` : ''}
      </p>
    </div>
  )
}

/**
 * Real art when the conventional file exists, otherwise a warm styled
 * placeholder (never a broken img, FR-008). Art is discovered by convention —
 * `public/img/<id>.png` — so a new portrait needs no catalog edit; if the file
 * isn't there yet, the load fails and we fall back.
 */
function CreatureArt({ name, id }: { name: string; id: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        className="grid h-16 w-16 place-items-center rounded-full bg-tide-fill text-3xl"
        aria-hidden
      >
        🐚
      </div>
    )
  }
  return (
    <img
      src={creatureArtUrl(id)}
      alt={name}
      onError={() => setFailed(true)}
      className="h-16 w-16 object-contain"
    />
  )
}
