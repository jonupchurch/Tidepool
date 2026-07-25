// HowToPlay.tsx — a quiet reference rail down the left of the board. Deliberately
// low-contrast: it should sit under notice until you go looking for it. Dismissed
// with the button beneath it; the choice persists through the settings seam so it
// stays gone once you know the rules.
export interface HowToPlayProps {
  onClose: () => void
}

/** One clue form: the glyph as it appears on a tile, and what it means. */
const CLUES: { glyph: string; meaning: string }[] = [
  { glyph: 'n', meaning: 'water tiles touching this hex' },
  { glyph: '{n}', meaning: 'that water is all in one run' },
  { glyph: '-n-', meaning: 'that water is split apart' },
]

export function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    // A layout sibling of the board, never an overlay: an overlay's close
    // button sat on top of the canvas and swallowed clicks meant for cells.
    <aside
      aria-label="How to play"
      className="hidden w-56 shrink-0 flex-col justify-center p-5 text-rock/70 lg:flex"
    >
      <h2 className="font-display text-sm uppercase tracking-wide text-rock/60">How to play</h2>

      <p className="mt-2 text-xs leading-relaxed">
        Fill every cell: left-click for water, right-click for stone.
      </p>

      <dl className="mt-3 flex flex-col gap-1.5 text-xs leading-relaxed">
        {CLUES.map((c) => (
          <div key={c.glyph} className="flex gap-2">
            <dt className="w-9 shrink-0 font-display text-rock/80">{c.glyph}</dt>
            <dd>{c.meaning}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs leading-relaxed">
        Numbers around the edge count the water in that whole line. Click one to
        trace its line, right-click to grey it out once you've settled it.
      </p>

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
