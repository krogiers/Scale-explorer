import type { Drum } from '../types';
import type { Out } from './util';

/** Eén seconde witte ruis, gedeeld door alle slagen. */
export function noiseBuffer(c: AudioContext): AudioBuffer {
  const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Metronoomtik: houtblokachtig, een kort ruisstootje door een bandfilter. */
export function playClick(c: AudioContext, out: Out, t: number, accent: boolean) {
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
  g.connect(out.dry);
  src.start(t);
  out.track(src);
}

/** Eén drumslag, opgewekt met oscillatoren en ruis (geen opnames). */
export function playDrum(c: AudioContext, out: Out, noiseBuf: AudioBuffer, t: number, kind: Drum, vel: number) {
  const decayTo = (g: GainNode, peak: number, decay: number) => {
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
  };
  // ruisstoot door een filter
  const noise = (type: BiquadFilterType, freq: number, peak: number, decay: number, wet = false) => {
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    decayTo(g, peak, decay);
    src.connect(f);
    f.connect(g);
    g.connect(out.dry);
    if (wet) g.connect(out.wet);
    src.start(t, Math.random() * 0.5);
    out.track(src);
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
    g.connect(out.dry);
    o.start(t);
    out.track(o);
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
      g.connect(out.dry);
      g.connect(out.wet);
      for (const hz of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
        const o = c.createOscillator();
        o.type = 'square';
        o.frequency.value = hz * 2.2;
        o.connect(f);
        o.start(t);
        out.track(o);
        o.stop(t + 0.95);
      }
      noise('highpass', 8000, 0.08 * vel, 0.3, true);
      break;
    }
  }
}
