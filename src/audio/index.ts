/**
 * Voordeur van het geluid. types: de interface; engine/: de motor (opnames, synth, drums);
 * loop/: de meespeelloop; events: wat een akkoord, ladder of progressie speelt; voicing: stemvoering.
 */
import { SampledEngine } from './engine/SampledEngine';
import { release, takeOver } from './transport';
import type { AudioEngine, NoteEvent } from './types';

export * from './types';
export * from './events';
export { progressionVoicings, voiceLead, voicing } from './voicing';

export { playing, release, stopCurrent, subscribe, takeOver } from './transport';

export const audio: AudioEngine = new SampledEngine();

/**
 * Iets eenmaligs spelen (akkoord, ladder, progressie) onder een naam: wat er speelde, ook de loop,
 * wordt eerst stilgezet. Als de laatste noot uitgeklonken is, speelt er niets meer.
 */
export function playOnly(events: NoteEvent[], id = 'preview') {
  const cut = () => audio.stopAll();
  takeOver(id, cut);
  audio.play(events);
  const end = events.reduce((m, [, at, dur]) => Math.max(m, at + dur), 0);
  window.setTimeout(() => release(cut), (end + 0.4) * 1000);
}
