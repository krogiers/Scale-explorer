import { GROOVES, planGroove } from './grooves';
import { fifthAbove } from './tones';
import type { LoopOptions, PlannedNote, TimelineItem } from './types';

/** Zoek bij een tel (vanaf 0) welk akkoord klinkt en de hoeveelste tel daarvan het is. */
export function locate(timeline: TimelineItem[], beat: number): { chord: number; beat: number } {
  const total = timeline.reduce((s, x) => s + x.beats, 0);
  let b = ((beat % total) + total) % total;
  for (let i = 0; i < timeline.length; i++) {
    if (b < timeline[i].beats) return { chord: i, beat: b };
    b -= timeline[i].beats;
  }
  return { chord: 0, beat: 0 };
}

/**
 * Wat er op tel `beat` (vanaf 0, telt door over de maten) te spelen valt. `next` is het volgende akkoord,
 * voor de naderingsnoot van de walking bass en de aanloop in de bossa.
 */
export function planBeat(item: TimelineItem, beatInChord: number, beat: number, opts: Pick<LoopOptions, 'bpm' | 'style' | 'meter'>, next?: TimelineItem): PlannedNote[] {
  const spb = 60 / opts.bpm;
  const [bass, ...upper] = item.voicing;
  if (bass === undefined) return [];
  if (opts.style !== 'sustain' && opts.style !== 'comp') return planGroove(GROOVES[opts.style], item, beatInChord, beat, opts, next);
  const beatInBar = beat % opts.meter;
  if (opts.style === 'sustain') {
    if (beatInChord !== 0) return [];
    const duration = item.beats * spb * 0.95;
    return [
      { midi: bass, offset: 0, duration, vel: 0.9, part: 'bass' },
      ...upper.map((midi, i) => ({ midi, offset: 0.012 * (i + 1), duration, vel: 0.6, part: 'keys' as const })),
    ];
  }
  // ritmisch, volgens de maat: in 4/4 bas op 1 en 3 (grondtoon, dan kwint) en akkoord op 2 en 4;
  // in 3/4 bas op 1 en akkoord op 2 en 3. Een nieuw akkoord krijgt altijd zijn grondtoon in de bas.
  const bassBeat = opts.meter === 3 ? beatInBar === 0 : beatInBar % 2 === 0;
  const out: PlannedNote[] = [];
  if (bassBeat || beatInChord === 0) {
    const useFifth = beatInChord !== 0 && opts.meter !== 3 && beatInBar === 2;
    out.push({ midi: useFifth ? fifthAbove(bass, upper) : bass, offset: 0, duration: spb * 0.9, vel: 1, part: 'bass' });
  }
  // een akkoord van één tel op een bastel zou anders nooit klinken
  if (!bassBeat || item.beats === 1) {
    out.push(...upper.map((midi) => ({ midi, offset: 0, duration: spb * 0.4, vel: 0.55, part: 'keys' as const })));
  }
  return out;
}
