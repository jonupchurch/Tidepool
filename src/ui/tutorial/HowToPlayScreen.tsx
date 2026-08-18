// HowToPlayScreen.tsx — the rules, off the menu. Same content as the quiet rail
// beside the board (shared via `how-to-play-content`), laid out to be read
// rather than glanced at.
import {
  CLUE_FACES,
  CLUE_FRAMINGS,
  CLUE_GRID,
  CLUE_GRID_HEADINGS,
  COMPOSITION,
  EDGE_NUMBERS,
  MARKING,
  PARITY_NOTE,
  SETTLED,
} from '@/ui/gameplay/how-to-play-content'

export interface HowToPlayScreenProps {
  onBack: () => void
  /** Offered when there's a game to go to — "read it, now play". */
  onPlay?: () => void
}

export function HowToPlayScreen({ onBack, onPlay }: HowToPlayScreenProps) {
  return (
    <div className="h-full w-full overflow-y-auto bg-sand text-ink">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
        <header className="text-center">
          <h1 className="font-display text-4xl text-deep-pool">How to play</h1>
          <p className="mt-1 text-tide">Fill the pools, settle the stones.</p>
        </header>

        <section className="rounded-2xl bg-foam p-5">
          <h2 className="font-display text-lg text-deep-pool">Marking</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">{MARKING}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">{SETTLED}</p>
        </section>

        <section className="rounded-2xl bg-foam p-5">
          <h2 className="font-display text-lg text-deep-pool">Reading a clue</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">
            A clue tells you two things: how much water, and how it sits.
          </p>

          <h3 className="mt-4 font-display text-sm uppercase tracking-wide text-tide">
            How much water
          </h3>
          <dl className="mt-2 flex flex-col gap-2">
            {CLUE_FACES.map((c) => (
              <div key={c.glyph} className="flex items-baseline gap-3">
                <dt className="w-14 shrink-0 rounded-lg bg-driftwood py-1 text-center font-display text-deep-pool">
                  {c.glyph}
                </dt>
                <dd className="text-sm leading-relaxed text-ink/80">{c.meaning}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-4 font-display text-sm uppercase tracking-wide text-tide">How it sits</h3>
          <dl className="mt-2 flex flex-col gap-2">
            {CLUE_FRAMINGS.map((c) => (
              <div key={c.glyph} className="flex items-baseline gap-3">
                <dt className="w-14 shrink-0 rounded-lg bg-driftwood py-1 text-center font-display text-deep-pool">
                  {c.glyph}
                </dt>
                <dd className="text-sm leading-relaxed text-ink/80">{c.meaning}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-4 text-sm leading-relaxed text-ink/80">{COMPOSITION}</p>

          {/* The grid the rule produces. Shown as a table rather than as nine
              more bullet points, so it reads as "every combination works"
              rather than as a list of special cases to memorise. */}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-center">
              <thead>
                <tr>
                  <th className="w-28" />
                  {CLUE_GRID_HEADINGS.map((h) => (
                    <th
                      key={h}
                      className="px-1 pb-1 font-display text-xs font-normal uppercase tracking-wide text-tide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CLUE_GRID.map((row) => (
                  <tr key={row.face}>
                    <th
                      scope="row"
                      className="whitespace-nowrap pr-2 text-right text-xs font-normal text-ink/60"
                    >
                      {row.meaning}
                    </th>
                    {row.forms.map((form) => (
                      <td
                        key={form}
                        className="rounded-lg bg-driftwood py-1 font-display text-deep-pool"
                      >
                        {form}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-ink/80">{PARITY_NOTE}</p>
        </section>

        <section className="rounded-2xl bg-foam p-5">
          <h2 className="font-display text-lg text-deep-pool">Numbers around the edge</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">{EDGE_NUMBERS}</p>
        </section>

        <div className="flex justify-center gap-3">
          {onPlay && (
            <button
              type="button"
              onClick={onPlay}
              className="rounded-full bg-tide px-6 py-2 font-display text-foam hover:bg-deep-pool"
            >
              Play
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="rounded-full bg-foam px-5 py-2 text-sm text-deep-pool hover:bg-driftwood"
          >
            Back to shore
          </button>
        </div>
      </div>
    </div>
  )
}
