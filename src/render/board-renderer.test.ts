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

  it('marks parity with dots — they pair up, or one is left over (021)', () => {
    // Deliberately not `E`/`O`: in the display font at cell sizes a Large board
    // uses, `O` and `0` are near-identical, and `0` is a real clue value.
    expect(clueText({ parity: 'even' })).toBe('●●')
    expect(clueText({ parity: 'odd' })).toBe('●')
  })

  it('frames a parity mark exactly as it frames a count', () => {
    expect(clueText({ parity: 'even', connectivity: 'connected' })).toBe('{●●}')
    expect(clueText({ parity: 'even', connectivity: 'split' })).toBe('-●●-')
    expect(clueText({ parity: 'odd', connectivity: 'connected' })).toBe('{●}')
    expect(clueText({ parity: 'odd', connectivity: 'split' })).toBe('-●-')
  })

  it('never renders a parity mark that could be read as a digit', () => {
    const marks = [clueText({ parity: 'even' }), clueText({ parity: 'odd' })]
    for (const m of marks) {
      expect(m).not.toMatch(/[0-9]/)
      // `-` and `{`/`}` already mean "split" and "one run" on a count.
      expect(m).not.toMatch(/[-{}]/)
    }
  })

  it('never builds a mark from a stroke the framing could complete (021)', () => {
    // The rule 019 broke. It marked odd with `|`, which stands up on its own and
    // stops standing up the moment it is framed: the split framing draws two
    // horizontal dashes, so `-|-` renders a cross — the BARE EVEN mark. The two
    // strings differ, so nothing comparing rendered text could have caught it.
    //
    // What catches it is structural. The framing is made of strokes, so a mark
    // that is ITSELF a bare stroke fuses with them into some other glyph. A
    // round mark cannot: nothing else the board draws is round.
    for (const m of [clueText({ parity: 'even' }), clueText({ parity: 'odd' })]) {
      expect(m, `${m} is a bare stroke — the framing would complete it`).not.toMatch(/[|_-]/)
    }
  })
})
