# Specification Quality Checklist: Even and Odd Clues in the Deep

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *see note 1*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders — *see note 1*
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
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

1. **Deliberate deviation on implementation references.** The spec names engine
   internals in a few places — the RNG seed string, the frozen fingerprint table,
   reduction's removal order, the solution counter. This matches the convention
   set by specs 010, 012 and 016 rather than the template default, and it is
   deliberate: on this project Principle XI ("the same seed yields the identical
   board on every machine, forever") *is* the user-facing requirement, and it
   cannot be stated without naming the machinery that can break it. FR-003 and
   FR-005 are the requirements most at risk of being lost to a tidier phrasing,
   and they are the two that protect shipped boards and live saves.

2. **No clarification markers were needed.** The one genuine design ambiguity —
   whether E/O replaces the count or joins it — resolves by argument rather than
   preference: a count already reveals its own parity, so joining says nothing.
   Recorded under Assumptions.

3. **The spec rests on measurement, not estimate.** The numbers in "Measured
   constraints" were taken before any requirement was written, including the
   control that rules out the survivals being mere redundancy. Two of them changed
   the design: the subtraction rule was dropped from scope (1 clue in 284), and
   the inertness property became FR-003.

4. **Open at planning time, by design**: glyph legibility in the numeral font
   stack, and whether ~⅓ of clues showing E/O reads as texture or as mush. Both
   are named in Assumptions as things to look at while building rather than guess
   now; neither blocks planning.
