/**
 * De geluidsmotor. Gebruikt echte opnames (samples) van piano, Rhodes en contrabas, met:
 * - strijkers, cello, orgel, vibrafoon, klarinet, trompet en dwarsfluit als extra klanken, pas geladen wanneer iemand ze kiest;
 * - voor aangehouden klanken (strijkers, cello, orgel en de blazers) een stuk van de opname dat zich herhaalt met overvloeien, zodat lange akkoorden niet wegvallen;
 * - toonhoogteverschuiving van hooguit anderhalve halve toon naar de dichtstbijzijnde opname;
 * - een galm (convolutie met een kunstmatige zaalrespons) zodat het niet droog en digitaal klinkt;
 * - kleine willekeurige verschillen in timing en aanslag ("humanize"), zoals een echte speler;
 * - een mengpaneel: akkoorden, bas, drums en metronoom hebben elk een eigen kanaal (volume, links/rechts).
 * Zolang de opnames nog niet ingeladen zijn, valt hij terug op een eenvoudige synthesizer.
 */
import { SAMPLES } from '../samples/base';
import { channelGain, DEFAULT_MIX, PARTS, type Mix, type PartChannel } from '../mix';
import type { AudioEngine, Drum, NoteEvent, Part, Timbre } from '../types';
import { noiseBuffer, playClick, playDrum } from './drums';
import { playSample } from './sampler';
import { synthNote } from './synth';
import { base64ToArrayBuffer, impulse, jitter, type Out } from './util';
import { EXTRA, VOICES } from './voices';

type Bank = Map<number, AudioBuffer>;
/** Een kanaal van het mengpaneel: schuiver voor droog en galm, en links/rechts op het droge signaal. */
interface Strip { dry: GainNode; wet: GainNode; pan: StereoPannerNode | null }
/** Basisniveau van galm en totaal; de schuivers vermenigvuldigen daarmee. */
const WET = 0.22, MASTER = 0.8;

export class SampledEngine implements AudioEngine {
  private ctx: AudioContext | null = null;
  /** Vaste uitgang naar de luidspreker (droog en galm). */
  private out: { dry: GainNode; wet: GainNode; master: GainNode } | null = null;
  /** Vaste kanalen van het mengpaneel, tussen de bus en de uitgang. */
  private strips: Record<PartChannel, Strip> | null = null;
  private mix: Mix = DEFAULT_MIX;
  /** Huidige bus (één per kanaal): alle noten lopen hierlangs, zodat stopAll ze in één keer kan laten uitdoven. */
  private bus: Record<PartChannel, Out> | null = null;
  private noise: AudioBuffer | null = null;
  private banks = new Map<string, Bank>();
  private loading = false;
  /** Ingelost zodra piano, Rhodes en bas gedecodeerd zijn. */
  private base: Promise<void> | null = null;
  /** Telt elke stopAll: zo weet een uitgesteld "speel" dat er intussen iets anders begonnen is. */
  private gen = 0;
  private extra = new Map<string, Promise<void>>();
  private timbre: Timbre = 'piano';

  setTimbre(t: Timbre): Promise<void> {
    this.timbre = t;
    return this.ctx ? this.loadExtra(this.ctx, t) : Promise.resolve();
  }

  /** Het mengpaneel toepassen; een schuiver hoor je meteen, ook terwijl de loop speelt. */
  setMix(mix: Mix) {
    this.mix = mix;
    this.applyMix();
  }

  private applyMix() {
    const c = this.ctx, out = this.out, strips = this.strips;
    if (!c || !out || !strips) return;
    // kort glijden in plaats van springen: geen tikken tijdens het schuiven
    const glide = (p: AudioParam, v: number) => p.setTargetAtTime(v, c.currentTime, 0.02);
    for (const ch of PARTS) {
      const g = channelGain(this.mix, ch), st = strips[ch];
      glide(st.dry.gain, g);
      glide(st.wet.gain, g);
      if (st.pan) glide(st.pan.pan, this.mix[ch].pan);
    }
    glide(out.wet.gain, WET * channelGain(this.mix, 'reverb'));
    glide(out.master.gain, MASTER * channelGain(this.mix, 'master'));
  }

  /**
   * Klaar om te spelen: de basisopnames en de gekozen klank zijn geladen (hoogstens 4 s wachten; daarna speelt de terugval).
   * Zonder dit klinkt de allereerste klik als synthesizer, omdat de opnames pas bij die klik beginnen te laden.
   */
  ready(): Promise<void> {
    const c = this.ensure();
    if (!c) return Promise.resolve();
    const all = Promise.all([this.base, this.loadExtra(c, this.timbre)]).then(() => undefined);
    return Promise.race([all, new Promise<void>((r) => window.setTimeout(r, 4000))]);
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
        master.gain.value = MASTER;
        master.connect(comp);
        comp.connect(c.destination);
        const dry = c.createGain();
        dry.connect(master);
        const verb = c.createConvolver();
        verb.buffer = impulse(c, 2.4, 3);
        const wet = c.createGain();
        wet.gain.value = WET;
        wet.connect(verb);
        verb.connect(master);
        this.out = { dry, wet, master };
        this.strips = Object.fromEntries(PARTS.map((ch) => {
          const sd = c.createGain(), sw = c.createGain();
          // StereoPanner bestaat in alle gangbare browsers; zonder valt alleen links/rechts weg
          const pan = typeof c.createStereoPanner === 'function' ? c.createStereoPanner() : null;
          if (pan) { sd.connect(pan); pan.connect(dry); } else sd.connect(dry);
          sw.connect(wet);
          return [ch, { dry: sd, wet: sw, pan }];
        })) as Record<PartChannel, Strip>;
        this.applyMix();
        this.bus = this.newBus(c);
        void this.load(c);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Bronnen die op de huidige bus spelen of gepland staan. */
  private sources = new Set<AudioScheduledSourceNode>();

  private newBus(c: AudioContext): Record<PartChannel, Out> {
    const sources = new Set<AudioScheduledSourceNode>();
    this.sources = sources;
    const track = (n: AudioScheduledSourceNode) => {
      sources.add(n);
      n.addEventListener('ended', () => sources.delete(n));
    };
    const bus = {} as Record<PartChannel, Out>;
    for (const ch of PARTS) {
      const dry = c.createGain(), wet = c.createGain();
      dry.connect(this.strips![ch].dry);
      wet.connect(this.strips![ch].wet);
      bus[ch] = { dry, wet, track };
    }
    return bus;
  }

  stopAll() {
    this.gen++;
    const c = this.ctx;
    const old = this.bus;
    if (!c || !old) return;
    // de oude bus kort laten uitdoven (geen tik) en loskoppelen; wat er nog gepland stond, valt in het niets
    const gains = Object.values(old).flatMap((o) => [o.dry, o.wet]) as GainNode[];
    for (const g of gains) {
      g.gain.setValueAtTime(g.gain.value, c.currentTime);
      g.gain.linearRampToValueAtTime(0, c.currentTime + 0.04);
    }
    // na het uitdoven alles echt stoppen, ook wat nog gepland stond
    const sources = this.sources;
    window.setTimeout(() => {
      sources.forEach((n) => { try { n.stop(); } catch { /* nog niet gestart of al gestopt */ } });
      gains.forEach((g) => g.disconnect());
    }, 60);
    this.bus = this.newBus(c);
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
    this.base = Promise.all(Object.entries(SAMPLES).map(([name, notes]) => this.decode(c, name, notes))).then(() => undefined);
    await this.base;
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
    const out = this.bus![part === 'bass' ? 'bass' : 'keys'];
    // een beetje menselijk: aanslag en timing variëren licht
    t = Math.max(c.currentTime, t + jitter(0.008));
    vel = Math.min(1, Math.max(0.1, vel * (1 + jitter(0.1))));
    // is de gekozen klank nog aan het laden (net gewisseld), speel dan intussen piano in plaats van de synthesizer
    let bankName: string = part === 'bass' ? 'bass' : this.timbre;
    if (!this.banks.has(bankName) && part === 'keys' && this.timbre !== 'synth') bankName = 'piano';
    const bank = this.banks.get(bankName);
    const hit = bank ? this.nearest(bank, midi) : null;
    if (this.timbre === 'synth' && part === 'keys') return synthNote(c, out, midi, t, dur, vel);
    if (!hit) return synthNote(c, out, midi, t, dur, vel);
    const [buffer, sampleMidi] = hit;
    const rate = Math.pow(2, (midi - sampleMidi) / 12);
    playSample(c, out, part === 'keys', buffer, rate, VOICES[bankName] ?? VOICES.piano, t, dur, vel);
  }

  clickAt(t: number, accent: boolean) {
    const c = this.ensure();
    if (c) playClick(c, this.bus!.click, t, accent);
  }

  drumAt(time: number, kind: Drum, vel = 1) {
    const c = this.ensure();
    if (!c) return;
    this.noise ??= noiseBuffer(c);
    const t = Math.max(c.currentTime, time + jitter(0.004));
    playDrum(c, this.bus!.drums, this.noise, t, kind, Math.min(1, Math.max(0.05, vel * (1 + jitter(0.08)))));
  }

  play(events: NoteEvent[]) {
    const c = this.ensure();
    if (!c) return;
    const gen = this.gen;
    void this.ready().then(() => {
      if (gen !== this.gen) return; // intussen gestopt of iets anders begonnen
      const t0 = c.currentTime + 0.03;
      events.forEach(([m, at, d, part]) => this.noteAt(m, t0 + at, d, 0.8, part));
    });
  }
}
