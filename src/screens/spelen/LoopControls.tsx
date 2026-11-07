import { useEffect, useMemo, useRef, useState } from 'react';
import { blueNote, CHAR_DEGREE, scaleOf } from '../../core';
import { audio, progressionVoicings, TIMBRES } from '../../audio';
import { LOOP_STYLES, LoopPlayer, type BeatInfo, type LoopOptions, type LoopStyle, type TimelineItem } from '../../audio/loop';
import { fill } from '../../i18n';
import { BPM_MAX, BPM_MIN, chordOf, useApp, type Timbre } from '../../state';

const KEY = 'tln-loop';
/** Het tempo zit in de gedeelde toestand (ook "Speel progressie" gebruikt het); de rest bewaart de loop zelf. */
type Saved = Omit<LoopOptions, 'meter' | 'bpm'>;
const DEFAULTS: Saved = { metronome: true, drums: true, style: 'comp', countIn: true };
function load(): Saved {
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

/** Bediening van de meespeelloop. Geeft de tel terug zodat de progressie het huidige akkoord kan markeren. */
export function LoopControls({ onBeat }: { onBeat: (info: BeatInfo | null) => void }) {
  const { state, dispatch, t, names, scaleLabel } = useApp();
  const [opts, setOpts] = useState<Saved>(load);
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
  const onBeatRef = useRef(onBeat);
  onBeatRef.current = onBeat;

  const player = useRef<LoopPlayer | null>(null);
  if (!player.current) {
    player.current = new LoopPlayer(audio, () => timeline.current, () => optsRef.current, (i) => { setInfo(i); if (!i) setRunning(false); onBeatRef.current(i); });
  }
  useEffect(() => () => player.current?.stop(), []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(opts)); } catch { /* niet erg */ } }, [opts]);

  const toggle = () => {
    if (player.current!.running) { player.current!.stop(); setRunning(false); }
    else { player.current!.start(); setRunning(player.current!.running); }
  };
  const set = (patch: Partial<Saved>) => setOpts((o) => ({ ...o, ...patch }));

  let now = <p className="muted small">{t.loopIdle}</p>;
  if (running && info) {
    if (info.chord < 0) {
      now = <div className="loop-now"><span className="lbl">{t.countingIn}</span><b className="count">{info.beat + 1}</b></div>;
    } else {
      const p = state.path[info.chord % state.path.length];
      const s = scaleOf(p.root, p.mode);
      const c = chordOf(p);
      const nc = chordOf(state.path[(info.chord + 1) % state.path.length]);
      now = (
        <div className="loop-now">
          <b className="loop-chord">{names.chord(c)}</b>
          <div className="loop-what">
            <span className="loop-scale">{fill(t.nowPlay, { scale: scaleLabel(s) })}</span>
            <span className="tones-big">{t.chordNotes}: {c.notes.map(names.note).join(' ')}{state.showBlue && !blueNote(s).inScale && <span className="bl"> · {fill(t.blueNote, { n: names.note(blueNote(s).note) })}</span>}</span>
            <span className="muted small">{fill(t.charHint, { note: names.note(s.notes[CHAR_DEGREE[s.mode]]) })}{state.path.length > 1 ? ' · ' + fill(t.nextUp, { chord: names.chord(nc) }) : ''}</span>
          </div>
          <div className="beats" aria-hidden="true">
            {Array.from({ length: info.beats }, (_, i) => <i key={i} className={i === info.beat ? 'on' : ''} />)}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="loop">
      <div className="loop-head">
        <h2>{t.loopTitle}</h2>
        <button type="button" className={`loopbtn${running ? ' on' : ''}`} aria-pressed={running} onClick={toggle}>
          {running ? '■ ' + t.loopStop : '▶ ' + t.loopStart}
        </button>
      </div>
      <div className="loop-controls">
        <div className="field grow"><label htmlFor="bpm">{t.tempo}: <b>{state.bpm} BPM</b></label>
          <input id="bpm" type="range" min={BPM_MIN} max={BPM_MAX} step={2} value={state.bpm} onChange={(e) => dispatch({ type: 'settings', patch: { bpm: +e.target.value } })} />
        </div>
        <div className="field"><label htmlFor="style">{t.accompaniment}</label>
          <select id="style" value={opts.style} onChange={(e) => set({ style: e.target.value as LoopStyle })}>
            {LOOP_STYLES.map((k) => <option key={k} value={k}>{t.styles[k]}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="timbre">{t.timbre}</label>
          <select id="timbre" value={state.timbre} onChange={(e) => dispatch({ type: 'settings', patch: { timbre: e.target.value as Timbre } })}>
            {TIMBRES.map((k) => <option key={k} value={k}>{t.timbres[k]}</option>)}
          </select>
        </div>
        <label className="check"><input id="drums" type="checkbox" checked={opts.drums} onChange={(e) => set({ drums: e.target.checked })} /> {t.drums}</label>
        <label className="check"><input id="metro" type="checkbox" checked={opts.metronome} onChange={(e) => set({ metronome: e.target.checked })} /> {t.metronome}</label>
        <label className="check"><input id="countin" type="checkbox" checked={opts.countIn} onChange={(e) => set({ countIn: e.target.checked })} /> {t.countIn}</label>
      </div>
      <div aria-live="polite">{now}</div>
      <p className="muted small">{t.loopHelp}</p>
    </div>
  );
}
