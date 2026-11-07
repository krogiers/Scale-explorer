/**
 * Meespeelloop: speelt het akkoordenschema steeds opnieuw in een vast tempo.
 * Werkt met een "vooruitkijkende" planner: elke 25 ms plannen we de tellen die in de
 * komende 120 ms vallen op de klok van de geluidskaart. Zo blijft het ritme strak,
 * ook als de browser even druk is.
 */
import type { AudioEngine, Drum, Part } from './index';

export const LOOP_STYLES = ['comp', 'sustain', 'swing', 'shuffle', 'bossa', 'funk'] as const;
export type LoopStyle = (typeof LOOP_STYLES)[number];
export interface LoopOptions {
  bpm: number;
  metronome: boolean;
  /** Drums die bij de stijl horen (opgewekt in de code, geen opnames). */
  drums: boolean;
  style: LoopStyle;
  countIn: boolean;
  /** Tellen per maat, voor het aftellen en het accent van de metronoom. */
  meter: number;
}
/** Eén akkoord in de loop: zijn ligging (bas eerst) en duur in tellen. */
export interface TimelineItem { voicing: number[]; beats: number }
/** Wat er op een tel gebeurt; chord = -1 tijdens het aftellen. */
export interface BeatInfo { chord: number; beat: number; beats: number }

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

/** Wat er op één tel te spelen valt, los van de geluidskaart (zodat het te testen is). */
export interface PlannedNote { midi: number; offset: number; duration: number; vel: number; part: Part }
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

/*
 * Grooves: patronen per maat (of per twee maten), met posities in tellen vanaf het begin van het patroon.
 * In een geswingde stijl valt de "en" (x.5) later, op swingRatio van de tel: lang-kort in plaats van gelijk.
 * Bastonen: R = grondtoon, 5 = kwint, O = octaaf, 7 = septiem (of octaaf), W = walking bass,
 * B = boogie (1 3 5 6 ♭7 6 5 3), A = aanloop naar het volgende akkoord op de laatste tel ervan.
 */
type Tone = 'R' | '5' | 'O' | '7' | 'W' | 'B' | 'A';
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

const GROOVES: Record<Exclude<LoopStyle, 'comp' | 'sustain'>, Groove> = {
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

function planGroove(g: Groove, item: TimelineItem, beatInChord: number, beat: number, opts: Pick<LoopOptions, 'bpm' | 'meter'>, next?: TimelineItem): PlannedNote[] {
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

/** Toon van het akkoord in de bas, als interval in halve tonen boven de grondtoon (undefined als het er niet in zit). */
function interval(bass: number, upper: number[], options: number[]): number | undefined {
  const ivs = upper.map((m) => (((m - bass) % 12) + 12) % 12);
  return options.find((i) => ivs.includes(i));
}

function bassTone(tone: Tone, item: TimelineItem, beatInChord: number, next?: TimelineItem): number {
  const [bass, ...upper] = item.voicing;
  const fifth = fifthAbove(bass, upper);
  const seventh = interval(bass, upper, [10, 11, 9]);
  const last = !!next && beatInChord === item.beats - 1 && item.beats > 1;
  switch (tone) {
    case 'R': return bass;
    case '5': return fifth;
    case 'O': return bass + 12;
    case '7': return seventh === undefined ? bass + 12 : bass + seventh;
    case 'A': return last ? near(next!.voicing[0], bass) : bass;
    case 'W': {
      // grondtoon, terts, kwint, septiem; op de laatste tel een halve toon naast de volgende grondtoon
      if (last) {
        const target = near(next!.voicing[0], bass);
        return target >= bass ? target - 1 : target + 1;
      }
      const third = interval(bass, upper, [3, 4]) ?? 2;
      return [bass, bass + third, fifth, seventh === undefined ? bass + 12 : bass + seventh][beatInChord % 4];
    }
    case 'B': {
      // boogie: alleen bij een reine kwint; anders (verminderd, overmatig) loopt hij de akkoordtonen
      const third = interval(bass, upper, [4, 3]) ?? 4;
      const sev = interval(bass, upper, [11]) ?? 10;
      if (fifth - bass !== 7) return [bass, bass + third, fifth, bass + third][Math.floor(beatInChord) % 4];
      return bass + [0, third, 7, 9, sev, 9, 7, third][beatInChord % 8];
    }
  }
}

/** Dezelfde toonklasse als m, in het octaaf het dichtst bij ref. */
function near(m: number, ref: number): number {
  while (m - ref > 6) m -= 12;
  while (ref - m > 6) m += 12;
  return m;
}

/**
 * De echte kwint van het akkoord (rein, verminderd of overmatig), net boven de bas.
 * We zoeken hem op interval, want door de stemvoering staat hij niet op een vaste plaats.
 */
function fifthAbove(bass: number, upper: number[]): number {
  let fifth = upper.find((m) => [6, 7, 8].includes((((m - bass) % 12) + 12) % 12));
  if (fifth === undefined) return bass + 7;
  while (fifth > bass + 11) fifth -= 12;
  while (fifth <= bass) fifth += 12;
  return fifth;
}

/**
 * Klok voor de planner. Browsers vertragen setInterval in een achtergrondtabblad tot één keer per
 * seconde, waardoor de loop hapert; een timer in een Web Worker blijft veel stipter lopen.
 * De Worker komt uit een Blob, zodat de app ook als één los bestand blijft werken.
 */
const WORKER_SRC = 'let t;onmessage=(e)=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}';
let worker: Worker | null | undefined;
function tickWorker(): Worker | null {
  if (worker === undefined) {
    try { worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }))); } catch { worker = null; }
  }
  return worker;
}
/** Roep fn elke ms milliseconden aan; geeft een functie terug om te stoppen. Zonder Worker: gewone setInterval. */
function startTicker(ms: number, fn: () => void): () => void {
  const w = typeof Worker === 'undefined' ? null : tickWorker();
  if (!w) {
    const id = window.setInterval(fn, ms);
    return () => window.clearInterval(id);
  }
  w.onmessage = fn;
  w.postMessage(ms);
  return () => { w.onmessage = null; w.postMessage(0); };
}

/** Draait er een loop? Dan spelen losse klikken op akkoorden geen extra geluid. */
export const loopState = { running: false };

export class LoopPlayer {
  private stopTicker: (() => void) | null = null;
  private nextTime = 0;
  private beat = 0;

  constructor(
    private engine: AudioEngine,
    private getTimeline: () => TimelineItem[],
    private getOptions: () => LoopOptions,
    private onBeat: (info: BeatInfo | null) => void,
  ) {}

  get running() { return this.stopTicker !== null; }

  start() {
    const now = this.engine.now();
    if (now == null || this.stopTicker !== null) return;
    const o = this.getOptions();
    this.nextTime = now + 0.15;
    this.beat = o.countIn ? -o.meter : 0;
    this.stopTicker = startTicker(25, () => this.tick());
    loopState.running = true;
  }

  stop() {
    this.stopTicker?.();
    this.stopTicker = null;
    loopState.running = false;
    this.onBeat(null);
  }

  private tick() {
    const now = this.engine.now();
    if (now == null) return;
    while (this.nextTime < now + 0.12) {
      this.schedule(this.beat, this.nextTime, now);
      this.nextTime += 60 / this.getOptions().bpm;
      this.beat++;
    }
  }

  private schedule(beat: number, t: number, now: number) {
    const opts = this.getOptions();
    const timeline = this.getTimeline();
    if (timeline.length === 0) return;
    let info: BeatInfo;
    if (beat < 0) {
      this.engine.clickAt(t, beat === -opts.meter);
      info = { chord: -1, beat: beat + opts.meter, beats: opts.meter };
    } else {
      const { chord, beat: inChord } = locate(timeline, beat);
      const item = timeline[chord];
      if (opts.metronome) this.engine.clickAt(t, beat % opts.meter === 0);
      for (const n of planBeat(item, inChord, beat, opts, timeline[(chord + 1) % timeline.length])) this.engine.noteAt(n.midi, t + n.offset, n.duration, n.vel, n.part);
      if (opts.drums) for (const [o, kind, vel] of planDrums(beat, opts)) this.engine.drumAt(t + o, kind, vel);
      info = { chord, beat: inChord, beats: item.beats };
    }
    window.setTimeout(() => { if (this.stopTicker !== null) this.onBeat(info); }, Math.max(0, (t - now) * 1000));
  }
}
