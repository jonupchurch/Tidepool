# Feature Specification: Shore Journal — Creature Collection

**Feature Branch**: `005-shore-journal`

**Created**: 2026-07-24

**Status**: Draft

**Input**: A gentle field-guide of the tide-pool creatures the player discovers across all boards. A grid of illustrated cards; undiscovered creatures are faint silhouettes ("not yet found"). Each discovered card shows the creature, a warm one-line description, its rarity, and light discovery detail (how many times / where first found). This is the low-pressure meta-progression that gives endless play a sense of accumulation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse discovered creatures (Priority: P1)

The player opens the Shore Journal and sees a grid of creature cards: discovered ones show the illustration, name, rarity, and a warm description; undiscovered ones are faint silhouettes labelled "not yet found."

**Why this priority**: The journal is the meta-collection that pulls players back; browsing it is its whole purpose.

**Independent Test**: With some creatures discovered, open the journal; confirm found cards show art/description and undiscovered ones show silhouettes.

**Acceptance Scenarios**:

1. **Given** a mix of found and unfound creatures, **When** the journal renders, **Then** found cards show illustration + name + rarity + description, and unfound cards show a silhouette + "not yet found."
2. **Given** the full catalog, **When** rendered, **Then** the count "X of Y found" is accurate.

### User Story 2 - Record a discovery (Priority: P1)

When the player solves a pool and meets a creature (from Gameplay), the journal records it — first-found location (seed) and a running count — so the collection grows over time.

**Why this priority**: Without recording, the collection never fills; this is the accumulation loop.

**Independent Test**: Solve a pool that yields a not-yet-found creature; confirm the journal now marks it found with first-found seed and count 1; find it again → count increments.

**Acceptance Scenarios**:

1. **Given** an undiscovered creature, **When** the player first reveals it in Gameplay, **Then** the journal marks it found with the first-found seed and count 1.
2. **Given** an already-found creature, **When** revealed again, **Then** its count increments and first-found stays unchanged.

### User Story 3 - Filter + stats (Priority: P3)

The player can filter All / Found / Missing, and an optional footer shows gentle lifetime stats (boards solved, pools filled, creatures found).

**Why this priority**: Nice-to-have organization + a light sense of progress; not essential to the loop.

**Independent Test**: Toggle filters and confirm the visible set matches; confirm footer stats reflect recorded totals.

**Acceptance Scenarios**:

1. **Given** the journal, **When** "Missing" is selected, **Then** only undiscovered creatures show.
2. **Given** recorded progress, **When** the footer renders, **Then** boards solved / pools filled / creatures found are accurate.

### Edge Cases

- Zero discoveries (fresh player): all silhouettes, "0 of Y found," warm not-grey empty state.
- All discovered: a gentle "shore's full" acknowledgement (no hard "100%" fanfare needed).
- A creature defined in the catalog but with no art yet: shows a styled placeholder rather than breaking (only the crab has art today).
- Discovery recorded while offline / mid-session: persists locally and survives restart.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present a Shore Journal grid of all catalog creatures, showing discovered creatures with illustration, name, rarity, and a one-line description, and undiscovered ones as faint silhouettes labelled "not yet found."
- **FR-002**: The system MUST display an accurate "X of Y found" count.
- **FR-003**: The system MUST record a creature discovery when it is first revealed in Gameplay, storing the first-found seed and a running find count (via persistence 008).
- **FR-004**: Re-encountering a found creature MUST increment its count without altering its first-found record.
- **FR-005**: The system MUST offer All / Found / Missing filtering.
- **FR-006**: The system MAY show a gentle stats footer (boards solved, pools filled, creatures found) sourced from persistence.
- **FR-007**: Creature identity (type, rarity, description, unlock condition) MUST come from a single shared catalog also used by Gameplay's reward mapping (pool size → creature).
- **FR-008**: Missing creature art MUST degrade to a styled placeholder, never a broken card.

### Key Entities *(include if feature involves data)*

- **Creature (catalog)**: `{ id, name, rarity, description, unlock (e.g., pool-size range), art? }` — shipped, shared with Gameplay's reward mapping.
- **Discovery (record)**: per-creature `{ found: boolean, firstFoundSeed, count }` — persisted.
- **JournalStats**: lifetime totals (boards solved, pools filled, creatures found) — persisted/derived.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The "X of Y found" count and each card's found/silhouette state always match the recorded discoveries (100%).
- **SC-002**: A first discovery is recorded with the correct first-found seed and count 1; subsequent finds only increment the count.
- **SC-003**: Discoveries persist across restarts (100%).
- **SC-004**: The journal renders correctly at 0 discoveries and at full completion (warm states, no breakage).
- **SC-005**: Filters always show exactly the matching subset.

## Assumptions

- **Creature catalog** is a shared, shipped definition (also used by Gameplay 002); rarity/unlock keyed to pool size (bigger/rarer pools → rarer creatures).
- **Art**: only the crab exists now; all others render as styled placeholders until art lands (tracked in PLAN as a known gap).
- **Stats** are read from persistence (008); the journal displays, it doesn't compute the source-of-truth totals.
- **Discovery trigger** originates in Gameplay's pool-complete event; the journal owns the recording/read model.

## Dependencies

- **Gameplay (002)** — fires the discovery event on pool completion; shares the creature catalog + mapping.
- **Persistence (008)** — stores discoveries + stats.
- **App Shell (003)** — routes to the journal; shows a recent-creature stat on Home.
- **Board Modes (004)** — curated entries show the earned creature (same catalog).
