# Implementation Plan: Persistence & Platform Seam

**Branch**: `008-persistence-platform` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

## Summary

A single `SaveStore` interface in `src/platform` that all stateful features use, with a web backend (localStorage for small KV, IndexedDB for blobs), a fake in-memory backend for tests, and a Tauri backend added later (009) — all interchangeable. Namespaced, versioned records with forward migration; whole-save export/import; graceful degradation. This seam is what keeps the web→desktop port a wrap.

## Technical Context

**Language/Version**: TypeScript (strict).

**Primary Dependencies**: Browser storage APIs (localStorage, IndexedDB — a tiny wrapper like `idb-keyval` is acceptable for IndexedDB; no ORM/DB). Engine (001) canonical serialization for boards.

**Storage**: localStorage (settings, prefs, small records) + IndexedDB (save blobs / larger records).

**Testing**: Vitest against the in-memory backend + a jsdom localStorage/IndexedDB backend; a scan test asserting no storage/OS calls outside `src/platform`; migration fixtures.

**Target Platform**: Browser now; Tauri webview later (same interface).

**Performance Goals**: Autosave writes are debounced and cheap; reads are instant for small data.

**Constraints**: No direct storage/OS calls outside the seam; failures never destroy valid data; everything versioned.

**Scale/Scope**: One interface, one web backend, one in-memory backend, a versioned schema set, a migration runner.

## Constitution Check

- **II. Validated boundaries** — imported blobs + on-disk records are untrusted: validate shape + version before use; isolate corrupt keys. ✅
- **III. Conventions** — everything OS/storage-specific lives in `src/platform` only (stack pack rule); consumers depend on the interface, not a backend. ✅
- **IV. Scope** — the seam stores/loads; it doesn't own the data shapes' meaning (features do) beyond schema/version plumbing. ✅
- **VIII. Testing** — pure logic (migration, validation, blob round-trip) unit-tested; a lint/scan test enforces the no-direct-access rule (SC-002). ✅

No violations.

## Project Structure

```text
src/platform/
├── save-store.ts       # SaveStore interface + namespaced keys + versioning
├── web-backend.ts      # localStorage + IndexedDB implementation
├── memory-backend.ts   # in-memory backend (tests + private-browsing fallback)
├── migrate.ts          # version migration runner + registry (pure, tested)
├── blob.ts             # export/import whole-save (validated, versioned)
├── schemas.ts          # persisted record shapes + current versions
├── index.ts            # provider selection (web now; tauri later, feature 009)
└── *.test.ts
```

**Structure Decision**: A backend-agnostic `SaveStore` with pluggable implementations. `index.ts` selects the backend by environment (browser → web-backend; test → memory; later Tauri → tauri-backend from 009). Consumers import only `SaveStore` + typed helpers, never a backend — this is the seam the whole port strategy rests on. See [data-model.md](./data-model.md) for the record shapes.

## Design notes

- **Key namespacing**: `tp:v{N}:{namespace}` (e.g., `tp:v1:settings`, `tp:v1:board:inprogress`), so versions and namespaces are explicit and migratable.
- **Sizing**: small records (settings, prefs, stats, onboarding, curated progress) in localStorage; in-progress board(s) + the export blob in IndexedDB (roomier, async).
- **Migration**: each namespace has a `version` + ordered migrations `vN→vN+1`; on read, migrate to current or fall back to default for that key only (corruption isolation).
- **Degradation**: if storage is unavailable (private mode/quota), fall back to `memory-backend` for the session with a gentle notice; already-saved data is never overwritten by the fallback.
- **Tauri readiness**: the interface is plain async get/set/remove/export/import so a native/file backend (+ Steam Auto-Cloud file patterns) drops in at 009.

## Quickstart (validation)

- `npm run test` — round-trip every namespace via memory + web backends; migration fixtures (older→current); blob export/import incl. malformed rejection; corrupt-single-key isolation; the scan test (no storage/OS calls outside `src/platform`).
- Manual — fill data, hard-reload, confirm exact restore; simulate quota error and confirm graceful notice.
