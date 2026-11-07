import { blueNote, CHAR_DEGREE, formula, parentMajorDegree, pentatonic, scaleOf, type ModeIndex } from '../core/theory';
import { fill } from '../i18n';
import { useApp } from '../state/store';

export function ScaleHeader() {
  const { state, t, names, scale, scaleLabel, playScale } = useApp();
  const blue = blueNote(scale);
  const cd = CHAR_DEGREE[scale.mode];
  const parent = fill(t.majorOf, { r: names.note(scale.notes[parentMajorDegree(scale.mode)]) });
  const vars = { scale: scaleLabel(scale), parent, root: names.note(scale.notes[0]), note: names.note(scale.notes[cd]), char: t.chars[scale.mode] };
  const deg = formula(scale.mode);
  const penta = state.showPenta ? pentatonic(scale) : null;
  const out = (pc: number) => !!penta && !penta.pcs.has(pc);
  return (
    <div className="stack">
      <div className="scale-name">
        {scaleLabel(scale)}
        {t.alias[scale.mode] && <span className="alias"> {t.alias[scale.mode]}</span>}
      </div>
      <p>{fill(scale.mode === 1 ? t.explainIonian : t.explain, vars)}</p>
      <div className="notes">
        {scale.notes.map((n, i) => (
          <div key={i} className={`note${i === cd ? ' char' : ''}${out(n.pc) ? ' out' : ''}`}><b>{names.note(n)}</b><span>{deg[i]}</span></div>
        ))}
        {state.showBlue && !blue.inScale && <div className="note blue" title={t.blue}><b>{names.note(blue.note)}</b><span>♭5</span></div>}
      </div>
      {penta && (
        <p className="pentahint">
          <b>{t.pentaKinds[penta.kind]}</b>: {penta.notes.map(names.note).join(' ')}. {fill(t.pentaDropped, { notes: penta.dropped.map(names.note).join(', ') })}
          {!penta.pcs.has(scale.notes[cd].pc) && <> {t.pentaChar}</>}
          {state.showBlue && penta.kind === 'minor' && !blue.inScale && <> {fill(t.pentaBlues, { n: names.note(blue.note) })}</>}
        </p>
      )}
      {state.showBlue && <p className="bluehint">{t.blue}: {names.note(blue.note)}{blue.inScale ? ' (' + t.blueInScale + ')' : ''}. {t.blueHelp}</p>}
      <div><button type="button" className="ghost play" onClick={playScale}>{t.playScale}</button></div>
    </div>
  );
}

export function ModeLadder() {
  const { dispatch, t, names, scale } = useApp();
  return (
    <div className="ladder">
      {Array.from({ length: 7 }, (_, m) => {
        const s2 = scaleOf(scale.root, m as ModeIndex), current = m === scale.mode;
        const diff = s2.notes.filter((n) => !scale.pcs.has(n.pc)).map(names.note);
        return (
          <button key={m} type="button" className="lad" aria-current={current} onClick={() => dispatch({ type: 'setMode', mode: m as ModeIndex })}>
            <span className="sw" style={{ background: `var(--m${m})` }} />
            <span className="nm">
              <span><b>{t.modes[m]}</b>{t.alias[m] && <span className="muted small"> {t.alias[m]}</span>}</span>
              <small>{formula(m as ModeIndex).join(' ')}</small>
            </span>
            <span className="df">{current ? t.now : <>{t.changes} <b>{diff.join(', ')}</b></>}</span>
          </button>
        );
      })}
    </div>
  );
}
