/** De reducer: pure overgangen van de toestand, met ongedaan maken voor het schema. */
import { scaleOf } from '../core';
import { clampBpm, type Action, type PathEntry, type State } from './model';

const entry = (s: State): PathEntry => ({ root: s.root, mode: s.mode, degree: s.degree, beats: s.meter, size: s.size });
export const MAX_CHORDS = 64;
const UNDO_STEPS = 50;

/** Nieuwe versie van het schema, met de vorige bewaard voor ongedaan maken. */
function edit(s: State, path: PathEntry[], focus: number): State {
  return { ...s, path, focus, history: [...s.history, { path: s.path, focus: s.focus }].slice(-UNDO_STEPS) };
}

/** Voeg het gekozen akkoord in na het geselecteerde akkoord van het schema. Is het schema vol, dan gebeurt er niets. */
function withPush(s: State): State {
  const cur = s.path[s.focus];
  if (cur && cur.root === s.root && cur.mode === s.mode && cur.degree === s.degree && cur.size === s.size) return s;
  if (s.path.length >= MAX_CHORDS) return s;
  const at = Math.min(s.focus + 1, s.path.length);
  return edit(s, [...s.path.slice(0, at), entry(s), ...s.path.slice(at)], at);
}

const atEntry = (s: State, p: PathEntry, focus: number): State => ({ ...s, root: p.root, mode: p.mode, degree: p.degree, size: p.size, focus });

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
    case 'select': return withPush({ ...s, degree: a.degree });
    case 'go': return withPush({ ...s, ...a.to });
    case 'focusPath': {
      const p = s.path[a.index];
      return p ? atEntry(s, p, a.index) : s;
    }
    case 'setBeats': {
      const beats = Math.max(1, Math.min(16, a.beats));
      if (s.path[a.index]?.beats === beats) return s;
      return edit(s, s.path.map((e, i) => (i === a.index ? { ...e, beats } : e)), s.focus);
    }
    case 'setSize': {
      if (!s.path[a.index] || s.path[a.index].size === a.size) return s;
      const next = edit(s, s.path.map((e, i) => (i === a.index ? { ...e, size: a.size } : e)), s.focus);
      return a.index === s.focus ? { ...next, size: a.size } : next;
    }
    case 'removeAt': {
      if (s.path.length <= 1) return s;
      const path = s.path.filter((_, i) => i !== a.index);
      return edit(s, path, Math.min(s.focus > a.index ? s.focus - 1 : s.focus, path.length - 1));
    }
    case 'clearPath': return edit(s, [entry(s)], 0);
    case 'movePath': {
      const moved = s.path[a.from];
      if (!moved || a.to < 0 || a.to > s.path.length) return s;
      if (a.copy) {
        if (s.path.length >= MAX_CHORDS) return s;
        return atEntry(edit(s, [...s.path.slice(0, a.to), { ...moved }, ...s.path.slice(a.to)], a.to), moved, a.to);
      }
      // de opening vlak voor of na het akkoord zelf: het blijft waar het staat
      if (a.to === a.from || a.to === a.from + 1) return s;
      const rest = s.path.filter((_, i) => i !== a.from);
      const at = a.to > a.from ? a.to - 1 : a.to;
      return atEntry(edit(s, [...rest.slice(0, at), moved, ...rest.slice(at)], at), moved, at);
    }
    case 'insertPath': {
      // één stap voor ongedaan maken; het eerste nieuwe akkoord wordt geselecteerd
      if (a.entries.length === 0) return s;
      const at = a.replace ? 0 : Math.min(s.focus + 1, s.path.length);
      const base = a.replace ? [] : s.path;
      const entries = a.entries.slice(0, MAX_CHORDS - base.length);
      if (entries.length === 0) return s;
      const next = edit(s, [...base.slice(0, at), ...entries, ...base.slice(at)], at);
      return atEntry(next, entries[0], at);
    }
    case 'undo': {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      const focus = Math.min(prev.focus, prev.path.length - 1);
      return { ...atEntry(s, prev.path[focus], focus), path: prev.path, history: s.history.slice(0, -1) };
    }
    case 'settings': return { ...s, ...a.patch, ...(a.patch.bpm !== undefined && { bpm: clampBpm(a.patch.bpm) }) };
  }
}
