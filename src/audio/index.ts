// audio — game sound effects. A small Web Audio player driven by the game's
// event vocabulary; silent until sound files are dropped into src/assets/audio/.
export { getAudioEngine, resetAudioEngineForTests, effectiveGain } from './audio-engine'
export type { AudioEngine } from './audio-engine'
export { SOUND_IDS, SOUND_URLS } from './sounds'
export type { SoundId } from './sounds'
