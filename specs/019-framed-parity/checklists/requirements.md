# Specification Quality Checklist: Framed Parity

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *see note 1*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders — *see note 1*
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — *see note 2*
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details) — *see note 1*
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — *see note 1*

## Notes

1. **Same deliberate deviation as 010, 012, 016 and 018**: the spec names engine
   internals where Principle XI is the user-facing requirement — the fingerprint
   table, the solution counter, reduction's preference order. FR-008 and FR-003
   are the two that cannot be stated without them.

2. **No clarification markers, but one live decision.** The single-toggle
   assumption is sound *today* and wrong the moment 018 ships without 019. It is
   recorded under Assumptions and given its own "Sequencing risk" section rather
   than a marker, because the answer is not a preference — it follows from release
   order, which is the user's to choose. Flagged in the handoff.

3. **The spec corrects its own predecessor.** 018's plan predicted edge parity
   would be near-useless and used that to justify the non-goal. Measurement says
   40.1% with a 0% control. The prediction and its refutation are both recorded in
   "Measured constraints" — the reasoning was sound and the conclusion wrong,
   which is worth leaving visible rather than quietly overwriting.

4. **Known open items, deliberately not guessed**: whether a bare `|` reads as a
   clue in the margin (no tile behind it), and whether reduction's
   withhold-the-most preference produces boards that feel right. Both are
   "settle by looking / playing" items, consistent with how 018 handled the
   `E`/`O` glyph question — which the render then overturned.

5. **The largest risk in this spec is not in this spec.** 019 multiplies 018's
   clue vocabulary from two forms to six on a mechanic nobody has yet solved by
   hand. See "Sequencing risk".
