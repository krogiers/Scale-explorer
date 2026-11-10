import type { Out } from './util';
import type { Voice } from './voices';

/**
 * Eén opname spelen met de aanzet en uitklank van de klank. rate = toonhoogteverschuiving naar de gevraagde noot.
 * Aangehouden klanken (voice.loop) herhalen een stuk van de opname zolang de noot duurt. wet = ook naar de galm.
 * Met voice.vibrato krijgt een lange noot na een korte tijd een lichte vibrato die geleidelijk opkomt.
 */
export function playSample(c: AudioContext, out: Out, wet: boolean, buffer: AudioBuffer, rate: number, v: Voice, t: number, dur: number, vel: number) {
  const env = c.createGain();
  const level = v.level * vel;
  const end = t + dur + v.release;
  if (v.attack > 0) {
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + Math.min(v.attack, dur));
  } else env.gain.setValueAtTime(level, t);
  env.gain.setValueAtTime(level, t + dur);
  env.gain.exponentialRampToValueAtTime(0.0005, end);
  env.connect(out.dry);
  if (wet) env.connect(out.wet);
  const vib = v.vibrato ? vibrato(c, v.vibrato, t, dur, end, out.track) : null;
  if (v.loop) return sustain(c, buffer, rate, t, end + 0.05, env, out.track, v.loop, vib);
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  if (vib) vib.connect(src.detune);
  src.connect(env);
  src.start(t);
  out.track(src);
  src.stop(end + 0.05);
}

/**
 * Vibrato: een trage golf op de toonhoogte (detune, in cent). Ze begint pas na `delay` seconden en komt in 0,5 s op,
 * zoals een blazer die eerst de toon zet. Korte noten krijgen er geen. Geeft de versterker terug om aan detune te hangen.
 */
function vibrato(c: AudioContext, [depth, hz, delay]: [number, number, number], t: number, dur: number, end: number, track: Out['track']): GainNode | null {
  if (dur < delay + 0.3) return null;
  const lfo = c.createOscillator();
  lfo.frequency.value = hz;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t + delay);
  g.gain.linearRampToValueAtTime(depth, t + delay + 0.5);
  lfo.connect(g);
  lfo.start(t);
  lfo.stop(end + 0.05);
  track(lfo);
  return g;
}

/**
 * Aangehouden klank: speel de opname vanaf het begin en herhaal daarna het stuk [a, b] tot `end`.
 * Elke herhaling start iets vóór het einde van de vorige en ze vloeien in elkaar over (xf seconden),
 * zodat je geen tik hoort waar het stuk opnieuw begint.
 */
function sustain(c: AudioContext, buffer: AudioBuffer, rate: number, t: number, end: number, out: AudioNode, track: Out['track'], [a, b]: [number, number], vib: GainNode | null) {
  const xf = 0.1;
  let at = t;
  let offset = 0;
  for (;;) {
    const stop = at + (b - offset) / rate; // tijd in de opname loopt `rate` keer zo snel
    const last = stop >= end;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    if (vib) vib.connect(src.detune);
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
    track(src);
    src.stop(last ? end : stop);
    if (last) return;
    at = stop - xf;
    offset = a;
  }
}
