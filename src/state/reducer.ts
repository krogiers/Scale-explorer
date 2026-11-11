/** De reducer: pure overgangen van de toestand, met ongedaan maken voor het schema. */
import { scaleOf } from '../core';
import { clampBpm, type Action, type PathEntry, type State } from './model';
import { validMarks, withoutMarks } from './repeats';

const entry = (s: State): PathEntry => ({ root: s.root, mode: s.mode, degree: s.degree, beats: s.meter, size: s.size });
export const MAX_CHORDS = 64;
const UNDO_STEPS = 50;

/** Nieuwe versie van het schema, met de vorige bewaard voor ongedaan maken. */
function edit(s: State, path: PathEntry[], focus: number, cursor: number): State {
  return { ...s, path, focus, cursor, history: [...s.history, { path: s.path, focus: s.focus, cursor: s.cursor }].slice(-UNDO_STEPS) };
}

/** De cursor binnen het schema houden. */
const clampCursor = (c: number, n: number) => Math.max(0, Math.min(c, n));

/** Zet het gekozen akkoord op de cursor; daarna staat de cursor erachter, zodat je gewoon doorbouwt. Vol = niets. */
function add(s: State): State {
  if (s.path.length >= MAX_CHORDS) return s;
  const at = clampCursor(s.cursor, s.path.length);
  return edit(s, [...s.path.slice(0, at), entry(s), ...s.path.slice(at)], at, at + 1);
}

const atEntry = (s: State, p: PathEntry | undefined, focus: number): State =>
  p ? { ...s, root: p.root, mode: p.mode, degree: p.degree, size: p.size, focus } : { ...s, focus: -1 };

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'setRoot': return { ...s, root: a.root };
    case 'setMode': return { ...s, mode: a.mode };
    case 'setScale': return { ...s, root: a.root, mode: a.mode };
    case 'relative': {
      // zelfde noten, ander middelpunt: houd hetzelfde akkoord geselecteerd
      const chordRoot = scaleOf(s.root, s.mode).notes[s.degree].pc;
      const degree = Math.max(0, scaleOf(a.root, a.mode).notes.findIndex((n) => n.pc === chordRoot));
      return { ...s, root: a.root, mode: a.mode, degree };
    }
    case 'select': return { ...s, degree: a.degree };
    case 'go': return { ...s, ...a.to };
    case 'add': return add(s);
    case 'setCursor': return { ...s, cursor: clampCursor(a.index, s.path.length) };
    case 'focusPath': {
      const p = s.path[a.index];
      return p ? atEntry(s, p, a.index) : s;
    }
    case 'setBeats': {
      const beats = Math.max(1, Math.min(16, a.beats));
      if (!s.path[a.index] || s.path[a.index].beats === beats) return s;
      return edit(s, s.path.map((e, i) => (i === a.index ? { ...e, beats } : e)), s.focus, s.cursor);
    }
    case 'setSize': {
      if (!s.path[a.index] || s.path[a.index].size === a.size) return s;
      const next = edit(s, s.path.map((e, i) => (i === a.index ? { ...e, size: a.size } : e)), s.focus, s.cursor);
      return a.index === s.focus ? { ...next, size: a.size } : next;
    }
    case 'setMarks': {
      const e = s.path[a.index];
      if (!e) return s;
      // een sleutel in marks vervangt het teken (undefined = weg); de rest blijft
      const merged: PathEntry = { ...withoutMarks(e), ...validMarks({ repStart: e.repStart, repEnd: e.repEnd, volta: e.volta, ...a.marks }) };
      if (merged.repStart === e.repStart && merged.repEnd === e.repEnd && merged.volta === e.volta) return s;
      return edit(s, s.path.map((x, i) => (i === a.index ? merged : x)), s.focus, s.cursor);
    }
    case 'removeAt': {
      const gone = s.path[a.index];
      if (!gone) return s;
      // de herhaaltekens van een verwijderd akkoord schuiven door: een begin naar het volgende, een einde naar het vorige
      const path = s.path.filter((_, i) => i !== a.index).map((e, i) => {
        if (gone.repStart && i === a.index && !e.repStart) return { ...e, repStart: true };
        if (gone.repEnd && i === a.index - 1 && !e.repEnd) return { ...e, repEnd: gone.repEnd };
        return e;
      });
      // de cursor blijft op dezelfde plek in de muziek: stond hij erachter, dan schuift hij één op
      const cursor = clampCursor(s.cursor > a.index ? s.cursor - 1 : s.cursor, path.length);
      const focus = Math.min(s.focus > a.index ? s.focus - 1 : s.focus, path.length - 1);
      return atEntry(edit(s, path, focus, cursor), path[focus], focus);
    }
    case 'clearPath': return s.path.length ? edit(s, [], -1, 0) : s;
    case 'movePath': {
      const moved = s.path[a.from];
      if (!moved || a.to < 0 || a.to > s.path.length) return s;
      if (a.copy) {
        if (s.path.length >= MAX_CHORDS) return s;
        return atEntry(edit(s, [...s.path.slice(0, a.to), withoutMarks(moved), ...s.path.slice(a.to)], a.to, clampCursor(s.cursor > a.to || s.cursor === s.path.length ? s.cursor + 1 : s.cursor, s.path.length + 1)), moved, a.to);
      }
      // de opening vlak voor of na het akkoord zelf: het blijft waar het staat
      if (a.to === a.from || a.to === a.from + 1) return s;
      const rest = s.path.filter((_, i) => i !== a.from);
      const at = a.to > a.from ? a.to - 1 : a.to;
      return atEntry(edit(s, [...rest.slice(0, at), moved, ...rest.slice(at)], at, s.cursor), moved, at);
    }
    case 'insertPath': {
      // één stap voor ongedaan maken; het eerste nieuwe akkoord wordt geselecteerd, de cursor staat erachter
      if (a.entries.length === 0) return s;
      const at = a.replace ? 0 : clampCursor(s.cursor, s.path.length);
      const base = a.replace ? [] : s.path;
      const entries = a.entries.slice(0, MAX_CHORDS - base.length);
      if (entries.length === 0) return s;
      const next = edit(s, [...base.slice(0, at), ...entries, ...base.slice(at)], at, at + entries.length);
      return atEntry(next, entries[0], at);
    }
    case 'undo': {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      const focus = Math.min(prev.focus, prev.path.length - 1);
      return { ...atEntry(s, prev.path[focus], focus), path: prev.path, cursor: clampCursor(prev.cursor, prev.path.length), history: s.history.slice(0, -1) };
    }
    case 'settings': {
      // je instrument en de klank staan los van elkaar: het een verandert het ander niet
      return { ...s, ...a.patch, ...(a.patch.bpm !== undefined && { bpm: clampBpm(a.patch.bpm) }) };
    }
  }
}
