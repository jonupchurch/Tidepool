// how-to-play-content.tsx — the rules, in one place. Rendered twice: quietly in
// the rail beside the board, and as the How to play screen off the menu. Sharing
// the content means the two can never drift apart.
//
// **Two rules, not six glyphs (019).** A clue says one thing about how MUCH
// water (`4`, `+`, `|`) and one about how it is ARRANGED (`{}`, `--`), and the
// two combine freely — on a tile and around the edge alike. Taught as a list of
// forms that would be six bullet points and growing; taught as a composition it
// is two short lists and a sentence, and a player meeting `-|-` for the first
// time can work it out rather than look it up.

/** How much water a clue is talking about. */
export const CLUE_FACES: { glyph: string; meaning: string }[] = [
  { glyph: 'n', meaning: 'exactly that many water tiles' },
  { glyph: '+', meaning: 'an even number of them — it won’t say how many' },
  { glyph: '|', meaning: 'an odd number — likewise' },
]

/** How that water is arranged. Wraps any face above. */
export const CLUE_FRAMINGS: { glyph: string; meaning: string }[] = [
  { glyph: '{ }', meaning: 'the water is all in one unbroken run' },
  { glyph: '- -', meaning: 'it comes apart into two or more' },
]

/** The rule that makes the six forms two rules. Stated once (019 FR-012). */
export const COMPOSITION =
  'The two combine, and they mean the same thing on a tile as they do around the edge: a tile counts the water touching it, an edge number counts a whole line.'

/** The grid the composition rule produces — every form, derived not listed. */
export const CLUE_GRID: { face: string; forms: string[]; meaning: string }[] = [
  { face: 'n', forms: ['4', '{4}', '-4-'], meaning: 'four' },
  { face: '+', forms: ['+', '{+}', '-+-'], meaning: 'an even number' },
  { face: '|', forms: ['|', '{|}', '-|-'], meaning: 'an odd number' },
]

export const CLUE_GRID_HEADINGS = ['on its own', 'one run', 'split apart']

export const MARKING = 'Fill every cell: left-click for water, right-click for stone.'

export const EDGE_NUMBERS =
  "Numbers around the edge count the water in that whole line. Click one to trace its line, right-click to grey it out once you've settled it."

/** Why `+` and `|` are strokes rather than letters, and what they are good for. */
export const PARITY_NOTE =
  'The marks turn up on the deepest boards only. One stroke for odd, two crossed for even — enough to finish a line or a stone once the rest of it is settled.'

export const SETTLED = 'A cell you get right locks in place, so a stray click can never undo it.'
