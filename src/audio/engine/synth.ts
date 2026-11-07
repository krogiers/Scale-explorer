import type { Out } from './util';

/** Terugvaloptie en "synth"-klank: warme driehoeksgolf met filter. */
export function synthNote(c: AudioContext, out: Out, midi: number, t: number, dur: number, vel: number) {
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
  lp.connect(out.dry);
  lp.connect(out.wet);
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
