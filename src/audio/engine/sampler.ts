import type { Voice } from './voices';

/**
 * Eén opname spelen met de aanzet en uitklank van de klank. rate = toonhoogteverschuiving naar de gevraagde noot.
 * Aangehouden klanken (voice.loop) herhalen een stuk van de opname zolang de noot duurt.
 */
export function playSample(c: AudioContext, out: AudioNode[], buffer: AudioBuffer, rate: number, v: Voice, t: number, dur: number, vel: number) {
  const env = c.createGain();
  const level = v.level * vel;
  const end = t + dur + v.release;
  if (v.attack > 0) {
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + Math.min(v.attack, dur));
  } else env.gain.setValueAtTime(level, t);
  env.gain.setValueAtTime(level, t + dur);
  env.gain.exponentialRampToValueAtTime(0.0005, end);
  out.forEach((o) => env.connect(o));
  if (v.loop) return sustain(c, buffer, rate, t, end + 0.05, env, v.loop);
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
function sustain(c: AudioContext, buffer: AudioBuffer, rate: number, t: number, end: number, out: AudioNode, [a, b]: [number, number]) {
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
