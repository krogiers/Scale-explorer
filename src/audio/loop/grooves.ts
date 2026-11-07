import type { Drum } from '../types';
import { bassTone, type Tone } from './tones';
import type { LoopOptions, LoopStyle, PlannedNote, TimelineItem } from './types';

/*
 * Grooves: patronen per maat (of per twee maten), met posities in tellen vanaf het begin van het patroon.
 * In een geswingde stijl valt de "en" (x.5) later, op swingRatio van de tel: lang-kort in plaats van gelijk.
 * Bastonen: R = grondtoon, 5 = kwint, O = octaaf, 7 = septiem (of octaaf), W = walking bass,
 * B = boogie (1 3 5 6 ♭7 6 5 3), A = aanloop naar het volgende akkoord op de laatste tel ervan.
 */
type Hit = [at: number, len: number, vel?: number];
interface Groove {
  swing: boolean;
  /** Lengte van het patroon in maten. */
  bars: number;
  bass: Record<3 | 4, [at: number, tone: Tone, len: number, vel?: number][]>;
  keys: Record<3 | 4, Hit[]>;
  drums: Record<3 | 4, [at: number, kind: Drum, vel: number][]>;
}
const every = (n: number, step: number, f: (at: number, i: number) => [number, Drum, number][]) =>
  Array.from({ length: Math.round(n / step) }, (_, i) => f(i * step, i)).flat();

export const GROOVES: Record<Exclude<LoopStyle, 'comp' | 'sustain'>, Groove> = {
  // walking bass in kwarten, Charleston-akkoorden (1 en de "en" van 2), ride "ding, ding-a-ding", hihat op 2 en 4
  swing: {
    swing: true, bars: 1,
    bass: { 4: [[0, 'W', 0.95], [1, 'W', 0.95], [2, 'W', 0.95], [3, 'W', 0.95]], 3: [[0, 'W', 0.95], [1, 'W', 0.95], [2, 'W', 0.95]] },
    keys: { 4: [[0, 0.35], [1.5, 0.3]], 3: [[1, 0.4], [2.5, 0.3]] },
    drums: {
      4: [[0, 'ride', 0.5], [1, 'ride', 0.65], [1.5, 'ride', 0.4], [2, 'ride', 0.5], [3, 'ride', 0.65], [3.5, 'ride', 0.4], [1, 'pedal', 0.6], [3, 'pedal', 0.6], [0, 'kick', 0.2]],
      3: [[0, 'ride', 0.6], [1, 'ride', 0.5], [1.5, 'ride', 0.4], [2, 'ride', 0.5], [1, 'pedal', 0.5], [2, 'pedal', 0.5], [0, 'kick', 0.2]],
    },
  },
  // geswingde achtsten: boogiebas, akkoord op 2 en 4, shuffle op de hihat
  shuffle: {
    swing: true, bars: 1,
    bass: {
      4: [0, 1, 2, 3].flatMap((b) => [[b, 'B', 0.6], [b + 0.5, 'B', 0.3, 0.7]] as [number, Tone, number, number][]),
      3: [0, 1, 2].flatMap((b) => [[b, 'B', 0.6], [b + 0.5, 'B', 0.3, 0.7]] as [number, Tone, number, number][]),
    },
    keys: { 4: [[1, 0.3], [3, 0.3], [3.5, 0.2, 0.35]], 3: [[1, 0.3], [2, 0.3]] },
    drums: {
      4: [...every(4, 0.5, (at, i) => [[at, 'hat', i % 2 ? 0.3 : 0.5]]), [0, 'kick', 0.7], [2, 'kick', 0.7], [1, 'snare', 0.7], [3, 'snare', 0.7]],
      3: [...every(3, 0.5, (at, i) => [[at, 'hat', i % 2 ? 0.3 : 0.5]]), [0, 'kick', 0.7], [1, 'snare', 0.5], [2, 'snare', 0.6]],
    },
  },
  // rechte achtsten; bas grondtoon-kwint met aanloop, akkoorden op de bossa-clave van twee maten
  bossa: {
    swing: false, bars: 2,
    bass: {
      4: [[0, 'R', 1.4], [1.5, '5', 0.45], [2, '5', 1.4], [3.5, 'A', 0.45], [4, 'R', 1.4], [5.5, '5', 0.45], [6, '5', 1.4], [7.5, 'A', 0.45]],
      3: [[0, 'R', 1.4], [1.5, '5', 0.45], [2, '5', 0.9], [3, 'R', 1.4], [4.5, '5', 0.45], [5, 'A', 0.9]],
    },
    keys: { 4: [[0, 0.45], [1.5, 0.45], [3, 0.45], [5, 0.45], [6.5, 0.45]], 3: [[0, 0.45], [1.5, 0.45], [3.5, 0.45], [5, 0.45]] },
    drums: {
      4: [...every(8, 0.5, (at, i) => [[at, 'hat', i % 2 ? 0.2 : 0.3]]), ...[0, 1.5, 3, 5, 6.5].map((at) => [at, 'rim', 0.5] as [number, Drum, number]),
        ...[0, 1.5, 2, 3.5, 4, 5.5, 6, 7.5].map((at) => [at, 'kick', 0.45] as [number, Drum, number])],
      3: [...every(6, 0.5, (at, i) => [[at, 'hat', i % 2 ? 0.2 : 0.3]]), ...[0, 1.5, 3.5, 5].map((at) => [at, 'rim', 0.5] as [number, Drum, number]),
        ...[0, 1.5, 3, 4.5].map((at) => [at, 'kick', 0.45] as [number, Drum, number])],
    },
  },
  // rechte zestienden: gesyncopeerde bas met octaaf, korte akkoordstoten, backbeat met ghost notes
  funk: {
    swing: false, bars: 1,
    bass: {
      4: [[0, 'R', 0.4], [0.75, 'R', 0.2, 0.7], [1.5, 'O', 0.3], [2.5, 'R', 0.3], [2.75, '5', 0.2, 0.7], [3.5, '7', 0.3]],
      3: [[0, 'R', 0.4], [0.75, 'R', 0.2, 0.7], [1.5, 'O', 0.3], [2.5, '7', 0.3]],
    },
    keys: { 4: [[1, 0.15], [1.75, 0.12, 0.4], [3.25, 0.15]], 3: [[1, 0.15], [1.75, 0.12, 0.4], [2.5, 0.15]] },
    drums: {
      4: [...every(4, 0.5, (at, i) => [[at, 'hat', i % 2 ? 0.3 : 0.45]]), [0, 'kick', 0.9], [2.5, 'kick', 0.8], [1, 'snare', 0.8], [3, 'snare', 0.8], [1.75, 'snare', 0.15], [3.75, 'snare', 0.15]],
      3: [...every(3, 0.5, (at, i) => [[at, 'hat', i % 2 ? 0.3 : 0.45]]), [0, 'kick', 0.9], [1.5, 'kick', 0.7], [2, 'snare', 0.8], [1.75, 'snare', 0.15]],
    },
  },
};

/** Drums bij de rechte en de aangehouden begeleiding. */
const PLAIN_DRUMS: Record<'comp' | 'sustain', Record<3 | 4, [number, Drum, number][]>> = {
  comp: {
    4: [...every(4, 0.5, (at, i) => [[at, 'hat', i % 2 ? 0.3 : 0.45]]), [0, 'kick', 0.8], [2, 'kick', 0.8], [1, 'snare', 0.7], [3, 'snare', 0.7]],
    3: [...every(3, 0.5, (at, i) => [[at, 'hat', i % 2 ? 0.3 : 0.45]]), [0, 'kick', 0.8], [1, 'snare', 0.5], [2, 'snare', 0.5]],
  },
  sustain: {
    4: [[0, 'ride', 0.35], [1, 'ride', 0.3], [2, 'ride', 0.35], [3, 'ride', 0.3], [0, 'kick', 0.35]],
    3: [[0, 'ride', 0.35], [1, 'ride', 0.3], [2, 'ride', 0.3], [0, 'kick', 0.35]],
  },
};

/** Waar de "en" valt: 2/3 van de tel (triolen), wat rechter bij hoge tempo's, zoals echte spelers doen. */
export const swingRatio = (bpm: number) => (bpm <= 140 ? 2 / 3 : Math.max(0.56, 2 / 3 - (bpm - 140) / 1000));

/** Alleen 3/4 en 4/4 hebben eigen patronen; andere maatsoorten gebruiken die van 4/4. */
const meterKey = (meter: number): 3 | 4 => (meter === 3 ? 3 : 4);

/** De gebeurtenissen van een patroon die op deze tel vallen, met hun afstand tot de tel in seconden. */
function inBeat<T extends [number, ...unknown[]]>(list: T[], beat: number, meter: number, bars: number, swing: boolean, bpm: number): [number, T][] {
  const spb = 60 / bpm;
  const pos = beat % (meter * bars);
  return list.filter((e) => Math.floor(e[0]) === pos).map((e) => {
    const frac = e[0] - pos;
    return [(swing && frac === 0.5 ? swingRatio(bpm) : frac) * spb, e];
  });
}

export function planGroove(g: Groove, item: TimelineItem, beatInChord: number, beat: number, opts: Pick<LoopOptions, 'bpm' | 'meter'>, next?: TimelineItem): PlannedNote[] {
  const spb = 60 / opts.bpm;
  const m = meterKey(opts.meter);
  const [bass, ...upper] = item.voicing;
  const out: PlannedNote[] = [];
  for (const [offset, [, tone, len, vel]] of inBeat(g.bass[m], beat, opts.meter, g.bars, g.swing, opts.bpm)) {
    out.push({ midi: bassTone(tone, item, beatInChord, next), offset, duration: len * spb, vel: vel ?? 0.95, part: 'bass' });
  }
  // een nieuw akkoord krijgt altijd zijn grondtoon op de tel, ook midden in een patroon
  if (beatInChord === 0 && !out.some((n) => n.offset === 0)) out.push({ midi: bass, offset: 0, duration: 0.9 * spb, vel: 0.95, part: 'bass' });
  const keys = inBeat(g.keys[m], beat, opts.meter, g.bars, g.swing, opts.bpm);
  if (beatInChord === 0 && !keys.some(([o]) => o === 0)) keys.unshift([0, [0, 0.35]]);
  for (const [offset, [, len, vel]] of keys) {
    out.push(...upper.map((midi) => ({ midi, offset, duration: len * spb, vel: vel ?? 0.5, part: 'keys' as const })));
  }
  return out;
}

/** Drums op deze tel: [offset in seconden, soort, sterkte]. */
export function planDrums(beat: number, opts: Pick<LoopOptions, 'bpm' | 'style' | 'meter'>): [number, Drum, number][] {
  const m = meterKey(opts.meter);
  const s = opts.style;
  const g = s === 'comp' || s === 'sustain' ? { swing: false, bars: 1, drums: PLAIN_DRUMS[s] } : GROOVES[s];
  return inBeat(g.drums[m], beat, opts.meter, g.bars, g.swing, opts.bpm).map(([o, [, kind, vel]]) => [o, kind, vel]);
}
