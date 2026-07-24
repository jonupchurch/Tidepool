# Contract — Engine Public API (`src/core/index.ts`)

The surface `core/` exposes to the rest of the app. Signatures are the contract; bodies live in implementation. All functions are **pure** (same inputs → same outputs, no side effects, no ambient state).

## Generation

```ts
// Deterministic. Returns a minimal, verified board: solved && unique && guess-free.
// Advances through seed-derived candidates internally until one matches params.difficulty.
generateBoard(params: BoardParams): Board
```

- **Guarantees**: identical `params` → identical `Board` on any machine (SC-001). Result always passes `solve(board).solved && .unique` (SC-002). Every remaining clue is necessary (SC-003). `solve(board).rating === params.difficulty` (SC-004, ≥95% target; never mislabeled).
- **Errors**: throws only on invalid params (e.g., unknown tier). Never returns an unsolvable/ambiguous board.

## Solving / oracle / rating

```ts
// The solver, difficulty rater, and CI oracle in one. Accepts any board (generated or hand-supplied).
solve(board: Board): SolverResult
```

- **Guarantees**: `solved` true only if the technique catalog reaches a complete assignment with no guessing. `unique` reflects the independent solution counter. `rating` derived from `techniquesUsed` + `maxDepth`.

## RNG (exposed for testing/advanced use)

```ts
seedToRng(seed: SeedCode): Rng           // string → deterministic PRNG
nextInt(rng: Rng, maxExclusive: number): number
```

## Serialization

```ts
serializeBoard(board: Board): string     // canonical, stable ordering — for equality/oracle/save
deserializeBoard(s: string): Board
formatSeed(seed: SeedCode): string       // display form, e.g. "CORAL-4417"
parseSeed(input: string): SeedCode | null
```

## Contract tests (become Vitest specs)

1. `generateBoard(p)` twice with identical `p` → `serializeBoard` strings equal. *(determinism)*
2. For a sampled matrix of sizes × difficulties: every result satisfies `solve(b).solved && solve(b).unique`. *(solvability + uniqueness)*
3. For every present clue on a generated board, removing it makes `solve` no longer `solved && unique`. *(minimality)*
4. `solve(b).rating === p.difficulty` for ≥95% of a sampled batch per tier. *(rating fidelity)*
5. Hand-crafted fixtures: a known-unique board → `unique:true`; a known-ambiguous board → `unique:false`; a guess-requiring board → `solved:false`. *(oracle correctness)*
6. `deserializeBoard(serializeBoard(b))` deep-equals `b`. *(round-trip)*
