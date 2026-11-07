import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { scaleOf } from '../../../core';
import { fill } from '../../../i18n';
import { chordOf, MAX_CHORDS, useApp, useLoop } from '../../../state';
import { Heading, layoutBars, PlayButton, showToast } from '../../../ui';
import { useChartDrag } from './useChartDrag';

const DURATIONS = [1, 2, 3, 4, 6, 8, 12, 16];

/**
 * Akkoordenschema: maten met akkoorden, elk met een eigen duur. Klik om te selecteren en te bewerken.
 * Het akkoord dat de loop speelt, licht op. onShowSequences: de lege toestand verwijst naar de sequenties.
 */
export function Chart({ onShowSequences }: { onShowSequences: () => void }) {
  const { state, dispatch, t, names, scaleLabel, playPath } = useApp();
  const { info } = useLoop();
  const playing = info && info.chord >= 0 ? info.chord : -1;
  // wissen en verwijderen kun je meteen terugdraaien vanuit de melding
  const undoToast = (text: string) => showToast({ text, action: { label: t.undo, run: () => dispatch({ type: 'undo' }) } });
  const chordAt = (i: number) => {
    const p = state.path[i];
    const s = scaleOf(p.root, p.mode);
    return { p, s, c: chordOf(p) };
  };
  const canUndo = state.history.length > 0;

  // Ctrl/Cmd+Z maakt de laatste wijziging aan het schema ongedaan (niet in tekstvelden)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, select, textarea');
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); dispatch({ type: 'undo' }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);
  const bars = layoutBars(state.path.map((p) => p.beats), state.meter);
  const focus = Math.min(state.focus, state.path.length - 1);
  const f = chordAt(focus);

  // verslepen: verplaatsen, of kopiëren met Alt/Option
  const chartRef = useRef<HTMLDivElement>(null);
  const { drag, onPointerDown, consumeClick } = useChartDrag(chartRef, (from, to, copy) => dispatch({ type: 'movePath', from, to, copy }));
  const n = state.path.length;
  const dropGap = drag && drag.gap !== null && (drag.copy || (drag.gap !== drag.from && drag.gap !== drag.from + 1)) ? drag.gap : null;
  const lastSeg = bars.length ? bars[bars.length - 1].segments.length - 1 : -1;

  // met het toetsenbord: Alt + ← of → schuift het akkoord één plaats op; de focus gaat mee
  const refocus = useRef(false);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    chartRef.current?.querySelector<HTMLElement>(`[data-start][data-idx="${focus}"]`)?.focus();
  }, [state.path, focus]);
  const onCellKey = (index: number) => (e: ReactKeyboardEvent) => {
    if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const to = e.key === 'ArrowLeft' ? index - 1 : index + 2;
    if (to < 0 || to > n) return;
    refocus.current = true;
    dispatch({ type: 'movePath', from: index, to, copy: false });
  };

  return (
    <>
      <Heading title={t.chartTitle} help={t.chartHelp}>
        <div className="row pathtools">
          <div className="seg" role="group" aria-label={t.meter}>
            {([4, 3] as const).map((m) => (
              <button key={m} type="button" aria-pressed={state.meter === m} onClick={() => dispatch({ type: 'settings', patch: { meter: m } })}>{m}/4</button>
            ))}
          </div>
          <PlayButton id="path" label={t.playPath} onPlay={playPath} />
          <button type="button" className="ghost" disabled={!canUndo} onClick={() => dispatch({ type: 'undo' })} title="Ctrl/⌘+Z">↶ {t.undo}</button>
          <button type="button" className="ghost" disabled={n <= 1} onClick={() => { dispatch({ type: 'clearPath' }); undoToast(t.toastCleared); }}>{t.clear}</button>
        </div>
      </Heading>
      <div ref={chartRef} className={`chart${drag ? ' dragging' : ''}${drag?.copy ? ' copying' : ''}`}>
        {bars.map((bar, b) => (
          <div className="bar" key={b}>
            <span className="barno">{b + 1}</span>
            {bar.segments.map((sg, k) => {
              const { s, c } = chordAt(sg.index);
              const prev = sg.index > 0 ? state.path[sg.index - 1] : null;
              const keyChange = !prev || prev.root !== state.path[sg.index].root || prev.mode !== state.path[sg.index].mode;
              const drop = sg.start && dropGap === sg.index ? ' drop-before' : dropGap === n && b === bars.length - 1 && k === lastSeg ? ' drop-after' : '';
              const cls = `cell${sg.index === focus ? ' focus' : ''}${sg.index === playing ? ' playing' : ''}${drag?.from === sg.index ? ' lifted' : ''}${drop}`;
              return sg.start ? (
                <button key={k} type="button" className={cls} style={{ flexGrow: sg.beats }} data-idx={sg.index} data-start=""
                  onPointerDown={onPointerDown(sg.index)} onKeyDown={onCellKey(sg.index)}
                  onClick={() => { if (!consumeClick()) dispatch({ type: 'focusPath', index: sg.index }); }}
                  aria-label={`${names.chord(c)}, ${scaleLabel(s)}, ${fill(t.beatsN, { n: state.path[sg.index].beats })}`}>
                  <span className={`k${keyChange ? '' : ' same'}`}>{scaleLabel(s)}</span>
                  <b>{names.chord(c)}</b>
                  <span className="grip" aria-hidden="true">⠿</span>
                </button>
              ) : (
                <span key={k} className={`${cls} cont`} style={{ flexGrow: sg.beats }} data-idx={sg.index} aria-hidden="true">
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
        <div className="field"><span className="lbl">{t.chords}</span>
          <div className="seg" role="group">
            {([3, 4] as const).map((n) => (
              <button key={n} type="button" aria-pressed={f.p.size === n} onClick={() => dispatch({ type: 'setSize', index: focus, size: n })}>{n === 3 ? t.triads : t.sevenths}</button>
            ))}
          </div>
        </div>
        <button type="button" className="ghost" disabled={state.path.length <= 1} onClick={() => { dispatch({ type: 'removeAt', index: focus }); undoToast(fill(t.toastRemoved, { chord: names.chord(f.c) })); }}>{t.remove}</button>
      </div>
      {n === 1 && <p className="chart-empty">{t.chartEmpty} <button type="button" className="linkbtn" onClick={onShowSequences}>{t.chartEmptySeq}</button></p>}
      {state.path.length >= MAX_CHORDS && <p className="small" role="status">{fill(t.chartFull, { n: MAX_CHORDS })}</p>}
    </>
  );
}
