# Quickstart — Validating the Puzzle Engine

How to prove the engine works. The engine is pure TS with no UI, so validation is entirely via Vitest (fast, runs in Node/CI).

## Prerequisites

- Deps installed (`npm install`) — already done by the scaffold.
- Engine code present under `src/core/` (this feature's implementation).

## Run

```bash
npm run test            # all unit tests (Vitest)
npm run typecheck       # strict TS check
```

## What the tests must demonstrate (maps to Success Criteria)

| Scenario | How | Proves |
|---|---|---|
| **Determinism** | Generate from the same `{seed,size,difficulty}` twice; compare `serializeBoard`. | SC-001 — identical boards, every run |
| **Solvability** | For a sampled size×difficulty matrix, assert `solve(b).solved`. | SC-002 — guess-free by logic |
| **Uniqueness** | Same batch, assert `solve(b).unique`. | SC-002 — exactly one solution |
| **Minimal clues** | Remove each present clue in turn; assert the board is no longer uniquely guess-free. | SC-003 — every clue necessary |
| **Rating fidelity** | For each tier, assert ≥95% of a batch rate at the requested tier. | SC-004 — honest difficulty |
| **Oracle correctness** | Feed hand-authored unique / ambiguous / guess-requiring fixtures; assert verdicts. | SC-006 — solver is trustworthy |
| **Performance** | Time a ~250-cell generate+verify; assert under the budget. | SC-005 — ~2s large-board budget |
| **Round-trip** | `deserializeBoard(serializeBoard(b))` deep-equals `b`. | FR-013 — stable serialization |

## Manual smoke (optional, in a Node REPL / scratch test)

1. `generateBoard({ seed: 'CORAL-4417', size: 'Small', difficulty: 'Calm', clues: { connectivity: true, lineTotals: true } })`.
2. Print the board (a simple ASCII dump helper is fine) and confirm by hand it is solvable and the clues read sensibly.
3. Re-run step 1 → identical output.

## Definition of done for this feature

- All contract tests in `contracts/engine-api.md` pass as Vitest specs.
- `npm run test`, `npm run typecheck`, `npm run build` all green.
- No `Math.random` / `Date.now` / DOM references anywhere in `src/core/` (enforced by a test or lint check).
