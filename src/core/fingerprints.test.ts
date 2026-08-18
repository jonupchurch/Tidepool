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

  // ── Parity clues — the rows that move, and the shrinking reason they may ──
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
  // They were recaptured once more anyway, on 2026-08-18, for 022's density cap.
  // That was the one deliberate move of a row describing a SHIPPED board, and it
  // was not a technical decision: Jon played two Deep boards measured at 52% and
  // 64% of their stones withholding a count, twice said there were too many, was
  // shown that the fix regenerates every evenOdd seed one day after the mechanic
  // reached players, and chose the cap. The note here then said, correctly for
  // what it knew: **this is the last one.**
  //
  // ── 024 moved all five again, the same day, and the reason is different ────
  //
  // Read this before treating it as a second exception, because it is not one.
  //
  // 022 shipped in **1.3.5, which was uploaded to Steam and never promoted**.
  // Players are still on 1.3.0. So the hashes 022 wrote into this table describe
  // boards **no player has ever held** — they were the *new* boards, the ones
  // that would exist once 1.3.5 went live. Jon then played them, said the
  // density was still too high, and 024 retuned the cap from 1/3 to 0.19.
  //
  // The cost of that is therefore **nothing beyond what 022 already paid**. The
  // evenOdd seeds a 1.3.0 player wrote down broke when 022 chose the cap; they
  // do not break a second time because 024 chose a different one. Both ship in
  // the same unpromoted release train, so a player sees exactly one change to
  // what an evenOdd seed means, not two. Re-editing an unreleased change is the
  // 018/019 situation again, not the 022 situation.
  //
  // **The condition, stated so it can be checked rather than remembered: these
  // rows are free to move only while no promoted Steam build contains the
  // density cap.** The moment a build carrying it goes live — 1.3.6 or whatever
  // supersedes it — that ends, and these five become promises like the 44 above
  // with no exception left to appeal to. Nobody should be reading this note for
  // permission; they should be checking which build is live.
  //
  // What has NOT changed: a red row here still means what a red row above means
  // unless your change was *supposed* to alter what an evenOdd board looks like.
  // Recapturing is the correct fix roughly never, and the tell that a move is
  // correctly gated is the other 44 — 022 and 024 both left every one of them
  // green on the first run, which is the whole value of the partition.
  ['KELP-0007', 'Large', 'Deep', 'a67b16a390b6aab6', { clues: EO_CLUES }],
  ['CORAL-4417', 'Medium', 'Deep', '247c32257334517f', { clues: EO_CLUES }],
  ['TIDE-1234', 'Small', 'Deep', '193bef247376ada0', { clues: EO_CLUES }],
  ['KELP-0007', 'Large', 'Deep', 'c7a72f2744b74af4', { clues: LC_EO_CLUES }],
  ['FOAM-0002', 'Medium', 'Deep', 'e338115b3c677ab1', { clues: LC_EO_CLUES, shape: 'atoll' }],
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
