import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { chordsOf, pentatonic, scaleOf, type Chord, type ChordSize, type ModeIndex, type Scale } from '../core/theory';
import type { Destination } from '../core/navigation';
import { MESSAGES, type Lang, type Messages } from '../i18n';
import { makeNames, namerById, type Names } from '../naming';
import { audio, chordEvents, progressionEvents, scaleEvents, TIMBRES, type Timbre } from '../audio';
import { loopState } from '../audio/loop';
import { SAX_KEYS, type SaxKey } from '../instruments';

export interface Position { root: number; mode: ModeIndex; degree: number }
/** Eén akkoord in het schema: waar het staat, hoeveel tellen het duurt en of het een drie- of vierklank is. */
export interface PathEntry extends Position { beats: number; size: ChordSize }
export const chordOf = (p: PathEntry): Chord => chordsOf(scaleOf(p.root, p.mode), p.size)[p.degree];
export type { Timbre };
export interface State extends Position {
  /** Drie- of vierklanken in de akkoordenrij en voor nieuwe akkoorden in het schema. */
  size: ChordSize;
  lang: Lang;
  namer: string;
  instrument: string;
  /** Stemming van de sax: concert, E♭ (alt, bariton) of B♭ (sopraan, tenor). */
  saxKey: SaxKey;
  sound: boolean;
  timbre: Timbre;
  /** Blue note (♭5) tonen in de toonladder en op het instrument. */
  showBlue: boolean;
  /** Pentatonisch tonen: de twee noten buiten de pentatonische ladder worden gedimd. */
  showPenta: boolean;
  /** Maatsoort: tellen per maat (4 = 4/4, 3 = 3/4). */
  meter: 3 | 4;
  /** Tempo in tellen per minuut, voor de loop en voor "Speel progressie". */
  bpm: number;
  path: PathEntry[];
  /** Het akkoord in het schema dat nu geselecteerd is. */
  focus: number;
  /** Vorige versies van het schema, voor ongedaan maken (niet bewaard in de browser). */
  history: { path: PathEntry[]; focus: number }[];
}

export type SettingsPatch = Partial<Pick<State, 'size' | 'lang' | 'namer' | 'instrument' | 'sound' | 'timbre' | 'meter' | 'showBlue' | 'showPenta' | 'bpm' | 'saxKey'>>;

export const BPM_MIN = 40, BPM_MAX = 220;
/** Tempo binnen het bereik van de schuif; onzin (NaN, tekst) wordt het standaardtempo. */
export const clampBpm = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(BPM_MAX, Math.max(BPM_MIN, v))) : 90);

export type Action =
  | { type: 'setRoot'; root: number }
  | { type: 'setMode'; mode: ModeIndex }
  | { type: 'relative'; root: number; mode: ModeIndex }
  | { type: 'select'; degree: number }
  | { type: 'go'; to: Destination }
  | { type: 'focusPath'; index: number }
  | { type: 'setBeats'; index: number; beats: number }
  | { type: 'setSize'; index: number; size: ChordSize }
  | { type: 'undo' }
  | { type: 'removeAt'; index: number }
  | { type: 'clearPath' }
  /** Een reeks akkoorden (bv. een sequentie) invoegen na het geselecteerde akkoord, of het schema ermee vervangen. */
  | { type: 'insertPath'; entries: PathEntry[]; replace: boolean }
  | { type: 'setScale'; root: number; mode: ModeIndex }
  | { type: 'settings'; patch: SettingsPatch };

const PREFS_KEY = 'tln-prefs';
function loadPrefs(): Partial<State> {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}'); } catch { return {}; }
}

const CHART_KEY = 'tln-chart';
const inRange = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
/** Een opgeslagen schema alleen overnemen als elke waarde geldig is; anders zou de app bij het starten crashen. */
/** Oudere schema's hebben geen grootte per akkoord: die krijgen de grootte uit de voorkeuren. */
export function validChart(c: unknown, defaultSize: ChordSize = 3): PathEntry[] | null {
  if (!Array.isArray(c) || c.length === 0) return null;
  const ok = c.every((e) => e && inRange(e.root, 0, 11) && inRange(e.mode, 0, 6) && inRange(e.degree, 0, 6) && inRange(e.beats, 1, 16)
    && (e.size === undefined || e.size === 3 || e.size === 4));
  return ok ? c.map(({ root, mode, degree, beats, size }) => ({ root, mode, degree, beats, size: size ?? defaultSize })) : null;
}

function loadChart(defaultSize: ChordSize): PathEntry[] | null {
  try { return validChart(JSON.parse(localStorage.getItem(CHART_KEY) ?? 'null'), defaultSize); } catch { return null; }
}

/** Vroeger bewaarde de loop het tempo zelf; neem dat over zodat niemand zijn tempo kwijt is. */
function legacyLoopBpm(): unknown {
  try { return JSON.parse(localStorage.getItem('tln-loop') ?? '{}').bpm; } catch { return undefined; }
}

function initial(): State {
  const p = loadPrefs();
  const size: ChordSize = p.size === 4 ? 4 : 3;
  const saved = loadChart(size);
  const start: PathEntry = saved?.[saved.length - 1] ?? { root: 2, mode: 3, degree: 0, beats: 4, size }; // D Dorisch
  return {
    root: start.root, mode: start.mode, degree: start.degree,
    timbre: p.timbre && TIMBRES.includes(p.timbre) ? p.timbre : 'piano',
    meter: p.meter === 3 ? 3 : 4,
    bpm: clampBpm(p.bpm ?? legacyLoopBpm()),
    showBlue: p.showBlue !== false,
    showPenta: p.showPenta === true,
    focus: (saved?.length ?? 1) - 1,
    size,
    history: [],
    lang: p.lang && p.lang in MESSAGES ? p.lang : 'nl',
    namer: typeof p.namer === 'string' ? p.namer : 'en',
    instrument: typeof p.instrument === 'string' ? p.instrument : 'piano',
    saxKey: p.saxKey && SAX_KEYS.includes(p.saxKey) ? p.saxKey : 'Eb',
    sound: p.sound !== false,
    path: saved ?? [start],
  };
}

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

interface Ctx {
  state: State;
  dispatch: (a: Action) => void;
  t: Messages;
  names: Names;
  scale: Scale;
  chords: Chord[];
  scaleLabel: (s: Scale) => string;
  playScale: () => void;
  playPath: () => void;
  /** Speel een reeks akkoorden in het huidige tempo (bv. een sequentie, zonder ze in het schema te zetten). */
  playChords: (items: { chord: Chord; beats: number }[]) => void;
}
const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, initial);
  // de nieuwste toestand, ook tussen twee dispatches in dezelfde tick (voor het geluid)
  const latest = useRef(state);
  latest.current = state;
  const t = MESSAGES[state.lang];
  const names = useMemo(() => makeNames(namerById(state.namer)), [state.namer]);
  const scale = scaleOf(state.root, state.mode);
  const chords = useMemo(() => chordsOf(scale, state.size), [scale, state.size]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: state.lang, namer: state.namer, size: state.size, sound: state.sound, instrument: state.instrument, timbre: state.timbre, meter: state.meter, showBlue: state.showBlue, showPenta: state.showPenta, bpm: state.bpm, saxKey: state.saxKey }));
    } catch { /* opslag niet beschikbaar: geen probleem */ }
    document.documentElement.lang = state.lang;
    document.title = t.title;
  }, [state.lang, state.namer, state.size, state.sound, state.instrument, state.timbre, state.meter, state.showBlue, state.showPenta, state.bpm, state.saxKey, t.title]);

  useEffect(() => {
    try { localStorage.setItem(CHART_KEY, JSON.stringify(state.path)); } catch { /* niet erg */ }
  }, [state.path]);

  useEffect(() => { audio.setTimbre(state.timbre); }, [state.timbre]);

  const value = useMemo<Ctx>(() => {
    const play = (events: Parameters<typeof audio.play>[0]) => { if (state.sound) audio.play(events); };
    // geluid hoort bij een klik: we spelen het akkoord van de nieuwe toestand direct in de dispatch
    const dispatch = (a: Action) => {
      const next = reducer(latest.current, a);
      latest.current = next;
      rawDispatch(a);
      const plays = a.type === 'select' || a.type === 'go' || a.type === 'focusPath' || a.type === 'setSize' || (a.type === 'settings' && a.patch.sound === true);
      const preview = () => audio.play(chordEvents(chordsOf(scaleOf(next.root, next.mode), next.size)[next.degree]));
      if (next.sound && !loopState.running) {
        if (plays) preview();
        // een nieuwe klank meteen laten horen, maar pas als de opnames ervan geladen zijn
        else if (a.type === 'settings' && a.patch.timbre) { audio.now(); void audio.setTimbre(a.patch.timbre).then(preview); }
      }
    };
    return {
      state, dispatch, t, names, scale, chords,
      scaleLabel: (s: Scale) => `${names.note(s.notes[0])} ${t.modes[s.mode]}`,
      playScale: () => play(scaleEvents(scale, state.showPenta ? pentatonic(scale).notes : scale.notes)),
      playPath: () => play(progressionEvents(state.path.map((p) => ({ chord: chordOf(p), beats: p.beats })), 60 / state.bpm)),
      playChords: (items) => play(progressionEvents(items, 60 / state.bpm)),
    };
  }, [state, t, names, scale, chords]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp buiten AppProvider');
  return c;
}
