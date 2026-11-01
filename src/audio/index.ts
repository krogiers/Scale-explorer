/**
 * Interface: geluid. De rest van de app vraagt alleen "speel deze MIDI-noten op deze tijden".
 *
 * De implementatie gebruikt echte opnames (samples) van piano, Rhodes en contrabas, met:
 * - toonhoogteverschuiving van hooguit anderhalve halve toon naar de dichtstbijzijnde opname;
 * - een galm (convolutie met een kunstmatige zaalrespons) zodat het niet droog en digitaal klinkt;
 * - kleine willekeurige verschillen in timing en aanslag ("humanize"), zoals een echte speler.
 * Zolang de opnames nog niet ingeladen zijn, valt hij terug op een eenvoudige synthesizer.
 */
import type { Chord, Scale } from '../core/theory';
import { SAMPLES } from './samples';

export type Part = 'bass' | 'keys';
/** [MIDI-noot, start in seconden vanaf nu, duur in seconden, partij] */
export type NoteEvent = [midi: number, at: number, duration: number, part?: Part];
export type Timbre = 'piano' | 'rhodes' | 'synth';

export interface AudioEngine {
  /** Speel noten direct, relatief ten opzichte van nu. */
  play(events: NoteEvent[]): void;
  /** Klok van de geluidskaart in seconden (null als er geen geluid beschikbaar is). Start de klok zo nodig. */
  now(): number | null;
  /** Plan één noot op een absoluut tijdstip van die klok; vel is de sterkte (0 tot 1). */
  noteAt(midi: number, time: number, duration: number, vel?: number, part?: Part): void;
  /** Metronoomtik; accent = eerste tel. */
  clickAt(time: number, accent: boolean): void;
  setTimbre(t: Timbre): void;
}

type Bank = Map<number, AudioBuffer>;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/** Kunstmatige zaalrespons: stereoruis die exponentieel uitsterft. */
function impulse(c: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return ir;
}

const jitter = (amount: number) => (Math.random() * 2 - 1) * amount;

class SampledEngine implements AudioEngine {
  private ctx: AudioContext | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private banks = new Map<string, Bank>();
  private loading = false;
  private timbre: Timbre = 'piano';

  setTimbre(t: Timbre) { this.timbre = t; }

  now(): number | null {
    return this.ensure()?.currentTime ?? null;
  }

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        const c = new Ctor();
        this.ctx = c;
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 3;
        const master = c.createGain();
        master.gain.value = 0.8;
        master.connect(comp);
        comp.connect(c.destination);
        this.dry = c.createGain();
        this.dry.connect(master);
        const verb = c.createConvolver();
        verb.buffer = impulse(c, 2.4, 3);
        this.wet = c.createGain();
        this.wet.gain.value = 0.22;
        this.wet.connect(verb);
        verb.connect(master);
        void this.load(c);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private async load(c: AudioContext) {
    if (this.loading) return;
    this.loading = true;
    await Promise.all(Object.entries(SAMPLES).map(async ([name, notes]) => {
      const bank: Bank = new Map();
      await Promise.all(Object.entries(notes).map(async ([midi, b64]) => {
        try { bank.set(+midi, await c.decodeAudioData(base64ToArrayBuffer(b64))); } catch { /* sla over */ }
      }));
      this.banks.set(name, bank);
    }));
  }

  private nearest(bank: Bank, midi: number): [AudioBuffer, number] | null {
    let best: number | null = null;
    for (const m of bank.keys()) if (best === null || Math.abs(m - midi) < Math.abs(best - midi)) best = m;
    return best === null ? null : [bank.get(best)!, best];
  }

  noteAt(midi: number, t: number, dur: number, vel = 1, part: Part = 'keys') {
    const c = this.ensure();
    if (!c) return;
    // een beetje menselijk: aanslag en timing variëren licht
    t = Math.max(c.currentTime, t + jitter(0.008));
    vel = Math.min(1, Math.max(0.1, vel * (1 + jitter(0.1))));
    const bankName = part === 'bass' ? 'bass' : this.timbre;
    const bank = this.banks.get(bankName);
    const hit = bank ? this.nearest(bank, midi) : null;
    if (this.timbre === 'synth' && part === 'keys') return this.synthNote(c, midi, t, dur, vel);
    if (!hit) return this.synthNote(c, midi, t, dur, vel);
    const [buffer, sampleMidi] = hit;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = Math.pow(2, (midi - sampleMidi) / 12);
    const env = c.createGain();
    const level = (part === 'bass' ? 1.1 : 0.55) * vel;
    const release = part === 'bass' ? 0.12 : 0.35;
    env.gain.setValueAtTime(level, t);
    env.gain.setValueAtTime(level, t + dur);
    env.gain.exponentialRampToValueAtTime(0.0005, t + dur + release);
    src.connect(env);
    env.connect(this.dry!);
    if (part === 'keys') env.connect(this.wet!);
    src.start(t);
    src.stop(t + dur + release + 0.05);
  }

  /** Terugvaloptie en "synth"-klank: warme driehoeksgolf met filter. */
  private synthNote(c: AudioContext, midi: number, t: number, dur: number, vel: number) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const env = c.createGain();
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.28 * vel, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.12 * vel, t + Math.min(0.35, dur));
    env.gain.setValueAtTime(0.12 * vel, t + dur);
    env.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.45);
    env.connect(lp);
    lp.connect(this.dry!);
    lp.connect(this.wet!);
    for (const [type, mul, amp] of [['triangle', 1, 1], ['sine', 2, 0.25]] as const) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = f * mul;
      g.gain.value = amp;
      o.connect(g);
      g.connect(env);
      o.start(t);
      o.stop(t + dur + 0.5);
    }
  }

  clickAt(t: number, accent: boolean) {
    const c = this.ensure();
    if (!c) return;
    // houtblokachtige tik: kort ruisstootje door een bandfilter
    const len = Math.floor(c.sampleRate * 0.03);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = accent ? 2600 : 1800;
    bp.Q.value = 6;
    const g = c.createGain();
    g.gain.value = accent ? 1.4 : 0.9;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.dry!);
    src.start(t);
  }

  play(events: NoteEvent[]) {
    const c = this.ensure();
    if (!c) return;
    const t0 = c.currentTime + 0.03;
    events.forEach(([m, at, d, part]) => this.noteAt(m, t0 + at, d, 0.8, part));
  }
}

export const audio: AudioEngine = new SampledEngine();

/** Akkoordligging: bas een octaaf onder de grondtoon, daarboven de akkoordtonen oplopend. */
export function voicing(c: Chord): number[] {
  let base = 48 + c.root.pc;
  if (base > 54) base -= 12;
  const out = [base - 12, base];
  let prev = base;
  for (const n of c.notes.slice(1)) {
    let m = 48 + n.pc;
    while (m <= prev) m += 12;
    out.push(m);
    prev = m;
  }
  return out;
}

export const chordEvents = (c: Chord, at = 0, dur = 1.1): NoteEvent[] =>
  voicing(c).map((m, i) => [m, at + i * 0.018, dur, i === 0 ? 'bass' : 'keys']);

export function scaleEvents(s: Scale): NoteEvent[] {
  let prev = 60 + s.root - (s.root > 6 ? 12 : 0) - 1;
  const ev: NoteEvent[] = s.notes.map((n, i) => {
    let x = 60 + n.pc;
    while (x <= prev) x += 12;
    while (x > prev + 12) x -= 12;
    prev = x;
    return [x, i * 0.28, 0.3];
  });
  ev.push([ev[0][0] + 12, 7 * 0.28, 0.6]);
  return ev;
}

/** Progressie één keer afspelen, met de duur van elk akkoord (0,3 s per tel). */
export function progressionEvents(items: { chord: Chord; beats: number }[]): NoteEvent[] {
  let at = 0;
  return items.flatMap(({ chord, beats }) => {
    const dur = beats * 0.3;
    const ev = chordEvents(chord, at, dur * 0.95);
    at += dur;
    return ev;
  });
}
