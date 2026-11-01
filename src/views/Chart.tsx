import { useState } from 'react';
import { chordsOf, scaleOf } from '../core/theory';
import type { BeatInfo } from '../audio/loop';
import { fill } from '../i18n';
import { useApp } from '../state/store';
import { layoutBars } from './chartLayout';
import { LoopControls } from './Loop';

const DURATIONS = [1, 2, 3, 4, 6, 8, 12, 16];

/** Akkoordenschema: maten met akkoorden, elk met een eigen duur. Klik om te selecteren en te bewerken. */
export function Chart() {
  const { state, dispatch, t, names, scaleLabel, playPath } = useApp();
  const [beat, setBeat] = useState<BeatInfo | null>(null);
  const playing = beat && beat.chord >= 0 ? beat.chord : -1;
  const chordAt = (i: number) => {
    const p = state.path[i];
    const s = scaleOf(p.root, p.mode);
    return { p, s, c: chordsOf(s, state.size)[p.degree] };
  };
  const bars = layoutBars(state.path.map((p) => p.beats), state.meter);
  const focus = Math.min(state.focus, state.path.length - 1);
  const f = chordAt(focus);

  return (
    <>
      <div className="pathhead">
        <h2>{t.chartTitle}</h2>
        <div className="row">
          <div className="seg" role="group" aria-label={t.meter}>
            {([4, 3] as const).map((m) => (
              <button key={m} type="button" aria-pressed={state.meter === m} onClick={() => dispatch({ type: 'settings', patch: { meter: m } })}>{m}/4</button>
            ))}
          </div>
          <button type="button" className="ghost play" onClick={playPath}>{t.playPath}</button>
          <button type="button" className="ghost" onClick={() => dispatch({ type: 'clearPath' })}>{t.clear}</button>
        </div>
      </div>
      <div className="chart">
        {bars.map((bar, b) => (
          <div className="bar" key={b}>
            <span className="barno">{b + 1}</span>
            {bar.segments.map((sg, k) => {
              const { s, c } = chordAt(sg.index);
              const prev = sg.index > 0 ? state.path[sg.index - 1] : null;
              const keyChange = !prev || prev.root !== state.path[sg.index].root || prev.mode !== state.path[sg.index].mode;
              const cls = `cell${sg.index === focus ? ' focus' : ''}${sg.index === playing ? ' playing' : ''}`;
              return sg.start ? (
                <button key={k} type="button" className={cls} style={{ flexGrow: sg.beats }}
                  onClick={() => dispatch({ type: 'focusPath', index: sg.index })}
                  aria-label={`${names.chord(c)}, ${scaleLabel(s)}, ${fill(t.beatsN, { n: state.path[sg.index].beats })}`}>
                  <span className={`k${keyChange ? '' : ' same'}`}>{scaleLabel(s)}</span>
                  <b>{names.chord(c)}</b>
                </button>
              ) : (
                <span key={k} className={`${cls} cont`} style={{ flexGrow: sg.beats }} aria-hidden="true">
                  {sg.beats === state.meter && k === 0 ? '%' : '·'}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="editbar">
        <span><span className="muted small">{t.selected}</span> <b>{names.chord(f.c)}</b> <span className="muted small">{scaleLabel(f.s)}</span> <span className="tones-big">{f.c.notes.map(names.note).join(' ')}</span></span>
        <div className="field"><span className="lbl">{t.duration}</span>
          <div className="seg" role="group">
            {DURATIONS.map((d) => (
              <button key={d} type="button" aria-pressed={f.p.beats === d} onClick={() => dispatch({ type: 'setBeats', index: focus, beats: d })}>{d}</button>
            ))}
          </div>
        </div>
        <button type="button" className="ghost" disabled={state.path.length <= 1} onClick={() => dispatch({ type: 'removeAt', index: focus })}>{t.remove}</button>
      </div>
      <p className="muted small">{t.chartHelp}</p>
      <LoopControls onBeat={setBeat} />
    </>
  );
}
