// ErrorBoundary.tsx — the last line before a white screen.
//
// Without one, any render error unmounts the whole tree and leaves the player
// staring at nothing, with no way home and no idea whether their progress
// survived (it did — it's on disk, not in the component that just died).
//
// Recovery resets in place rather than reloading the page. That matters for the
// nastier failure: if the crash is *deterministic* — a saved board that throws
// every time it's restored — reloading just falls into the same hole forever.
// Resetting in place keeps this component mounted, so it can count how many
// times recovery has failed and offer a real way out on the second try.
import { Component, type ErrorInfo, type ReactNode } from 'react'

export interface ErrorBoundaryProps {
  children: ReactNode
  /**
   * Clear the saved in-progress board. Offered only after a retry has already
   * failed, because it throws away a puzzle the player was part-way through —
   * but a board that crashes on restore is the likeliest cause of a repeat, and
   * without this the game is unplayable rather than merely interrupted.
   */
  onClearSaved?: () => Promise<void>
  /** Test seam. */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
  /** How many times we've landed here this session. */
  failures: number
  /** Bumped on reset to force a clean remount of the subtree. */
  attempt: number
  clearing: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, failures: 0, attempt: 0, clearing: false }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState((s) => ({ failures: s.failures + 1 }))
    this.props.onError?.(error, info)
  }

  private reset = (): void => {
    this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))
  }

  private clearAndReset = async (): Promise<void> => {
    this.setState({ clearing: true })
    try {
      await this.props.onClearSaved?.()
    } catch {
      // Swallowed on purpose. There is nothing useful to tell the player about
      // a failed cleanup, and rethrowing here would escape as an unhandled
      // rejection — from the one screen whose entire job is to contain errors.
    } finally {
      // Reset regardless: leaving the player stuck on this screen because the
      // cleanup itself failed would be the worst outcome available.
      this.setState((s) => ({ error: null, attempt: s.attempt + 1, clearing: false }))
    }
  }

  render(): ReactNode {
    const { error, failures, clearing } = this.state
    if (!error) {
      // The key forces the subtree to rebuild from scratch on reset, rather
      // than resuming from whatever state produced the error.
      return <div key={this.state.attempt} className="contents">{this.props.children}</div>
    }

    // One failure could be a fluke; a second means retrying alone won't fix it.
    const stuck = failures > 1

    return (
      <div
        role="alert"
        className="grid h-full min-h-screen w-full place-items-center bg-sand px-6 text-ink"
      >
        <div className="flex max-w-md flex-col items-center gap-5 text-center">
          <h1 className="font-display text-3xl text-deep-pool">The tide came in early</h1>
          <p className="text-tide">
            Something went wrong and the game had to stop. <strong>Your progress is safe</strong> —
            it's saved to disk, not lost with this screen.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-full bg-tide px-6 py-2 font-display text-foam hover:bg-deep-pool"
            >
              Back to shore
            </button>
            {stuck && this.props.onClearSaved && (
              <button
                type="button"
                onClick={() => void this.clearAndReset()}
                disabled={clearing}
                className="rounded-full bg-foam px-5 py-2 text-sm text-deep-pool hover:bg-driftwood disabled:opacity-60"
              >
                {clearing ? 'Clearing…' : 'Start a fresh board'}
              </button>
            )}
          </div>

          {stuck && (
            <p className="text-xs text-rock">
              Still stuck? The board you were solving may be the problem. Starting fresh discards
              that one puzzle — your journal and finished shores are untouched.
            </p>
          )}

          {/* Collapsed by default: useful in a bug report, noise otherwise. */}
          <details className="w-full text-left">
            <summary className="cursor-pointer text-xs text-rock">Technical details</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-foam p-3 text-left text-xs text-ink/80">
              {error.message || String(error)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
