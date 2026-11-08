/**
 * De meespeelloop als gedeelde toestand: één speler voor de hele app, zodat de loop blijft lopen als je van scherm
 * wisselt, en het scherm Spelen, de bovenbalk en het schema dezelfde loop tonen. Moet binnen AppProvider staan.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { audio, progressionVoicings } from '../audio';
import { LOOP_STYLES, LoopPlayer, type BeatInfo, type LoopOptions, type TimelineItem } from '../audio/loop';
import { chordOf } from './model';
import { useApp } from './store';

const KEY = 'tln-loop';
/** Het tempo en de maatsoort zitten in de gedeelde toestand (ook "Speel progressie" gebruikt ze); de rest bewaart de loop zelf. */
export type LoopSettings = Omit<LoopOptions, 'meter' | 'bpm'>;
const DEFAULTS: LoopSettings = { metronome: true, drums: true, style: 'comp', countIn: true };
function load(): LoopSettings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      metronome: typeof s.metronome === 'boolean' ? s.metronome : DEFAULTS.metronome,
      drums: typeof s.drums === 'boolean' ? s.drums : DEFAULTS.drums,
      style: LOOP_STYLES.includes(s.style) ? s.style : 'comp',
      countIn: typeof s.countIn === 'boolean' ? s.countIn : DEFAULTS.countIn,
    };
  } catch { return DEFAULTS; }
}

interface LoopCtx {
  running: boolean;
  /** De tel die nu klinkt (chord = -1 tijdens het aftellen), of null als de loop stilstaat. */
  info: BeatInfo | null;
  opts: LoopSettings;
  setOpts: (patch: Partial<LoopSettings>) => void;
  toggle: () => void;
}
const Ctx = createContext<LoopCtx | null>(null);

export function LoopProvider({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const [opts, setOptsState] = useState<LoopSettings>(load);
  const [info, setInfo] = useState<BeatInfo | null>(null);
  const [running, setRunning] = useState(false);

  // de planner leest altijd de nieuwste progressie en instellingen via refs
  const timeline = useRef<TimelineItem[]>([]);
  timeline.current = useMemo(() => {
    const voicings = progressionVoicings(state.path.map(chordOf));
    return state.path.map((p, i) => ({ voicing: voicings[i], beats: p.beats }));
  }, [state.path]);
  const optsRef = useRef<LoopOptions>({ ...opts, bpm: state.bpm, meter: state.meter });
  optsRef.current = { ...opts, bpm: state.bpm, meter: state.meter };

  const player = useRef<LoopPlayer | null>(null);
  if (!player.current) {
    // info = null betekent: gestopt (ook als iets anders begon te spelen en de loop overnam)
    player.current = new LoopPlayer(audio, () => timeline.current, () => optsRef.current, (i) => { setInfo(i); if (!i) setRunning(false); });
  }
  useEffect(() => () => player.current?.stop(), []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(opts)); } catch { /* niet erg */ } }, [opts]);

  const value = useMemo<LoopCtx>(() => ({
    running, info, opts,
    setOpts: (patch) => setOptsState((o) => ({ ...o, ...patch })),
    toggle: () => {
      const p = player.current!;
      if (p.running) { p.stop(); setRunning(false); } else { p.start(); setRunning(p.running); }
    },
  }), [running, info, opts]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLoop(): LoopCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLoop buiten LoopProvider');
  return c;
}
