// AboutScreen.tsx — who made it, and which build you're holding. Deliberately
// small: a wordmark, a version, a credit line, and the way back. Shaped like
// HowToPlayScreen so the two secondary screens read as a pair.
import { CREDIT, VERSION } from './about'

export interface AboutScreenProps {
  onBack: () => void
}

export function AboutScreen({ onBack }: AboutScreenProps) {
  return (
    <div className="h-full w-full overflow-y-auto bg-sand text-ink">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
        <header className="text-center">
          <h1 className="font-display text-4xl text-deep-pool">About</h1>
        </header>

        <section className="rounded-2xl bg-foam p-6 text-center">
          <p className="font-display text-3xl text-deep-pool">Tidepool</p>
          <p className="mt-1 text-tide">Read the shoreline. Fill the pools.</p>
          <p className="mt-4 text-sm tabular-nums text-rock">Version {VERSION}</p>
        </section>

        <section className="rounded-2xl bg-foam p-6 text-center">
          <h2 className="font-display text-lg text-deep-pool">Credits</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/80">{CREDIT}</p>
        </section>

        <div className="flex justify-center">
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
