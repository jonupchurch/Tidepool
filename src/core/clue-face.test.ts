// The clue FACE contract (019) — a compile-time test, mostly.
//
// A clue says one thing about quantity: an exact count, or only its parity. The
// type has to make "both at once" impossible, because `hasParityFace` checks the
// parity field first and would read such an object as a parity clue, silently
// ignoring a count that is right there. Nothing constructs one today; this is
// what keeps that true.
//
// **The obvious type is wrong, and this file is why we know.** The 019 plan first
// specified `{ count: number } | { parity: Parity }`, reasoning that a union of
// two closed shapes excludes the combination. It does not: excess-property
// checking against a union permits any property present in *any* member, so
// `{ count: 4, parity: 'even' }` type-checks against it. The `@ts-expect-error`
// written to prove the protection came back UNUSED, which is how the hole was
// found. The `?: never` arms are what actually close it.
//
// So the assertions below are deliberately inverted from the usual shape: each
// `@ts-expect-error` fails the build if the line it guards STOPS being an error.
// A silently-passing test here would be indistinguishable from the bug.
import type { AdjacencyClue, ClueFace, LineClue } from './board'
import { hasParityFace } from './board'

describe('ClueFace', () => {
  it('refuses a clue carrying both a count and a parity', () => {
    // @ts-expect-error — a face is one or the other, never both (019).
    const both: AdjacencyClue = { count: 4, parity: 'even' }
    // Referenced so the declaration is not merely unused; the assertion is the
    // compile error above, which `npm run typecheck` enforces.
    expect(both).toBeDefined()
  })

  it('refuses the same on a line clue, which shares the face', () => {
    // @ts-expect-error — same rule at the other clue site.
    const both: LineClue = { axis: 0, index: 0, from: 'start', count: 3, parity: 'odd' }
    expect(both).toBeDefined()
  })

  it('accepts either face alone, framed or bare', () => {
    const forms: AdjacencyClue[] = [
      { count: 4 },
      { count: 4, connectivity: 'connected' },
      { count: 4, connectivity: 'split' },
      { parity: 'even' },
      { parity: 'even', connectivity: 'connected' },
      { parity: 'odd', connectivity: 'split' },
    ]
    expect(forms).toHaveLength(6)
  })

  it('narrows to the parity arm, where the count is unreadable', () => {
    const read = (clue: AdjacencyClue): number | 'even' | 'odd' => {
      if (hasParityFace(clue)) {
        // @ts-expect-error — the number was withheld; reaching for it anyway is
        // the cheat the union exists to prevent.
        const n: number = clue.count
        void n
        return clue.parity
      }
      // The `number` return type is the assertion: if the false branch did not
      // narrow, `clue.count` would be `number | undefined` and this would fail
      // to compile.
      return clue.count
    }

    expect(read({ count: 0 })).toBe(0)
    expect(read({ count: 4, connectivity: 'split' })).toBe(4)
    expect(read({ parity: 'even' })).toBe('even')
    expect(read({ parity: 'odd', connectivity: 'connected' })).toBe('odd')
  })

  it('keeps the framing readable through either face', () => {
    // The whole point of the intersection: framing is not on one arm only.
    const framing = (clue: AdjacencyClue): string => clue.connectivity ?? 'bare'
    expect(framing({ count: 4, connectivity: 'connected' })).toBe('connected')
    expect(framing({ parity: 'odd', connectivity: 'split' })).toBe('split')
    expect(framing({ parity: 'odd' })).toBe('bare')
  })

  it('works on a bare face, not just on a clue that has a framing', () => {
    const faces: ClueFace[] = [{ count: 2 }, { parity: 'odd' }]
    expect(faces.filter(hasParityFace)).toHaveLength(1)
    expect(faces.filter((f) => !hasParityFace(f))).toHaveLength(1)
  })

  it('reads a count of zero as a count, not as an absent face', () => {
    // `count: 0` is falsy, so any implementation testing truthiness rather than
    // the parity field would misclassify the one clue value the game shows most
    // carefully — and 018's zero rule exists because `0` must stay a `0`.
    expect(hasParityFace({ count: 0 })).toBe(false)
  })
})
