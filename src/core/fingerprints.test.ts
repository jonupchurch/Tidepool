// Frozen board fingerprints — the guard on Principle XI.
//
// `determinism.test.ts` proves a board reproduces WITHIN a run. That is a
// different, weaker claim than the one the game actually makes: a seed produces
// the same board *forever*. A change to the RNG seed string, the candidate loop,
// the layout roll, or the reduction order would keep determinism.test.ts green
// while silently regenerating every board in existence — breaking every shipped
// curated board, every seed a player has written down, and every in-progress
// save, which resumes by regenerating from its stored params.
//
// So: a checked-in table of hashes, captured from the shipped generator. If you
// are here because this test failed, you have changed what a seed means. That is
// occasionally correct, but it is never incidental — the fix is almost always to
// make your change opt-in (a new clue toggle or shape appends to the seed string
// only when enabled) rather than to update the table.
//
// ── The table is in two halves, and they are not equally negotiable ───────────
//
// **The 44 rows without `evenOdd`** describe boards that have shipped. They must
// stay green through any change, and a failure among them is never to be
// recaptured — it means a change leaked out of its opt-in gate and reached boards
// that players hold. These are the rows that make a large refactor reviewable:
// they are unaffected by any mechanic added since, so if they move, the mechanic
// is not as opt-in as its author believed.
//
// **The 5 `evenOdd` rows** describe a mechanic (018/019) that shipped in 1.3.0
// on 2026-08-17. Until that date they were freely recapturable because no player
// held one of those seeds; they are not any more. Four of them were moved once
// after release, by 022, and the note beside them records who decided that and
// on what evidence. Read it before treating it as licence: it is a record of a
// deliberate exception, not a standing permission. Today all 49 rows are equal.
import { createHash } from 'node:crypto'
import type { BoardParams, ClueToggles, DifficultyTier, SizeTier } from './board'
import { generateBoard } from './generate'
import { serializeBoard } from './serialize'
import type { ShapeId } from './shapes'

/** The clue set every board in this table used before optional mechanics existed. */
const BASE_CLUES: ClueToggles = { connectivity: true, lineTotals: true }
/** Base plus 010's `{n}` / `-n-` row annotations. */
const LC_CLUES: ClueToggles = { ...BASE_CLUES, lineConnectivity: true }
/** Base plus 018's `E` / `O` parity clues. */
const EO_CLUES: ClueToggles = { ...BASE_CLUES, evenOdd: true }
/** Both optional clue mechanics at once — the pair the segment order governs. */
const LC_EO_CLUES: ClueToggles = { ...BASE_CLUES, lineConnectivity: true, evenOdd: true }

/**
 * `[seed, size, difficulty, sha256(serializeBoard(...)) first 16 hex chars, extra?]`
 *
 * `extra` names anything beyond the base clue set — a richer clue set, a
 * silhouette. Omitting it means the defaults, which is why every row captured
 * before optional mechanics existed still reads exactly as it did.
 */
type FrozenRow = readonly [
  string,
  SizeTier,
  DifficultyTier,
  string,
  { clues?: ClueToggles; shape?: ShapeId }?,
]

const FROZEN: ReadonlyArray<FrozenRow> = [
  ['CORAL-4417', 'Small', 'Calm', 'fbee2b388e2c4400'],
  ['CORAL-4417', 'Small', 'Tricky', '06ac497c4b84c5da'],
  ['CORAL-4417', 'Small', 'Deep', '32a3f6a0dae3e1f8'],
  ['CORAL-4417', 'Medium', 'Calm', 'f129602b1709c7e3'],
  ['CORAL-4417', 'Medium', 'Tricky', '9397a53abca827de'],
  ['CORAL-4417', 'Medium', 'Deep', 'f489dc2dc8a8d6d7'],
  ['KELP-0007', 'Small', 'Calm', '5d57572e781364ea'],
  ['KELP-0007', 'Small', 'Tricky', 'ff4f0148df11abf3'],
  ['KELP-0007', 'Small', 'Deep', '5c8b1541a1532faa'],
  ['KELP-0007', 'Medium', 'Calm', 'f859c2e4169f5794'],
  ['KELP-0007', 'Medium', 'Tricky', 'be504c9f8e77c6a6'],
  ['KELP-0007', 'Medium', 'Deep', '2faecbe37b1b2f1c'],
  ['TIDE-1234', 'Small', 'Calm', '66428165cef42524'],
  ['TIDE-1234', 'Small', 'Tricky', '9c93acdaa484e9e4'],
  ['TIDE-1234', 'Small', 'Deep', 'd79cd14c0bf8f65e'],
  ['TIDE-1234', 'Medium', 'Calm', '28a40fffc01d5e87'],
  ['TIDE-1234', 'Medium', 'Tricky', '976ef15361d48532'],
  ['TIDE-1234', 'Medium', 'Deep', '74b5c2e111d54725'],
  ['COVE-0001', 'Small', 'Calm', 'dd0c5345b8f47635'],
  ['COVE-0001', 'Small', 'Tricky', 'bc08e40abfb7299e'],
  ['COVE-0001', 'Small', 'Deep', 'b01b8b70c6f138cb'],
  ['COVE-0001', 'Medium', 'Calm', 'd0a8ef582ebd41a5'],
  ['COVE-0001', 'Medium', 'Tricky', '9b9e048e6338df1e'],
  ['COVE-0001', 'Medium', 'Deep', '1f0df55104e00c82'],
  ['SHELL-0001', 'Small', 'Calm', 'ae48bb3d4d14c33d'],
  ['SHELL-0001', 'Small', 'Tricky', 'c6a2ac6ace24fe34'],
  ['SHELL-0001', 'Small', 'Deep', '885346b25952a098'],
  ['SHELL-0001', 'Medium', 'Calm', '58eebf71fc4327df'],
  ['SHELL-0001', 'Medium', 'Tricky', '290583346d18887b'],
  ['SHELL-0001', 'Medium', 'Deep', '26193fd8a24174b4'],
  ['FOAM-0002', 'Small', 'Calm', '7669d4fad4efb03b'],
  ['FOAM-0002', 'Small', 'Tricky', 'bf35124649bd6879'],
  ['FOAM-0002', 'Small', 'Deep', '9a76a089fa4e5c76'],
  ['FOAM-0002', 'Medium', 'Calm', '0b8811419dce4f9c'],
  ['FOAM-0002', 'Medium', 'Tricky', 'e900555726a01b69'],
  ['FOAM-0002', 'Medium', 'Deep', '98e37bc143ae306b'],

  // ── Optional mechanics (added with 018) ────────────────────────────────────
  // These combinations ship today and were NOT covered before: 010's row
  // annotations ride on 18 curated Deep boards, 012's silhouettes on the rest of
  // the pack, and 016 made both reachable in Endless. Feature 016's own spec
  // noted the gap — "the fingerprint table does not cover them, so nothing would
  // have caught it" — and 018 adds a third optional seed segment, which is
  // exactly the change that would break the ones composing two.
  ['KELP-0007', 'Large', 'Deep', '8f120bfbf6ca6cc7', { clues: LC_CLUES }],
  ['CORAL-4417', 'Large', 'Deep', '5cf453922fa3f2b0', { clues: LC_CLUES }],
  ['TIDE-1234', 'Medium', 'Deep', '1bebeae066ad1bb9', { clues: LC_CLUES }],
  ['KELP-0007', 'Large', 'Deep', '1d2d2a999345ee71', { shape: 'atoll' }],
  ['COVE-0001', 'Medium', 'Tricky', '570395fb5901dd72', { shape: 'wedge' }],
  ['SHELL-0001', 'Large', 'Calm', '965031e50c0678e7', { shape: 'crescent' }],
  // Both at once — the composition the segment ORDER governs.
  ['KELP-0007', 'Large', 'Deep', '9f63eb297479de52', { clues: LC_CLUES, shape: 'shoal' }],
  ['FOAM-0002', 'Medium', 'Deep', '09cf8d32890285cb', { clues: LC_CLUES, shape: 'atoll' }],

  // ── Parity clues — the rows that have been moved, and must not be again ────
  //
  // Captured as 018 shipped, then re-captured three times during 019 — when
  // parity reached the edge totals, when it learned to carry `{}`/`--`, and when
  // playtest ruled that a framed mark needs a count of at least three. All four
  // were legitimate for one reason: 018 had never been released, so no player
  // held one of these seeds and no save regenerated from them.
  //
  // **That reason expired on 2026-08-17, when 1.3.0 went live.** These rows then
  // became promises exactly like the 44 above.
  //
  // They were recaptured once more anyway, on 2026-08-18, for 022's density cap
  // — and this is the only entry in this file where a row describing a SHIPPED
  // board was deliberately moved. It was not a technical decision and is not
  // recorded as one. Jon played two Deep boards, measured at 52% and 64% of
  // their stones withholding a count, and twice said there were too many. The
  // sweep behind him: 47% of stones on average and 86% on the worst board in
  // fifty. The alternative to moving these rows was shipping that permanently.
  // He was shown the cost — every evenOdd seed regenerates, one day after the
  // mechanic reached players — and chose the cap.
  //
  // **This is the last one.** The justification above does not generalise: it
  // needed a shipped-yesterday mechanic, a measured defect, and the owner's
  // explicit call with the cost in front of him. Absent all three, a red row
  // here means the same thing a red row above means — a change escaped its gate.
  //
  // Recapturing is the correct fix roughly never. If you are reading this
  // because one of them just went red, the question is whether your change was
  // *supposed* to alter what an evenOdd board looks like. If it was not, the
  // table is doing its job and the bug is upstream.
  ['KELP-0007', 'Large', 'Deep', '65fe35a747e4fcca', { clues: EO_CLUES }],
  ['CORAL-4417', 'Medium', 'Deep', 'b6eb1f0e84a4a0b8', { clues: EO_CLUES }],
  ['TIDE-1234', 'Small', 'Deep', '35cefeb25f3ce536', { clues: EO_CLUES }],
  ['KELP-0007', 'Large', 'Deep', 'afdbaa1c08f5b648', { clues: LC_EO_CLUES }],
  ['FOAM-0002', 'Medium', 'Deep', '785952d520479b9d', { clues: LC_EO_CLUES, shape: 'atoll' }],
]

function fingerprint(p: BoardParams): string {
  return createHash('sha256').update(serializeBoard(generateBoard(p))).digest('hex').slice(0, 16)
}

/** The full params a row describes — `extra` filling in for the defaults. */
function paramsOf(row: FrozenRow): BoardParams {
  const [seed, size, difficulty, , extra] = row
  return {
    seed,
    size,
    difficulty,
    clues: extra?.clues ?? BASE_CLUES,
    ...(extra?.shape ? { shape: extra.shape } : {}),
  }
}

/** What the row is called in test output — the extras have to show, or two rows
 *  differing only by clue set would be indistinguishable when one fails. */
function labelOf(row: FrozenRow): string {
  const [seed, size, difficulty, , extra] = row
  const parts: string[] = []
  if (extra?.clues?.lineConnectivity) parts.push('lineConnectivity')
  if (extra?.clues?.evenOdd) parts.push('evenOdd')
  if (extra?.shape) parts.push(extra.shape)
  return `${seed} ${size}/${difficulty}${parts.length ? ` (${parts.join(' + ')})` : ''}`
}

describe('frozen board fingerprints (Principle XI)', () => {
  for (const row of FROZEN) {
    it(`${labelOf(row)} is the board it has always been`, () => {
      expect(
        fingerprint(paramsOf(row)),
        'This seed now produces a DIFFERENT board. See the note at the top of this file.',
      ).toBe(row[3])
    })
  }

  it('the table is actually discriminating (a changed seed changes the hash)', () => {
    // Guards against the table silently passing because fingerprint() is broken.
    const base = { size: 'Small' as const, difficulty: 'Calm' as const, clues: BASE_CLUES }
    expect(fingerprint({ ...base, seed: 'CORAL-4417' })).not.toBe(
      fingerprint({ ...base, seed: 'KELP-0007' }),
    )
  })

  it('an optional mechanic changes the board (so those rows are load-bearing too)', () => {
    // If a toggle did NOT change the board, its rows below would be duplicates of
    // the base rows and would silently stop guarding anything.
    const base = { seed: 'KELP-0007', size: 'Large' as const, difficulty: 'Deep' as const }
    expect(fingerprint({ ...base, clues: BASE_CLUES })).not.toBe(
      fingerprint({ ...base, clues: { ...BASE_CLUES, lineConnectivity: true } }),
    )
  })
})
