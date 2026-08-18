// HowToPlayScreen.tsx — the rules, off the menu. Same content as the quiet rail
// beside the board (shared via `how-to-play-content`), laid out to be read
// rather than glanced at.
import {
  CLUE_FORMS,
  EDGE_NUMBERS,
  EDGE_RUNS,
  EVEN_ODD,
  MARKING,
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
          <h2 className="font-display text-lg text-deep-pool">Numbers on a tile</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">
            A numbered tile is stone, and its number counts the water around it.
          </p>
          <dl className="mt-3 flex flex-col gap-2">
            {CLUE_FORMS.map((c) => (
              <div key={c.glyph} className="flex items-baseline gap-3">
                <dt className="w-14 shrink-0 rounded-lg bg-driftwood py-1 text-center font-display text-deep-pool">
                  {c.glyph}
                </dt>
                <dd className="text-sm leading-relaxed text-ink/80">{c.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl bg-foam p-5">
          <h2 className="font-display text-lg text-deep-pool">Numbers around the edge</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/80">{EDGE_NUMBERS}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">{EDGE_RUNS}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">{EVEN_ODD}</p>
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
