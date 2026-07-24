# Data Model — Persistence & Platform Seam

The persisted record shapes (illustrative). Each is namespaced and versioned; final types live in `src/platform/schemas.ts`.

## The seam

- **SaveStore** (interface):
  - `get<T>(key): Promise<T | null>`
  - `set<T>(key, value): Promise<void>`  *(debounced for autosave)*
  - `remove(key): Promise<void>`
  - `exportAll(): Promise<SaveBlob>`
  - `importAll(blob): Promise<{ ok: true } | { ok: false; reason: string }>`
- **Key form**: `tp:v{schemaVersion}:{namespace}` (e.g., `tp:v1:settings`).

## Namespaced records (each versioned)

- **InProgressBoard**: `{ v, request: {seed,size,difficulty}, marks: Record<cellKey, 'water'|'rock'>, revealed: string[] }` — the resumable session (board itself regenerated from `request`; only player state stored).
- **Settings**: `{ v, sound, visuals(theme…), controls, comfort, play, data }` (owned/shaped by 006).
- **Journal**: `{ v, discoveries: Record<creatureId, { firstFoundSeed, count }> }` (owned by 005).
- **Stats**: `{ v, boardsSolved, poolsFilled, creaturesFound }`.
- **CuratedProgress**: `{ v, solved: Record<entryId, { earnedCreatureId }> }` (owned by 004).
- **OnboardingState**: `{ v, completed: boolean, seen: boolean }` (owned by 007).
- **ShellPrefs**: `{ v, theme, muted }` (owned by 003).

## Export/import

- **SaveBlob**: `{ appVersion, schemaVersion, records: { settings, journal, stats, curatedProgress, onboarding, shellPrefs, inProgressBoard? } }`.
- Import validates `schemaVersion` (migrate if older, refuse-and-preserve if newer/unknown), then writes each namespace.

## Migration

- **Migration registry**: per-namespace ordered functions `vN → vN+1`.
- On read: if a record's `v` < current, run migrations to current; if `v` > current (from a newer app), do not write — surface a gentle "save is from a newer version" and keep it intact.
- On corrupt/unparseable single record: reset only that namespace to its default; never cascade.

## Invariants (from requirements)

- In-progress boards store only player state; the board is always reproducible from `request` via the engine (keeps saves tiny + robust — a schema drift in the engine can't corrupt a save).
- No namespace read/write occurs outside `src/platform` (SC-002).
- Every write is atomic per key (last-write-wins); no cross-key interleaving.
