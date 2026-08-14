// how-to-play-content.tsx — the rules, in one place. Rendered twice: quietly in
// the rail beside the board, and as the How to play screen off the menu. Sharing
// the content means the two can never drift apart.

/** One clue form: the glyph as it appears on a tile, and what it means. */
export const CLUE_FORMS: { glyph: string; meaning: string }[] = [
  { glyph: 'n', meaning: 'water tiles touching this hex' },
  { glyph: '{n}', meaning: 'that water is all in one run' },
  { glyph: '-n-', meaning: 'that water is split apart' },
]

export const MARKING = 'Fill every cell: left-click for water, right-click for stone.'

export const EDGE_NUMBERS =
  "Numbers around the edge count the water in that whole line. Click one to trace its line, right-click to grey it out once you've settled it."

/** The same `{}` / `--` vocabulary, on a row total rather than a tile (010). */
export const EDGE_RUNS =
  'An edge number can be braced or dashed too: {n} means that line’s water sits in one unbroken run, -n- means it comes apart into two or more.'

export const SETTLED = 'A cell you get right locks in place, so a stray click can never undo it.'
