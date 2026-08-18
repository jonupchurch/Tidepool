// settings.ts — the pure settings model (006). Mirrors `journal.ts`: the model
// and its merge/coercion live here, the store + persistence adapter next door in
// `settings-store.ts`. The persisted shape is the platform's `SettingsRecord`
// (008); this resolves any such record — partial, older, or malformed — into a
// fully-populated `Settings` so every field has a first-run default (FR-010).
// Pure: no DOM, no I/O.
import type { DifficultyTier, SizeTier } from '@/core'
import { DIFFICULTY_TIERS, SIZE_TIERS } from '@/core'
import type { SettingsRecord } from '@/platform'
// Straight at the module, not the `board-source` barrel: settings only needs the
// shore vocabulary, and the barrel drags in the curated manifest with it.
import { DEFAULT_SHORE, type ShoreChoice, isShoreChoice } from './board-source/shore'

/** Daylight, the designed Night Tide dark palette, or follow the OS. */
export type ThemeChoice = 'Day' | 'Night' | 'Auto'
export const THEME_CHOICES: readonly ThemeChoice[] = ['Day', 'Night', 'Auto']

export interface Settings {
  /** `muted` is the master switch (everything). `music` is the ambient bed
   *  alone, so "quiet room, but still hear my marks land" is one press. */
  /** `muted` is the master. `music` and `effects` are the two channels' own
   *  switches, each with its own level (`ambient` / `sfx`) — so "the bed, but
   *  no marks" and "the marks, but no bed" are both sayable (017). */
  sound: {
    muted: boolean
    volume: number
    sfx: number
    ambient: number
    music: boolean
    effects: boolean
  }
  visuals: {
    theme: ThemeChoice
    reducedMotion: boolean
    textScale: number
    colorblind: boolean
    highContrast: boolean
    cellScale: number
  }
  controls: { swapMarkButtons: boolean; tapToCycle: boolean; confirmBeforeClear: boolean }
  /** Comfort aids — framed as comfort, never "easy mode" (FR-005). */
  comfort: { hoverHighlight: boolean; mistakeNudge: boolean; lineHelper: boolean }
  /** `defaultShore` / `edgeHints` are the Endless variety choices (016). They
   *  are play *defaults*, not board state — a curated entry names its own. */
  play: {
    defaultSize: SizeTier
    defaultDifficulty: DifficultyTier
    stopwatch: boolean
    defaultShore: ShoreChoice
    edgeHints: boolean
    /** 018 — `+` / `|` parity clues. Deep-only; `evenOddApply` is the gate. */
    evenOdd: boolean
  }
}

export const DEFAULT_SETTINGS: Settings = {
  sound: { muted: false, volume: 0.8, sfx: 1, ambient: 0.5, music: true, effects: true },
  visuals: {
    theme: 'Day',
    reducedMotion: false,
    textScale: 1,
    colorblind: false,
    highContrast: false,
    cellScale: 1,
  },
  controls: { swapMarkButtons: false, tapToCycle: false, confirmBeforeClear: false },
  comfort: { hoverHighlight: true, mistakeNudge: true, lineHelper: false },
  play: {
    defaultSize: 'Small',
    defaultDifficulty: 'Calm',
    stopwatch: false,
    // The filled hexagon with plain totals — what every Endless board was
    // before 016, so an untouched install plays exactly as it did.
    defaultShore: DEFAULT_SHORE,
    edgeHints: false,
    evenOdd: false,
  },
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

/** A boolean field, falling back to the default when absent or the wrong type. */
const bool = (x: unknown, fallback: boolean): boolean => (typeof x === 'boolean' ? x : fallback)

/** A 0..1-style number clamped to [min, max]; non-finite input falls back. */
function num(x: unknown, fallback: number, min: number, max: number): number {
  if (typeof x !== 'number' || !Number.isFinite(x)) return fallback
  return Math.min(max, Math.max(min, x))
}

function choice<T extends string>(x: unknown, allowed: readonly T[], fallback: T): T {
  return typeof x === 'string' && (allowed as readonly string[]).includes(x) ? (x as T) : fallback
}

/**
 * Resolve any persisted settings shape into a complete `Settings`. Missing
 * groups/fields take their default, out-of-range numbers are clamped, and
 * unknown values are rejected rather than trusted — so an older or hand-edited
 * record can never leave a setting undefined.
 */
export function resolveSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS
  if (!isObj(raw)) return structuredCloneish(d)

  const sound = isObj(raw.sound) ? raw.sound : {}
  const visuals = isObj(raw.visuals) ? raw.visuals : {}
  const controls = isObj(raw.controls) ? raw.controls : {}
  const comfort = isObj(raw.comfort) ? raw.comfort : {}
  const play = isObj(raw.play) ? raw.play : {}

  return {
    sound: {
      muted: bool(sound.muted, d.sound.muted),
      volume: num(sound.volume, d.sound.volume, 0, 1),
      sfx: num(sound.sfx, d.sound.sfx, 0, 1),
      ambient: num(sound.ambient, d.sound.ambient, 0, 1),
      music: bool(sound.music, d.sound.music),
      effects: bool(sound.effects, d.sound.effects),
    },
    visuals: {
      theme: choice(visuals.theme, THEME_CHOICES, d.visuals.theme),
      reducedMotion: bool(visuals.reducedMotion, d.visuals.reducedMotion),
      textScale: num(visuals.textScale, d.visuals.textScale, 0.8, 1.5),
      colorblind: bool(visuals.colorblind, d.visuals.colorblind),
      highContrast: bool(visuals.highContrast, d.visuals.highContrast),
      cellScale: num(visuals.cellScale, d.visuals.cellScale, 0.8, 1.4),
    },
    controls: {
      swapMarkButtons: bool(controls.swapMarkButtons, d.controls.swapMarkButtons),
      tapToCycle: bool(controls.tapToCycle, d.controls.tapToCycle),
      confirmBeforeClear: bool(controls.confirmBeforeClear, d.controls.confirmBeforeClear),
    },
    comfort: {
      hoverHighlight: bool(comfort.hoverHighlight, d.comfort.hoverHighlight),
      mistakeNudge: bool(comfort.mistakeNudge, d.comfort.mistakeNudge),
      lineHelper: bool(comfort.lineHelper, d.comfort.lineHelper),
    },
    play: {
      defaultSize: choice(play.defaultSize, SIZE_TIERS, d.play.defaultSize),
      defaultDifficulty: choice(play.defaultDifficulty, DIFFICULTY_TIERS, d.play.defaultDifficulty),
      stopwatch: bool(play.stopwatch, d.play.stopwatch),
      // Validated, not trusted: an unknown shore id falls back to the hexagon
      // rather than reaching `generateBoard`, which refuses it outright.
      defaultShore: isShoreChoice(play.defaultShore) ? play.defaultShore : d.play.defaultShore,
      edgeHints: bool(play.edgeHints, d.play.edgeHints),
      evenOdd: bool(play.evenOdd, d.play.evenOdd),
    },
  }
}

/** Back to the persisted record shape (008 owns the `v`). */
export function toSettingsRecord(s: Settings, v = 1): SettingsRecord {
  return { v, sound: { ...s.sound }, visuals: { ...s.visuals }, controls: { ...s.controls }, comfort: { ...s.comfort }, play: { ...s.play } }
}

/** A fresh deep copy of a Settings value (no structuredClone in every host). */
function structuredCloneish(s: Settings): Settings {
  return {
    sound: { ...s.sound },
    visuals: { ...s.visuals },
    controls: { ...s.controls },
    comfort: { ...s.comfort },
    play: { ...s.play },
  }
}

export { structuredCloneish as cloneSettings }
