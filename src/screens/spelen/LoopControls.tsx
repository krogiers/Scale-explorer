import { blueNote, CHAR_DEGREE, scaleOf } from '../../core';
import { TIMBRES } from '../../audio';
import { LOOP_STYLES, type LoopStyle } from '../../audio/loop';
import { fill } from '../../i18n';
import { BPM_MAX, BPM_MIN, chordOf, practiceAt, PRACTICE_BARS, useApp, useLoop, type Timbre } from '../../state';
import { Heading } from '../../ui';

/** Bediening van de meespeelloop (de speler zelf zit in de gedeelde toestand, zie state/loop). */
export function LoopControls() {
  const { state, dispatch, t, names, scaleLabel } = useApp();
  const { running, info, opts, setOpts: set, toggle, practice, setPracticeBars } = useLoop();
  const drill = running ? practice : null;

  let now = <p className="muted small">{t.loopIdle}</p>;
  if (running && info) {
    if (info.chord < 0) {
      now = <div className="loop-now"><span className="lbl">{t.countingIn}</span><b className="count">{info.beat + 1}</b></div>;
    } else if (drill) {
      // oefening: de modus die nu geldt, wat je anders speelt dan in de andere, en wanneer de wissel komt
      const at = practiceAt(drill, info);
      const s = scaleOf(at.now.root, at.now.mode), o = scaleOf(at.other.root, at.other.mode);
      const added = s.notes.filter((n) => !o.pcs.has(n.pc)), gone = o.notes.filter((n) => !s.pcs.has(n.pc));
      const list = (ns: typeof added) => ns.map(names.note).join(', ');
      now = (
        <div className="loop-now drill">
          <b className="loop-chord">{scaleLabel(s)}</b>
          <div className="loop-what">
            <span className="loop-scale">{added.length ? fill(t.prPlay, { new: list(added), old: list(gone) }) : fill(t.prSame, { root: names.note(s.notes[0]) })}</span>
            <span className="tones-big">{s.notes.map((n) => <span key={n.pc} className={o.pcs.has(n.pc) ? undefined : 'hot'}>{names.note(n)} </span>)}</span>
            <span className="muted small">{at.barsLeft === 1 ? fill(t.prSwitch1, { scale: scaleLabel(o) }) : fill(t.prSwitch, { scale: scaleLabel(o), n: at.barsLeft })}</span>
          </div>
          <div className="beats" aria-hidden="true">
            {Array.from({ length: info.beats }, (_, i) => <i key={i} className={i === info.beat ? 'on' : ''} />)}
          </div>
        </div>
      );
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
      <Heading title={drill ? fill(t.prTitle, { a: scaleLabel(scaleOf(drill.a.root, drill.a.mode)), b: scaleLabel(scaleOf(drill.b.root, drill.b.mode)) }) : t.loopTitle} help={drill ? t.prHelp : t.loopHelp}>
        <button type="button" className={`loopbtn${running ? ' on' : ''}`} aria-pressed={running} onClick={toggle}>
          {running ? '■ ' + t.loopStop : '▶ ' + t.loopStart}
        </button>
      </Heading>
      <div className="loop-controls">
        <div className="field grow"><label htmlFor="bpm">{t.tempo}: <b>{state.bpm} BPM</b></label>
          <input id="bpm" type="range" min={BPM_MIN} max={BPM_MAX} step={2} value={state.bpm} onChange={(e) => dispatch({ type: 'settings', patch: { bpm: +e.target.value } })} />
        </div>
        {drill ? (
          <div className="field"><label htmlFor="every">{t.prEvery}</label>
            <select id="every" value={drill.bars} onChange={(e) => setPracticeBars(+e.target.value)}>
              {PRACTICE_BARS.map((n) => <option key={n} value={n}>{n === 1 ? t.prBar : fill(t.prBars, { n })}</option>)}
            </select>
          </div>
        ) : (
          <div className="field"><label htmlFor="style">{t.accompaniment}</label>
            <select id="style" value={opts.style} onChange={(e) => set({ style: e.target.value as LoopStyle })}>
              {LOOP_STYLES.map((k) => <option key={k} value={k}>{t.styles[k]}</option>)}
            </select>
          </div>
        )}
        <div className="field"><label htmlFor="timbre">{t.timbre}</label>
          <select id="timbre" value={state.timbre} onChange={(e) => dispatch({ type: 'settings', patch: { timbre: e.target.value as Timbre, timbreFollows: false } })}>
            {TIMBRES.map((k) => <option key={k} value={k}>{t.timbres[k]}</option>)}
          </select>
        </div>
        <label className="check"><input id="follow" type="checkbox" checked={state.timbreFollows} onChange={(e) => dispatch({ type: 'settings', patch: { timbreFollows: e.target.checked } })} /> {t.timbreFollows}</label>
        {!drill && <label className="check"><input id="drums" type="checkbox" checked={opts.drums} onChange={(e) => set({ drums: e.target.checked })} /> {t.drums}</label>}
        <label className="check"><input id="metro" type="checkbox" checked={opts.metronome} onChange={(e) => set({ metronome: e.target.checked })} /> {t.metronome}</label>
        <label className="check"><input id="countin" type="checkbox" checked={opts.countIn} onChange={(e) => set({ countIn: e.target.checked })} /> {t.countIn}</label>
      </div>
      <div aria-live="polite">{now}</div>
    </div>
  );
}
