// EndlessPicker.tsx — choose size + difficulty and start a deterministic endless
// stream. Emits a BoardRequest (the stream's first board) for Gameplay (002).
// Restores the last-used choice via the `initial` prop. Tailwind theme tokens.
import { useState } from 'react'
import type { DifficultyTier, SizeTier } from '@/core'
import { DIFFICULTY_TIERS, SIZE_TIERS } from '@/core'
import { type BoardRequest, createEndlessStream, nextSeed } from '@/game/board-source'

export interface EndlessPickerProps {
  initial: { size: SizeTier; difficulty: DifficultyTier }
  onStart: (request: BoardRequest) => void
}

export function EndlessPicker({ initial, onStart }: EndlessPickerProps) {
  const [size, setSize] = useState<SizeTier>(initial.size)
  const [difficulty, setDifficulty] = useState<DifficultyTier>(initial.difficulty)

  const start = () => {
    // A fresh, shareable start seed (Math.random stays in the UI; the stream
    // itself is pure/deterministic from this seed).
    const startSeed = nextSeed(String(Math.random()))
    onStart(createEndlessStream({ startSeed, size, difficulty }).current())
  }

  return (
    <section className="w-full rounded-2xl bg-foam/70 p-4" aria-label="Endless tide">
      <h2 className="mb-3 font-display text-deep-pool">Endless tide</h2>
      <Segmented legend="Size" options={SIZE_TIERS} value={size} onChange={(v) => setSize(v as SizeTier)} />
      <Segmented
        legend="Difficulty"
        options={DIFFICULTY_TIERS}
        value={difficulty}
        onChange={(v) => setDifficulty(v as DifficultyTier)}
      />
      <button
        type="button"
        onClick={start}
        className="mt-3 w-full rounded-xl bg-tide px-4 py-3 font-display text-foam hover:bg-deep-pool"
      >
        Start endless
      </button>
    </section>
  )
}

/** A small segmented single-select control. */
function Segmented({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string
  options: readonly string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 text-xs uppercase tracking-wide text-rock">{legend}</div>
      <div className="flex gap-2">
        {options.map((opt) => {
          const active = opt === value
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? 'bg-tide text-foam' : 'bg-sand text-deep-pool hover:bg-driftwood'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
