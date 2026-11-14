/**
 * Meespeelloop: speelt het akkoordenschema steeds opnieuw in een vast tempo.
 * Werkt met een "vooruitkijkende" planner: elke 25 ms plannen we de tellen die in de
 * komende 120 ms vallen op de klok van de geluidskaart. Zo blijft het ritme strak,
 * ook als de browser even druk is.
 */
import { release, takeOver } from '../transport';
import type { AudioEngine } from '../types';
import { planDrums } from './grooves';
import { locate, planBeat } from './plan';
import type { BeatInfo, LoopOptions, TimelineItem } from './types';

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
    if (this.engine.now() == null || this.stopTicker !== null) return;
    takeOver('loop', this.halt);
    loopState.running = true;
    // eerst de opnames laten laden, anders klinken de eerste maten als synthesizer; wie intussen stopt, annuleert
    let cancelled = false;
    this.stopTicker = () => { cancelled = true; };
    void this.engine.ready().then(() => {
      const now = this.engine.now();
      if (cancelled || now == null) return;
      const o = this.getOptions();
      this.nextTime = now + 0.15;
      this.beat = o.countIn ? -o.meter : 0;
      this.stopTicker = startTicker(25, () => this.tick());
    });
  }

  /** Stoppen, ook als iets anders begint te spelen (dan roept de transport dit aan). */
  private halt = () => {
    if (this.stopTicker === null) return;
    this.stopTicker();
    this.stopTicker = null;
    loopState.running = false;
    this.engine.stopAll();
    this.onBeat(null);
  };

  stop() {
    release(this.halt);
    this.halt();
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
      // de melodie: de noten die in deze tel beginnen, zware tellen iets luider
      const spb = 60 / opts.bpm;
      for (const n of item.melody ?? []) {
        if (Math.floor(n.at) !== inChord) continue;
        this.engine.noteAt(n.midi, t + (n.at - inChord) * spb, n.dur * spb * 0.92, Number.isInteger(n.at) ? 0.8 : 0.65, 'lead');
      }
      info = { chord, beat: inChord, beats: item.beats };
    }
    window.setTimeout(() => { if (this.stopTicker !== null) this.onBeat(info); }, Math.max(0, (t - now) * 1000));
  }
}
