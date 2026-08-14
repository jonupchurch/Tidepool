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
import { createHash } from 'node:crypto'
import type { BoardParams, DifficultyTier, SizeTier } from './board'
import { generateBoard } from './generate'
import { serializeBoard } from './serialize'

/** [seed, size, difficulty, sha256(serializeBoard(...)) first 16 hex chars] */
const FROZEN: ReadonlyArray<[string, SizeTier, DifficultyTier, string]> = [
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
]

function fingerprint(p: BoardParams): string {
  return createHash('sha256').update(serializeBoard(generateBoard(p))).digest('hex').slice(0, 16)
}

describe('frozen board fingerprints (Principle XI)', () => {
  for (const [seed, size, difficulty, expected] of FROZEN) {
    it(`${seed} ${size}/${difficulty} is the board it has always been`, () => {
      const actual = fingerprint({
        seed,
        size,
        difficulty,
        clues: { connectivity: true, lineTotals: true },
      })
      expect(
        actual,
        'This seed now produces a DIFFERENT board. See the note at the top of this file.',
      ).toBe(expected)
    })
  }

  it('the table is actually discriminating (a changed seed changes the hash)', () => {
    // Guards against the table silently passing because fingerprint() is broken.
    const base = { size: 'Small' as const, difficulty: 'Calm' as const, clues: { connectivity: true, lineTotals: true } }
    expect(fingerprint({ ...base, seed: 'CORAL-4417' })).not.toBe(
      fingerprint({ ...base, seed: 'KELP-0007' }),
    )
  })
})
