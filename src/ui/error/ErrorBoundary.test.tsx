import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

/** React logs caught errors to console.error; that's expected noise here. */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function Boom({ message = 'kaboom' }: { message?: string }): never {
  throw new Error(message)
}

/**
 * A child whose failure the test controls explicitly. Deliberately not a
 * counter decremented during render: React re-renders a failing component in
 * development, so a render-time mutation fires an unpredictable number of times.
 */
function Tree({ ctl }: { ctl: { fail: boolean } }) {
  if (ctl.fail) throw new Error('boom')
  return <p>the shore</p>
}

describe('ErrorBoundary', () => {
  it('renders children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>the shore</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('the shore')).toBeInTheDocument()
  })

  it('catches a render error instead of leaving a white screen', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /tide came in early/i })).toBeInTheDocument()
  })

  it('tells the player their progress is safe', () => {
    // The real fear at a crash screen is "have I lost my game?" — answer it.
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/progress is safe/i)).toBeInTheDocument()
  })

  it('surfaces the error message for a bug report, collapsed', () => {
    render(
      <ErrorBoundary>
        <Boom message="cannot read pool of undefined" />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/cannot read pool of undefined/)).toBeInTheDocument()
    expect(screen.getByText(/technical details/i)).toBeInTheDocument()
  })

  it('reports the error to its handler', () => {
    const onError = vi.fn()
    render(
      <ErrorBoundary onError={onError}>
        <Boom message="reported" />
      </ErrorBoundary>,
    )
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0][0].message).toBe('reported')
  })

  it('recovers when the failure was transient', () => {
    const ctl = { fail: true }
    render(
      <ErrorBoundary>
        <Tree ctl={ctl} />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    ctl.fail = false // whatever went wrong has passed
    fireEvent.click(screen.getByRole('button', { name: /back to shore/i }))
    expect(screen.getByText('the shore')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ErrorBoundary when the crash keeps happening', () => {
  it('offers nothing destructive on the first failure', () => {
    render(
      <ErrorBoundary onClearSaved={vi.fn()}>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.queryByRole('button', { name: /fresh board/i })).not.toBeInTheDocument()
  })

  it('offers a way out once retrying has already failed', () => {
    // The failure mode that makes a game unplayable rather than merely
    // interrupted: a saved board that throws every time it is restored.
    render(
      <ErrorBoundary onClearSaved={vi.fn()}>
        <Boom />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: /back to shore/i }))

    expect(screen.getByRole('button', { name: /fresh board/i })).toBeInTheDocument()
    expect(screen.getByText(/journal and finished shores are untouched/i)).toBeInTheDocument()
  })

  it('clears the saved board and carries on', async () => {
    // Models the real scenario: the bad saved board is the cause, so clearing
    // it is what actually makes the game playable again.
    const ctl = { fail: true }
    const onClearSaved = vi.fn().mockImplementation(async () => {
      ctl.fail = false
    })
    render(
      <ErrorBoundary onClearSaved={onClearSaved}>
        <Tree ctl={ctl} />
      </ErrorBoundary>,
    )
    // Retrying alone doesn't help — it crashes straight back.
    fireEvent.click(screen.getByRole('button', { name: /back to shore/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /fresh board/i }))
    await waitFor(() => expect(onClearSaved).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('the shore')).toBeInTheDocument())
  })

  it('still lets the player out when clearing itself fails', async () => {
    // Being trapped on the crash screen because the escape hatch also broke is
    // the worst available outcome, so the reset happens either way.
    const ctl = { fail: true }
    const onClearSaved = vi.fn().mockImplementation(async () => {
      ctl.fail = false // the board did get cleared...
      throw new Error('disk on fire') // ...but reporting it back failed
    })
    render(
      <ErrorBoundary onClearSaved={onClearSaved}>
        <Tree ctl={ctl} />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: /back to shore/i }))
    fireEvent.click(screen.getByRole('button', { name: /fresh board/i }))

    await waitFor(() => expect(screen.getByText('the shore')).toBeInTheDocument())
  })

  it('rebuilds the subtree rather than resuming its old state', () => {
    // A reset that preserved state would hand the broken value straight back to
    // the component that choked on it.
    function Counter() {
      const [n, setN] = useState(0)
      if (n > 0) throw new Error('poisoned by state')
      return (
        <button type="button" onClick={() => setN(1)}>
          poison
        </button>
      )
    }
    render(
      <ErrorBoundary>
        <Counter />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'poison' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back to shore/i }))
    // Fresh mount → state back to 0 → renders instead of throwing again.
    expect(screen.getByRole('button', { name: 'poison' })).toBeInTheDocument()
  })
})
