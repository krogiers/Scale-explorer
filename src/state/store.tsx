/** Provider: houdt de toestand bij, bewaart ze en speelt het geluid dat bij een klik hoort. */
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { chordsOf, pentatonic, scaleOf, type Chord, type Scale } from '../core';
import { MESSAGES, type Messages } from '../i18n';
import { makeNames, namerById, type Names } from '../naming';
import { audio, chordEvents, playOnly, progressionEvents, scaleEvents } from '../audio';
import { loopState } from '../audio/loop';
import { chordOf, type Action, type State } from './model';
import { initial, saveChart, savePrefs } from './persist';
import { reducer } from './reducer';

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
    savePrefs(state);
    document.documentElement.lang = state.lang;
    document.title = t.title;
  }, [state.lang, state.namer, state.size, state.sound, state.instrument, state.timbre, state.meter, state.showBlue, state.showPenta, state.bpm, state.saxKey, t.title]);

  useEffect(() => { saveChart(state.path); }, [state.path]);

  useEffect(() => { audio.setTimbre(state.timbre); }, [state.timbre]);

  const value = useMemo<Ctx>(() => {
    const play = (events: Parameters<typeof audio.play>[0]) => { if (state.sound) playOnly(events); };
    // geluid hoort bij een klik: we spelen het akkoord van de nieuwe toestand direct in de dispatch
    const dispatch = (a: Action) => {
      const next = reducer(latest.current, a);
      latest.current = next;
      rawDispatch(a);
      const plays = a.type === 'select' || a.type === 'go' || a.type === 'focusPath' || a.type === 'setSize' || (a.type === 'settings' && a.patch.sound === true);
      const preview = () => playOnly(chordEvents(chordsOf(scaleOf(next.root, next.mode), next.size)[next.degree]));
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
