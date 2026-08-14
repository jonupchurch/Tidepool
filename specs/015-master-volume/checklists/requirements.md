# Specification Quality Checklist: Master Volume

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-13
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- The honest framing of this feature is that **most of it already shipped**.
  `Settings.sound.volume` has driven the engine's master gain since 006/014; it
  has never had a control. The spec is written as the user experience it delivers
  rather than as "add a slider to an existing field", but the plan says plainly
  that the audio graph is not being built here.
- The one real ambiguity was how the slider and the existing mute switch relate.
  Two coherent answers existed — the slider drives mute (OS-style, so the speaker
  glyph never lies), or the two stay fully independent. Jon chose independent, so
  FR-007 fixes that and FR-008 covers the cost of the choice: while muted, the
  slider sets a level nothing can hear, and it must say so rather than looking
  live. Without FR-008 the chosen model has a silent lie in it.
- Placement was the other decision. Home *and* Pause, not one or the other, which
  follows the precedent 014 already set for the music switch and its recorded
  reasoning ("needing quiet is usually urgent").
- Per-channel sliders are the obvious adjacent idea and are deliberately not
  folded in. The fields (`sound.sfx`, `sound.ambient`) and their gain nodes exist,
  so it is a small feature later — but it is a different one, and the ask was a
  master.
- FR-009 (balance preserved) is worth stating separately from FR-001 because it
  is the property that a plausible refactor could break without failing any
  existing test. The plan's Phase 1 exists specifically to guard it.
