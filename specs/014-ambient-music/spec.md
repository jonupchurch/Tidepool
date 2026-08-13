# Feature Specification: Ambient Music & Its Off Switch

**Feature Branch**: `014-ambient-music`

**Created**: 2026-08-13

**Status**: Draft

**Input**: Ambient music is being written (in Suno) for the game; include a button to disable music. The switch must be independent of the existing sound-effects mute.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Turn the music off, keep the sounds (Priority: P1)

The player switches the music off and keeps playing with the water and stone sounds intact. The switch is one press, from the same place the existing sound toggle lives.

**Why this priority**: This is the ask, and it is the combination most people want — a quiet room, but still the feedback that tells you a mark landed.

**Independent Test**: With music playing, press the music toggle; confirm music stops, marking a cell still makes its sound, and the state survives a restart.

**Acceptance Scenarios**:

1. **Given** music playing, **When** the player switches music off, **Then** the music stops and sound effects continue.
2. **Given** music off, **When** the player switches it on, **Then** music resumes without restarting the app.
3. **Given** any music setting, **When** the app is restarted, **Then** that setting is still in force.
4. **Given** the existing overall mute, **When** it is on, **Then** nothing is audible regardless of the music setting; **When** it is turned off, **Then** the music setting is honoured again.

---

### User Story 2 - Music plays, gently and continuously (Priority: P1)

Ambient music plays under the game, loops without a seam, and does not restart every time the player changes screen.

**Why this priority**: Ambient music that gaps, clicks, or restarts on navigation is worse than none — it draws attention to itself, which is the opposite of ambient.

**Independent Test**: Let a track play through at least one full loop while moving between home, a board, and the journal; listen for seams and restarts.

**Acceptance Scenarios**:

1. **Given** music on, **When** a track reaches its end, **Then** it continues without an audible gap.
2. **Given** music playing, **When** the player moves between screens, **Then** the music continues uninterrupted.
3. **Given** the app has just opened, **When** no interaction has happened yet, **Then** music does not attempt to force itself past the platform's autoplay rules; it begins at the player's first interaction.

---

### User Story 3 - Reach the switch from where you are (Priority: P2)

The music toggle is available beside the existing sound toggle on the main menu, and from the pause overlay during a board — so a player who needs quiet does not have to abandon a board to get it.

**Why this priority**: Needing silence is usually urgent. Making someone quit to the menu for it is a poor answer.

**Independent Test**: Toggle music from the main menu and from the pause overlay; confirm both change the same setting and both reflect the current state.

**Acceptance Scenarios**:

1. **Given** the main menu, **When** the player looks at the toggles, **Then** a music control sits alongside the existing sound control, each clearly labelled and each showing its own state.
2. **Given** a board in progress, **When** the player pauses, **Then** the music can be switched from there and the change takes effect immediately.
3. **Given** a screen reader or keyboard-only player, **When** they reach the music control, **Then** it is labelled, reachable, and its on/off state is announced.

---

### User Story 4 - Ships safely before the music does (Priority: P1)

The switch, the settings, and the plumbing can ship before any track exists, and the game is silent-but-correct until the audio is dropped in.

**Why this priority**: The music is being written separately. The feature must not be blocked on it, and a missing track must never break the game.

**Independent Test**: Build and run with no music files present; confirm the game plays normally, the toggle works, and nothing errors.

**Acceptance Scenarios**:

1. **Given** no music track is present, **When** the game runs, **Then** it plays silently with no error, and the music toggle still works and persists.
2. **Given** a music track is added later, **When** the game runs, **Then** it plays with no other change required.
3. **Given** a track that cannot be loaded or decoded, **When** the game runs, **Then** it degrades to silence rather than failing.

### Edge Cases

- The platform blocks audio until the player interacts: music waits for the first interaction rather than failing or retrying noisily.
- The player switches music off while a track is mid-phrase: it stops without a click or pop.
- The player switches music off and on rapidly: no overlapping tracks, no doubled playback.
- The app is backgrounded or the desktop window loses focus: covered by the existing overall behaviour; this feature adds no new rule.
- Music and sound effects at their loudest together must not clip.
- A save written before this feature has no music preference: it reads as absent and takes the default, not as corrupt.
- Whatever ships must be licensed for commercial release on Steam, with that provenance recorded alongside the files as the existing audio assets do.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST play looping ambient music, independent of the sound-effects channel.
- **FR-002**: The player MUST be able to switch music off and on without affecting sound effects.
- **FR-003**: The music setting MUST persist across restarts.
- **FR-004**: The existing overall mute MUST continue to silence everything, including music, without altering the stored music setting.
- **FR-005**: Music MUST loop without an audible gap and MUST NOT restart on screen changes.
- **FR-006**: Music MUST NOT start before the player's first interaction, in line with platform autoplay rules.
- **FR-007**: A music control MUST be present on the main menu alongside the existing sound control, and in the pause overlay.
- **FR-008**: Every music control MUST be keyboard reachable, labelled, and MUST announce its state to assistive technology.
- **FR-009**: A missing, unreadable, or undecodable music track MUST degrade to silence and MUST NOT break the game.
- **FR-010**: The feature MUST be shippable and verifiable before any track exists.
- **FR-011**: Music and sound effects MUST be independently levelled so that both at once do not clip.
- **FR-012**: Shipped music files MUST carry their licence and provenance alongside them, as the existing audio assets do.

### Key Entities

- **Music channel**: a separate audio path from sound effects, with its own level and its own on/off state.
- **Sound settings**: the persisted sound preferences (overall mute, volume, effect and ambient levels). Gains a music on/off preference.
- **Music track**: a looping ambient audio asset, with recorded licence and provenance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Music can be switched off and on in one interaction from the main menu and from the pause overlay, and the change is audible immediately.
- **SC-002**: The music setting survives a restart 100% of the time, on desktop and in the browser.
- **SC-003**: With music off, sound effects remain fully audible; with overall mute on, nothing is audible.
- **SC-004**: The game runs correctly with no music files present, and gains music by adding the files alone.
- **SC-005**: A full loop plays with no audible seam and no restart across at least three screen changes.
- **SC-006**: Every music control is operable by keyboard alone and announces its state.

## Assumptions

- Music is written externally (Suno) and delivered as finished looping audio. Composition, mastering, and choosing the tracks are outside this feature; this feature is the channel, the switch, and the plumbing.
- One ambient bed is enough to start. Per-screen or adaptive music is out of scope, though the channel should not make it impossible later.
- The switch is a plain on/off, not a slider. The settings model already carries an ambient level, and the visible control stays a toggle so the menu stays calm; anything finer belongs to a full settings screen, which remains unbuilt and is out of scope here.
- The existing sound control keeps meaning "everything", so a player who wants total quiet has one press to get it — the music switch is the finer-grained option, not a replacement.
- Music files add meaningfully to the download; keeping the shipped set small is a constraint on the audio, not a reason to change the plumbing.
