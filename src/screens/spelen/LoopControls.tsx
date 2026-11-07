import { blueNote, CHAR_DEGREE, scaleOf } from '../../core';
import { TIMBRES } from '../../audio';
import { LOOP_STYLES, type LoopStyle } from '../../audio/loop';
import { fill } from '../../i18n';
import { BPM_MAX, BPM_MIN, chordOf, useApp, useLoop, type Timbre } from '../../state';
import { Heading } from '../../ui';

/** Bediening van de meespeelloop (de speler zelf zit in de gedeelde toestand, zie state/loop). */
export function LoopControls() {
  const { state, dispatch, t, names, scaleLabel } = useApp();
  const { running, info, opts, setOpts: set, toggle } = useLoop();

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
      <Heading title={t.loopTitle} help={t.loopHelp}>
        <button type="button" className={`loopbtn${running ? ' on' : ''}`} aria-pressed={running} onClick={toggle}>
          {running ? '■ ' + t.loopStop : '▶ ' + t.loopStart}
        </button>
      </Heading>
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
          <select id="timbre" value={state.timbre} onChange={(e) => dispatch({ type: 'settings', patch: { timbre: e.target.value as Timbre, timbreFollows: false } })}>
            {TIMBRES.map((k) => <option key={k} value={k}>{t.timbres[k]}</option>)}
          </select>
        </div>
        <label className="check"><input id="follow" type="checkbox" checked={state.timbreFollows} onChange={(e) => dispatch({ type: 'settings', patch: { timbreFollows: e.target.checked } })} /> {t.timbreFollows}</label>
        <label className="check"><input id="drums" type="checkbox" checked={opts.drums} onChange={(e) => set({ drums: e.target.checked })} /> {t.drums}</label>
        <label className="check"><input id="metro" type="checkbox" checked={opts.metronome} onChange={(e) => set({ metronome: e.target.checked })} /> {t.metronome}</label>
        <label className="check"><input id="countin" type="checkbox" checked={opts.countIn} onChange={(e) => set({ countIn: e.target.checked })} /> {t.countIn}</label>
      </div>
      <div aria-live="polite">{now}</div>
    </div>
  );
}
