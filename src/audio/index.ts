/**
 * Interface: geluid. De rest van de app vraagt alleen "speel deze MIDI-noten op deze tijden".
 *
 * De implementatie gebruikt echte opnames (samples) van piano, Rhodes en contrabas, met:
 * - strijkers, cello, orgel, vibrafoon, klarinet, trompet en dwarsfluit als extra klanken, pas geladen wanneer iemand ze kiest;
 * - voor aangehouden klanken (strijkers, cello, orgel en de blazers) een stuk van de opname dat zich herhaalt met overvloeien, zodat lange akkoorden niet wegvallen;
 * - toonhoogteverschuiving van hooguit anderhalve halve toon naar de dichtstbijzijnde opname;
 * - een galm (convolutie met een kunstmatige zaalrespons) zodat het niet droog en digitaal klinkt;
 * - kleine willekeurige verschillen in timing en aanslag ("humanize"), zoals een echte speler.
 * Zolang de opnames nog niet ingeladen zijn, valt hij terug op een eenvoudige synthesizer.
 */
import type { Chord, Note, Scale } from '../core/theory';
import { SAMPLES } from './samples';
import { progressionVoicings, voicing } from './voicing';

export type Part = 'bass' | 'keys';
/** Drumklanken voor de loop, opgewekt met oscillatoren en ruis. pedal = hihat met de voet. */
export type Drum = 'kick' | 'snare' | 'hat' | 'pedal' | 'ride' | 'rim';
/** [MIDI-noot, start in seconden vanaf nu, duur in seconden, partij] */
export type NoteEvent = [midi: number, at: number, duration: number, part?: Part];
export const TIMBRES = ['piano', 'rhodes', 'synth', 'strings', 'cello', 'organ', 'vibes', 'clarinet', 'trumpet', 'flute'] as const;
export type Timbre = (typeof TIMBRES)[number];

/** Extra klanken: elk een eigen bestand, dat Vite als apart stuk bouwt en dat pas bij de eerste keuze geladen wordt. */
const EXTRA: Partial<Record<Timbre, () => Promise<{ default: Record<number, string> }>>> = {
  strings: () => import('./extra/strings'),
  cello: () => import('./extra/cello'),
  organ: () => import('./extra/organ'),
  vibes: () => import('./extra/vibes'),
  clarinet: () => import('./extra/clarinet'),
  trumpet: () => import('./extra/trumpet'),
  flute: () => import('./extra/flute'),
};

/** Hoe een klank aanzet en uitklinkt: aanzet en uitklank in seconden, sterkte, en het stuk [van, tot] dat zich herhaalt. */
interface Voice { attack: number; release: number; level: number; loop?: [number, number] }
const VOICES: Record<string, Voice> = {
  piano: { attack: 0, release: 0.35, level: 0.55 },
  rhodes: { attack: 0, release: 0.35, level: 0.55 },
  bass: { attack: 0, release: 0.12, level: 1.1 },
  strings: { attack: 0.12, release: 0.6, level: 0.5, loop: [0.8, 2.9] },
  cello: { attack: 0.08, release: 0.45, level: 0.6, loop: [0.8, 2.9] },
  organ: { attack: 0.015, release: 0.12, level: 0.4, loop: [0.2, 0.9] },
  vibes: { attack: 0, release: 0.8, level: 0.6 },
  clarinet: { attack: 0.03, release: 0.2, level: 0.45, loop: [0.8, 2.9] },
  trumpet: { attack: 0.02, release: 0.15, level: 0.55, loop: [0.8, 2.9] },
  flute: { attack: 0.05, release: 0.25, level: 0.5, loop: [0.8, 2.9] },
};

export interface AudioEngine {
  /** Speel noten direct, relatief ten opzichte van nu. */
  play(events: NoteEvent[]): void;
  /** Klok van de geluidskaart in seconden (null als er geen geluid beschikbaar is). Start de klok zo nodig. */
  now(): number | null;
  /** Plan één noot op een absoluut tijdstip van die klok; vel is de sterkte (0 tot 1). */
  noteAt(midi: number, time: number, duration: number, vel?: number, part?: Part): void;
  /** Metronoomtik; accent = eerste tel. */
  clickAt(time: number, accent: boolean): void;
  /** Eén drumslag op een absoluut tijdstip; vel is de sterkte (0 tot 1). */
  drumAt(time: number, kind: Drum, vel?: number): void;
  /** Kies de klank; de belofte is ingelost zodra de opnames ervan klaar zijn. */
  setTimbre(t: Timbre): Promise<void>;
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
  private extra = new Map<string, Promise<void>>();
  private timbre: Timbre = 'piano';

  setTimbre(t: Timbre): Promise<void> {
    this.timbre = t;
    return this.ctx ? this.loadExtra(this.ctx, t) : Promise.resolve();
  }

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

  private async decode(c: AudioContext, name: string, notes: Record<number, string>) {
    const bank: Bank = new Map();
    await Promise.all(Object.entries(notes).map(async ([midi, b64]) => {
      try { bank.set(+midi, await c.decodeAudioData(base64ToArrayBuffer(b64))); } catch { /* sla over */ }
    }));
    this.banks.set(name, bank);
  }

  private async load(c: AudioContext) {
    if (this.loading) return;
    this.loading = true;
    void this.loadExtra(c, this.timbre);
    await Promise.all(Object.entries(SAMPLES).map(([name, notes]) => this.decode(c, name, notes)));
  }

  /** Laadt een extra klank één keer; mislukt het (bv. offline), dan blijft de synthesizer als terugval. */
  private loadExtra(c: AudioContext, t: Timbre): Promise<void> {
    const get = EXTRA[t];
    if (!get) return Promise.resolve();
    let p = this.extra.get(t);
    if (!p) {
      p = get().then((m) => this.decode(c, t, m.default)).catch(() => { this.extra.delete(t); });
      this.extra.set(t, p);
    }
    return p;
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
    const rate = Math.pow(2, (midi - sampleMidi) / 12);
    const v = VOICES[bankName] ?? VOICES.piano;
    const env = c.createGain();
    const level = v.level * vel;
    const end = t + dur + v.release;
    if (v.attack > 0) {
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(level, t + Math.min(v.attack, dur));
    } else env.gain.setValueAtTime(level, t);
    env.gain.setValueAtTime(level, t + dur);
    env.gain.exponentialRampToValueAtTime(0.0005, end);
    env.connect(this.dry!);
    if (part === 'keys') env.connect(this.wet!);
    if (v.loop) return this.sustain(c, buffer, rate, t, end + 0.05, env, v.loop);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.connect(env);
    src.start(t);
    src.stop(end + 0.05);
  }

  /**
   * Aangehouden klank: speel de opname vanaf het begin en herhaal daarna het stuk [a, b] tot `end`.
   * Elke herhaling start iets vóór het einde van de vorige en ze vloeien in elkaar over (xf seconden),
   * zodat je geen tik hoort waar het stuk opnieuw begint.
   */
  private sustain(c: AudioContext, buffer: AudioBuffer, rate: number, t: number, end: number, out: AudioNode, [a, b]: [number, number]) {
    const xf = 0.1;
    let at = t;
    let offset = 0;
    for (;;) {
      const stop = at + (b - offset) / rate; // tijd in de opname loopt `rate` keer zo snel
      const last = stop >= end;
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      const g = c.createGain();
      if (offset > 0) {
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(1, at + xf);
      }
      if (!last) {
        g.gain.setValueAtTime(1, stop - xf);
        g.gain.linearRampToValueAtTime(0, stop);
      }
      src.connect(g);
      g.connect(out);
      src.start(at, offset);
      src.stop(last ? end : stop);
      if (last) return;
      at = stop - xf;
      offset = a;
    }
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

  private noiseBuf: AudioBuffer | null = null;

  drumAt(time: number, kind: Drum, vel = 1) {
    const c = this.ensure();
    if (!c) return;
    const t = Math.max(c.currentTime, time + jitter(0.004));
    vel = Math.min(1, Math.max(0.05, vel * (1 + jitter(0.08))));
    if (!this.noiseBuf) {
      this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const decayTo = (g: GainNode, peak: number, decay: number) => {
      g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
    };
    // ruisstoot door een filter
    const noise = (type: BiquadFilterType, freq: number, peak: number, decay: number, wet = false) => {
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = c.createGain();
      decayTo(g, peak, decay);
      src.connect(f);
      f.connect(g);
      g.connect(this.dry!);
      if (wet) g.connect(this.wet!);
      src.start(t, Math.random() * 0.5);
      src.stop(t + decay + 0.02);
    };
    // toon die in toonhoogte zakt (kick, vel van de snare, rimshot)
    const tone = (type: OscillatorType, f0: number, f1: number, peak: number, decay: number) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.6);
      const g = c.createGain();
      decayTo(g, peak, decay);
      o.connect(g);
      g.connect(this.dry!);
      o.start(t);
      o.stop(t + decay + 0.02);
    };
    switch (kind) {
      case 'kick': tone('sine', 140, 45, 1.1 * vel, 0.35); noise('lowpass', 900, 0.12 * vel, 0.02); break;
      case 'snare': tone('triangle', 200, 160, 0.4 * vel, 0.1); noise('highpass', 1300, 0.5 * vel, 0.17, true); break;
      case 'hat': noise('highpass', 7500, 0.3 * vel, 0.045); break;
      case 'pedal': noise('highpass', 6000, 0.2 * vel, 0.06); break;
      case 'rim': tone('triangle', 1750, 1600, 0.35 * vel, 0.035); noise('bandpass', 3200, 0.25 * vel, 0.03); break;
      case 'ride': {
        // metaalklank: blokgolven op onharmonische verhoudingen, hoog gefilterd, met een lange staart
        const f = c.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 5000;
        const g = c.createGain();
        decayTo(g, 0.05 * vel, 0.9);
        f.connect(g);
        g.connect(this.dry!);
        g.connect(this.wet!);
        for (const hz of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
          const o = c.createOscillator();
          o.type = 'square';
          o.frequency.value = hz * 2.2;
          o.connect(f);
          o.start(t);
          o.stop(t + 0.95);
        }
        noise('highpass', 8000, 0.08 * vel, 0.3, true);
        break;
      }
    }
  }

  play(events: NoteEvent[]) {
    const c = this.ensure();
    if (!c) return;
    const t0 = c.currentTime + 0.03;
    events.forEach(([m, at, d, part]) => this.noteAt(m, t0 + at, d, 0.8, part));
  }
}

export const audio: AudioEngine = new SampledEngine();

export { progressionVoicings, voiceLead, voicing } from './voicing';

/** Noten voor één akkoord; zonder ligging klinkt het in grondligging. */
export const chordEvents = (c: Chord, at = 0, dur = 1.1, notes: number[] = voicing(c)): NoteEvent[] =>
  notes.map((m, i) => [m, at + i * 0.018, dur, i === 0 ? 'bass' : 'keys']);

/** Toonladder oplopend vanaf de grondtoon; met notes speel je een deel ervan (bv. pentatonisch). */
export function scaleEvents(s: Scale, notes: Note[] = s.notes): NoteEvent[] {
  let prev = 60 + s.root - (s.root > 6 ? 12 : 0) - 1;
  const ev: NoteEvent[] = notes.map((n, i) => {
    let x = 60 + n.pc;
    while (x <= prev) x += 12;
    while (x > prev + 12) x -= 12;
    prev = x;
    return [x, i * 0.28, 0.3];
  });
  ev.push([ev[0][0] + 12, notes.length * 0.28, 0.6]);
  return ev;
}

/** Progressie één keer afspelen, met de duur van elk akkoord, in het tempo van de loop en met stemvoering. */
export function progressionEvents(items: { chord: Chord; beats: number }[], secondsPerBeat: number): NoteEvent[] {
  const voicings = progressionVoicings(items.map((x) => x.chord));
  let at = 0;
  return items.flatMap(({ chord, beats }, i) => {
    const dur = beats * secondsPerBeat;
    const ev = chordEvents(chord, at, dur * 0.95, voicings[i]);
    at += dur;
    return ev;
  });
}
