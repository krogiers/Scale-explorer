/**
 * De meespeelloop als gedeelde toestand: één speler voor de hele app, zodat de loop blijft lopen als je van scherm
 * wisselt, en het scherm Spelen, de bovenbalk en het schema dezelfde loop tonen. Moet binnen AppProvider staan.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { makeMelody, scaleOf, seededRng, type MelodyNote, type Spot } from '../core';
import { audio, progressionVoicings } from '../audio';
import { LOOP_STYLES, LoopPlayer, type BeatInfo, type LoopOptions, type TimelineItem } from '../audio/loop';
import { chordOf } from './model';
import { playOrder } from './repeats';
import { useApp } from './store';

const KEY = 'tln-loop';
const BARS_KEY = 'tln-practice-bars';
/** Het tempo en de maatsoort zitten in de gedeelde toestand (ook "Speel progressie" gebruikt ze); de rest bewaart de loop zelf. */
export type LoopSettings = Omit<LoopOptions, 'meter' | 'bpm'>;
const DEFAULTS: LoopSettings = { metronome: true, drums: true, style: 'comp', countIn: true, melody: false };
function load(): LoopSettings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      metronome: typeof s.metronome === 'boolean' ? s.metronome : DEFAULTS.metronome,
      drums: typeof s.drums === 'boolean' ? s.drums : DEFAULTS.drums,
      style: LOOP_STYLES.includes(s.style) ? s.style : 'comp',
      countIn: typeof s.countIn === 'boolean' ? s.countIn : DEFAULTS.countIn,
      melody: s.melody === true,
    };
  } catch { return DEFAULTS; }
}

/** Oefenmodus: een drone op de grondtoon, de geldende modus wisselt om de `bars` maten tussen a en b. */
export interface Practice { a: Spot; b: Spot; bars: number }
export const PRACTICE_BARS = [1, 2, 4, 8] as const;

/** Drone van één maat: grondtoon laag in de bas, met de kwint een octaaf hoger (zoals bij "Hoor het verschil"). */
const drone = (s: Spot, beats: number): TimelineItem => ({ voicing: [36 + s.root, 36 + s.root + 19], beats });
/** De tijdlijn van een oefening: eerst `bars` maten a, dan `bars` maten b, telkens één maat per item. */
export const practiceTimeline = (p: Practice, meter: number): TimelineItem[] =>
  [...Array<Spot>(p.bars).fill(p.a), ...Array<Spot>(p.bars).fill(p.b)].map((s) => drone(s, meter));

/**
 * Waar staat de oefening op deze tel? De modus die nu geldt, de andere, en hoeveel maten tot de wissel
 * (de huidige meegeteld). Tijdens het aftellen geldt a.
 */
export function practiceAt(p: Practice, info: BeatInfo | null): { now: Spot; other: Spot; barsLeft: number } {
  const bar = !info || info.chord < 0 ? 0 : info.chord;
  const first = bar < p.bars;
  return { now: first ? p.a : p.b, other: first ? p.b : p.a, barsLeft: p.bars - (bar % p.bars) };
}

interface LoopCtx {
  running: boolean;
  /**
   * De tel die nu klinkt, of null als de loop stilstaat. chord = -1 tijdens het aftellen; bij het schema is het de
   * plaats in het schema (herhalingen lopen dus terug), bij een oefening de maat van de oefening.
   */
  info: BeatInfo | null;
  /** Het akkoord in het schema dat hierna komt, met de herhalingen meegerekend; -1 als er geen is. */
  nextChord: number;
  /** De verzonnen melodie bij het akkoord dat nu speelt (leeg als de melodie uit staat of niets speelt). */
  melodyNow: MelodyNote[];
  /** Een nieuwe melodie verzinnen (dezelfde blijft terugkomen tot je dit vraagt). */
  newMelody: () => void;
  opts: LoopSettings;
  setOpts: (patch: Partial<LoopSettings>) => void;
  toggle: () => void;
  /** De oefening die loopt, of null (dan speelt de loop het schema). Stopt de loop, dan stopt ook de oefening. */
  practice: Practice | null;
  /** Start een oefening tussen a en b (een loop die al speelt, begint opnieuw). */
  startPractice: (a: Spot, b: Spot) => void;
  setPracticeBars: (bars: number) => void;
}
const Ctx = createContext<LoopCtx | null>(null);

export function LoopProvider({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const [opts, setOptsState] = useState<LoopSettings>(load);
  const [info, setInfo] = useState<BeatInfo | null>(null);
  const [running, setRunning] = useState(false);
  const [practice, setPracticeState] = useState<Practice | null>(null);
  const [bars, setBars] = useState<number>(() => { try { const b = Number(localStorage.getItem(BARS_KEY)); return (PRACTICE_BARS as readonly number[]).includes(b) ? b : 2; } catch { return 2; } });
  // de planner leest de oefening via een ref: die moet al kloppen vóór de volgende render (bij de start)
  const practiceRef = useRef<Practice | null>(null);
  const setPractice = (p: Practice | null) => { practiceRef.current = p; setPracticeState(p); };

  // de planner leest altijd de nieuwste progressie en instellingen via refs
  // de tijdlijn speelt de herhalingen uitgeschreven; order[stap] = plaats in het schema
  const timeline = useRef<TimelineItem[]>([]);
  const order = useRef<number[]>([]);
  // de melodie hangt aan een zaad: zelfde schema en zaad = zelfde melodie; "Nieuwe melodie" kiest een nieuw zaad
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const built = useMemo(() => {
    const ord = playOrder(state.path);
    const voicings = progressionVoicings(ord.map((i) => chordOf(state.path[i])));
    const melody = opts.melody
      ? makeMelody(ord.map((i) => ({ scale: scaleOf(state.path[i].root, state.path[i].mode), chord: chordOf(state.path[i]), beats: state.path[i].beats })), state.meter, seededRng(seed))
      : null;
    return { ord, melody, items: ord.map((i, k) => ({ voicing: voicings[k], beats: state.path[i].beats, ...(melody && { melody: melody[k] }) })) };
  }, [state.path, state.meter, opts.melody, seed]);
  timeline.current = built.items;
  order.current = built.ord;
  const [step, setStep] = useState(-1);
  const optsRef = useRef<LoopOptions>({ ...opts, bpm: state.bpm, meter: state.meter });
  optsRef.current = { ...opts, bpm: state.bpm, meter: state.meter };
  // een oefening is een drone: aangehouden, zonder drums (metronoom en aftellen zoals ingesteld)
  const getOpts = (): LoopOptions => practiceRef.current ? { ...optsRef.current, style: 'sustain', drums: false } : optsRef.current;
  const getTimeline = () => practiceRef.current ? practiceTimeline(practiceRef.current, optsRef.current.meter) : timeline.current;

  const player = useRef<LoopPlayer | null>(null);
  if (!player.current) {
    // info = null betekent: gestopt (ook als iets anders begon te spelen en de loop overnam)
    player.current = new LoopPlayer(audio, getTimeline, getOpts, (i) => {
      // bij het schema: de stap in de tijdlijn terugvertalen naar de plaats in het schema
      const ord = order.current;
      const map = i && i.chord >= 0 && !practiceRef.current;
      setStep(map ? i.chord : -1);
      setInfo(map ? { ...i, chord: ord[i.chord % ord.length] ?? 0 } : i);
      if (!i) { setRunning(false); setPractice(null); }
    });
  }
  useEffect(() => () => player.current?.stop(), []);
  // schema leeggemaakt terwijl de loop het speelt: er valt niets meer te spelen
  useEffect(() => { if (state.path.length === 0 && !practiceRef.current && player.current?.running) { player.current.stop(); setRunning(false); } }, [state.path.length]);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(opts)); } catch { /* niet erg */ } }, [opts]);
  useEffect(() => { try { localStorage.setItem(BARS_KEY, String(bars)); } catch { /* niet erg */ } }, [bars]);

  const ord = built.ord;
  const nextChord = step >= 0 && ord.length ? ord[(step + 1) % ord.length] : -1;
  const melodyNow = built.melody && step >= 0 ? built.melody[step % built.melody.length] ?? [] : [];
  const value = useMemo<LoopCtx>(() => ({
    running, info, nextChord, melodyNow, newMelody: () => setSeed((s) => (s * 1103515245 + 12345) % 2 ** 31), opts, practice,
    startPractice: (a, b) => {
      const p = player.current!;
      if (p.running) p.stop(); // dit wist ook een vorige oefening
      setPractice({ a, b, bars });
      p.start();
      setRunning(p.running);
      if (!p.running) setPractice(null);
    },
    setPracticeBars: (n) => { setBars(n); if (practiceRef.current) setPractice({ ...practiceRef.current, bars: n }); },
    setOpts: (patch) => setOptsState((o) => ({ ...o, ...patch })),
    toggle: () => {
      const p = player.current!;
      if (p.running) { p.stop(); setRunning(false); } else { p.start(); setRunning(p.running); }
    },
  }), [running, info, nextChord, melodyNow, opts, practice, bars]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLoop(): LoopCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLoop buiten LoopProvider');
  return c;
}
