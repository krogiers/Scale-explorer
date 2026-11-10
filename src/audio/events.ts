import type { Chord, Note, Scale } from '../core';
import type { NoteEvent } from './types';
import { progressionVoicings, voicing } from './voicing';

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

/**
 * "Hoor het verschil": ladder a en daarna ladder b, elk boven een orgelpunt op hun eigen grondtoon (laag, in de bas).
 * De noten die verschillen klinken langer. Is er precies één noot anders (F → F♯), dan wisselen die twee nog twee keer af
 * boven de grondtoon van b: zo hoor je de kleur zelf, zoals de oefening "F en F♯ afwisselen boven een drone".
 */
export function compareEvents(a: Scale, b: Scale, step = 0.32): NoteEvent[] {
  const ev: NoteEvent[] = [];
  const low = (pc: number) => 36 + pc; // C2 tot B2
  const run = (s: Scale, other: Scale, t0: number) => {
    const n = s.notes.length;
    // orgelpunt: grondtoon en kwint, om de vier noten opnieuw aangeslagen
    for (let i = 0; i <= n; i += 4) ev.push([low(s.root), t0 + i * step, step * 4.2, 'bass'], [low(s.root) + 19, t0 + i * step, step * 4.2]);
    let prev = 60 + s.root - (s.root > 6 ? 12 : 0) - 1;
    s.notes.forEach((note, i) => {
      let x = 60 + note.pc;
      while (x <= prev) x += 12;
      prev = x;
      ev.push([x, t0 + i * step, other.pcs.has(note.pc) ? step * 1.05 : step * 2.2]);
    });
    ev.push([low(s.root) + 36, t0 + n * step, step * 2.5]);
    return t0 + (n + 2.5) * step;
  };
  let t = run(a, b, 0);
  t = run(b, a, t + step);
  const out = a.notes.filter((x) => !b.pcs.has(x.pc)), inn = b.notes.filter((x) => !a.pcs.has(x.pc));
  if (out.length === 1 && inn.length === 1) {
    const near = (pc: number) => { let x = 60 + pc; while (x < 60 + b.root) x += 12; return x; };
    const [o, i] = [near(out[0].pc), near(inn[0].pc)];
    ev.push([low(b.root), t, step * 8.5, 'bass'], [low(b.root) + 19, t, step * 8.5]);
    [o, i, o, i].forEach((m, k) => ev.push([m, t + k * step * 2, step * 1.9]));
  }
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
