// The clue face — the text a given stone shows. Pure, so it tests directly;
// how it is *drawn* (weight, size, colour) is judged by eye, not asserted here.
import { clueText } from './board-renderer'

describe('clueText', () => {
  it('shows a plain count', () => {
    expect(clueText({ count: 0 })).toBe('0')
    expect(clueText({ count: 4 })).toBe('4')
  })

  it('braces a count whose water is all in one run', () => {
    expect(clueText({ count: 3, connectivity: 'connected' })).toBe('{3}')
  })

  it('dashes a count whose water is split apart', () => {
    expect(clueText({ count: 3, connectivity: 'split' })).toBe('-3-')
  })

  it('marks parity with strokes, never a letter (018)', () => {
    // Deliberately not `E`/`O`: in the display font at cell sizes a Large board
    // uses, `O` and `0` are near-identical, and `0` is a real clue value.
    expect(clueText({ parity: 'even' })).toBe('+')
    expect(clueText({ parity: 'odd' })).toBe('|')
  })

  it('never renders a parity mark that could be read as a digit', () => {
    const marks = [clueText({ parity: 'even' }), clueText({ parity: 'odd' })]
    for (const m of marks) {
      expect(m).not.toMatch(/[0-9]/)
      // `-` and `{`/`}` already mean "split" and "one run" on a count.
      expect(m).not.toMatch(/[-{}]/)
    }
  })
})
