/**
 * Meespeelloop: speelt het akkoordenschema steeds opnieuw in een vast tempo.
 * Werkt met een "vooruitkijkende" planner: elke 25 ms plannen we de tellen die in de
 * komende 120 ms vallen op de klok van de geluidskaart. Zo blijft het ritme strak,
 * ook als de browser even druk is.
 */
import type { AudioEngine, Part } from './index';

export type LoopStyle = 'sustain' | 'comp';
export interface LoopOptions {
  bpm: number;
  metronome: boolean;
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
export function planBeat(item: TimelineItem, beatInChord: number, beatInBar: number, opts: Pick<LoopOptions, 'bpm' | 'style' | 'meter'>): PlannedNote[] {
  const spb = 60 / opts.bpm;
  const [bass, ...upper] = item.voicing;
  if (bass === undefined) return [];
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
      for (const n of planBeat(item, inChord, beat % opts.meter, opts)) this.engine.noteAt(n.midi, t + n.offset, n.duration, n.vel, n.part);
      info = { chord, beat: inChord, beats: item.beats };
    }
    window.setTimeout(() => { if (this.stopTicker !== null) this.onBeat(info); }, Math.max(0, (t - now) * 1000));
  }
}
