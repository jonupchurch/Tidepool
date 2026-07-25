// PoolToast — the soft "a creature joins your journal" reward toast (US2). Purely
// presentational; the sound trigger is a later concern and degrades silently.
interface PoolToastProps {
  message: string | null
}

export function PoolToast({ message }: PoolToastProps) {
  if (!message) return null
  return (
    <div
      className="absolute top-16 left-1/2 -translate-x-1/2 bg-coral text-foam font-display px-5 py-2 rounded-full shadow-lg"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
