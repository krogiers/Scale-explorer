/**
 * Voordeur van het geluid. types: de interface; engine/: de motor (opnames, synth, drums);
 * loop/: de meespeelloop; events: wat een akkoord, ladder of progressie speelt; voicing: stemvoering.
 */
import { SampledEngine } from './engine/SampledEngine';
import type { AudioEngine } from './types';

export * from './types';
export * from './events';
export { progressionVoicings, voiceLead, voicing } from './voicing';

export const audio: AudioEngine = new SampledEngine();
