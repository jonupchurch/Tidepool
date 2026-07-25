// SeedEntry.tsx — type or paste a seed to jump to that exact, shareable board.
// Invalid input shows a gentle inline message and loads nothing (SC-005). The
// seed carries the current size/difficulty unless the token overrides them.
import { useState } from 'react'
import type { DifficultyTier, SizeTier } from '@/core'
import { type BoardRequest, parseSeedEntry } from '@/game/board-source'

export interface SeedEntryProps {
  currentPrefs: { size: SizeTier; difficulty: DifficultyTier }
  onSubmit: (request: BoardRequest) => void
}

export function SeedEntry({ currentPrefs, onSubmit }: SeedEntryProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const result = parseSeedEntry(input, currentPrefs)
    if (result.ok) {
      setError(null)
      onSubmit(result.request)
    } else {
      setError(result.reason)
    }
  }

  return (
    <section className="w-full rounded-2xl bg-foam/70 p-4 text-left">
      <label htmlFor="seed" className="font-display text-deep-pool">
        Enter a seed
      </label>
      <p className="mb-2 text-xs text-tide">Jump to a friend’s exact board.</p>
      <div className="flex gap-2">
        <input
          id="seed"
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="KELP-2231"
          aria-invalid={error != null}
          className="min-w-0 flex-1 rounded-lg border border-driftwood bg-sand px-3 py-2 text-ink placeholder:text-rock/60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!input.trim()}
          className="rounded-lg bg-tide px-4 py-2 font-display text-foam hover:bg-deep-pool disabled:opacity-40"
        >
          Jump in
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-coral">
          {error}
        </p>
      )}
    </section>
  )
}
