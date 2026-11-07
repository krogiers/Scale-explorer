/**
 * Voordeur van het geluid. types: de interface; engine/: de motor (opnames, synth, drums);
 * loop/: de meespeelloop; events: wat een akkoord, ladder of progressie speelt; voicing: stemvoering.
 */
import { SampledEngine } from './engine/SampledEngine';
import { takeOver } from './transport';
import type { AudioEngine, NoteEvent } from './types';

export * from './types';
export * from './events';
export { progressionVoicings, voiceLead, voicing } from './voicing';

export { release, takeOver } from './transport';

export const audio: AudioEngine = new SampledEngine();

/** Iets eenmaligs spelen (akkoord, ladder, progressie): wat er speelde, ook de loop, wordt eerst stilgezet. */
const cut = () => audio.stopAll();
export function playOnly(events: NoteEvent[]) {
  takeOver(cut);
  audio.play(events);
}
