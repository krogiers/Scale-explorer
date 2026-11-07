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
