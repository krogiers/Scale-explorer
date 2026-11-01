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
export function planBeat(item: TimelineItem, beatInChord: number, opts: Pick<LoopOptions, 'bpm' | 'style'>): PlannedNote[] {
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
  // ritmisch: bas op de oneven tellen (grondtoon, dan kwint), akkoord kort op de even tellen
  if (beatInChord % 2 === 0) {
    const midi = beatInChord % 4 === 2 ? bass + 7 : bass;
    return [{ midi, offset: 0, duration: spb * 0.9, vel: 1, part: 'bass' }];
  }
  return upper.map((midi) => ({ midi, offset: 0, duration: spb * 0.4, vel: 0.55, part: 'keys' as const }));
}

/** Draait er een loop? Dan spelen losse klikken op akkoorden geen extra geluid. */
export const loopState = { running: false };

export class LoopPlayer {
  private timer: number | null = null;
  private nextTime = 0;
  private beat = 0;

  constructor(
    private engine: AudioEngine,
    private getTimeline: () => TimelineItem[],
    private getOptions: () => LoopOptions,
    private onBeat: (info: BeatInfo | null) => void,
  ) {}

  get running() { return this.timer !== null; }

  start() {
    const now = this.engine.now();
    if (now == null || this.timer !== null) return;
    const o = this.getOptions();
    this.nextTime = now + 0.15;
    this.beat = o.countIn ? -o.meter : 0;
    this.timer = window.setInterval(() => this.tick(), 25);
    loopState.running = true;
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
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
      for (const n of planBeat(item, inChord, opts)) this.engine.noteAt(n.midi, t + n.offset, n.duration, n.vel, n.part);
      info = { chord, beat: inChord, beats: item.beats };
    }
    window.setTimeout(() => { if (this.timer !== null) this.onBeat(info); }, Math.max(0, (t - now) * 1000));
  }
}
