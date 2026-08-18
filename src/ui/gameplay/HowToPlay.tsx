// HowToPlay.tsx — a quiet reference rail down the left of the board. Deliberately
// low-contrast: it should sit under notice until you go looking for it. Dismissed
// with the button beneath it; the choice persists through the settings seam so it
// stays gone once you know the rules. The same text is the How to play screen —
// both read from `how-to-play-content`.
import {
  CLUE_FACES,
  CLUE_FRAMINGS,
  COMPOSITION,
  EDGE_NUMBERS,
  MARKING,
  PARITY_NOTE,
  SETTLED,
} from './how-to-play-content'

export interface HowToPlayProps {
  onClose: () => void
}

/**
 * What's left in the rail's place once it's dismissed: a small, low-contrast
 * "?" that brings the rules back. Dismissing must never be a one-way door.
 * A layout sibling like the rail itself, so it can't sit over the canvas.
 */
export function HowToPlayTab({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="hidden w-9 shrink-0 flex-col items-center justify-center lg:flex">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Show how to play"
        title="How to play"
        className="grid h-7 w-7 place-items-center rounded-full border border-rock/25 font-display text-sm text-rock/50 transition-colors hover:border-tide hover:bg-foam hover:text-deep-pool"
      >
        ?
      </button>
    </div>
  )
}

export function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    // A layout sibling of the board, never an overlay: an overlay's close
    // button sat on top of the canvas and swallowed clicks meant for cells.
    <aside
      aria-label="How to play"
      className="hidden w-56 shrink-0 flex-col justify-center p-5 text-rock/70 lg:flex"
    >
      <h2 className="font-display text-sm uppercase tracking-wide text-rock/60">How to play</h2>

      <p className="mt-2 text-xs leading-relaxed">{MARKING}</p>

      {/* Faces then framings, as two short lists — the rail is 14rem wide, so
          the grid on the How to play screen would not fit here. The composition
          sentence beneath them is what turns the two lists back into it. */}
      <p className="mt-3 text-[0.65rem] uppercase tracking-wide text-rock/50">How much water</p>
      <dl className="mt-1 flex flex-col gap-1.5 text-xs leading-relaxed">
        {CLUE_FACES.map((c) => (
          <div key={c.glyph} className="flex gap-2">
            <dt className="w-9 shrink-0 font-display text-rock/80">{c.glyph}</dt>
            <dd>{c.meaning}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-[0.65rem] uppercase tracking-wide text-rock/50">How it sits</p>
      <dl className="mt-1 flex flex-col gap-1.5 text-xs leading-relaxed">
        {CLUE_FRAMINGS.map((c) => (
          <div key={c.glyph} className="flex gap-2">
            <dt className="w-9 shrink-0 font-display text-rock/80">{c.glyph}</dt>
            <dd>{c.meaning}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-relaxed">{COMPOSITION}</p>
      <p className="mt-2 text-xs leading-relaxed">{EDGE_NUMBERS}</p>
      <p className="mt-2 text-xs leading-relaxed">{PARITY_NOTE}</p>
      <p className="mt-2 text-xs leading-relaxed">{SETTLED}</p>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 self-start rounded-full px-3 py-1 text-xs text-rock/60 underline decoration-dotted underline-offset-4 hover:bg-foam/60 hover:text-deep-pool"
      >
        Close
      </button>
    </aside>
  )
}
