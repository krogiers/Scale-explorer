import { CHAR_DEGREE, harmonicFunction, romanNumeral } from '../core/theory';
import { computeTargets, type Destination } from '../core/navigation';
import type { Chord } from '../core/theory';
import { fill } from '../i18n';
import { useApp } from '../state/store';
import { sharedText } from './util';

export function ChordRow() {
  const { state, dispatch, t, names, scale, chords } = useApp();
  const charPc = scale.notes[CHAR_DEGREE[scale.mode]].pc;
  return (
    <div className="chordrow">
      {chords.map((c) => {
        const fn = harmonicFunction(scale.mode, c.degree);
        return (
          <button key={c.degree} type="button" className={`ch${c.pcs.has(charPc) ? ' char' : ''}`} aria-pressed={c.degree === state.degree}
            onClick={() => dispatch({ type: 'select', degree: c.degree })}>
            <span className="rn">{romanNumeral(scale, c)}</span>
            <span className="cn">{names.chord(c)}</span>
            <span className="tones">{c.notes.map(names.note).join(' ')}</span>
            <span className="fn">{fn ? t.fn[fn] : ' '}</span>
            <span className="dot" />
          </button>
        );
      })}
    </div>
  );
}

function Target({ kind, chord, roman, why, to, strong }: { kind: 'dia' | 'bor' | 'piv'; chord: Chord; roman: string; why: string; to: Destination; strong?: boolean }) {
  const { dispatch, names } = useApp();
  return (
    <button type="button" className={`tgt ${kind}${strong ? ' s0' : ''}`} onClick={() => dispatch({ type: 'go', to })}>
      <span className="tn">{names.chord(chord)}</span><span className="tr">{roman}</span><span className="tw">{why}</span>
    </button>
  );
}

export function NextSteps() {
  const { state, dispatch, t, names, scale, chords, scaleLabel } = useApp();
  const tg = computeTargets(scale, state.size, state.degree);
  const current = chords[state.degree];
  return (
    <div className="next">
      <div className="grp g-dia">
        <h3><i />{fill(t.groupDiatonic, { scale: scaleLabel(scale) })}</h3>
        <div className="tgts">
          {tg.diatonic.map((x) => {
            const fn = harmonicFunction(scale.mode, x.chord.degree);
            const why = [t.moves[x.move], sharedText(x.shared, t), fn ? t.fn[fn] : ''].filter(Boolean).join(' · ');
            return <Target key={x.chord.key} kind="dia" chord={x.chord} roman={romanNumeral(scale, x.chord)} why={why} to={x.to} strong={x.strength === 0} />;
          })}
        </div>
      </div>
      <div className="grp g-bor">
        <h3><i />{t.groupBorrowed}</h3>
        <div className="tgts">
          {tg.borrowed.map((x) => {
            const nn = x.newNotes.map(names.note).join(', ');
            const why = fill(t.from, { scale: scaleLabel(x.source) }) + (nn ? ' · ' + fill(t.newNote, { n: nn }) : '');
            return <Target key={x.chord.key} kind="bor" chord={x.chord} roman={romanNumeral(x.source, x.chord)} why={why} to={x.to} />;
          })}
        </div>
      </div>
      <div className="grp g-piv">
        <h3><i />{t.groupPivot}</h3>
        {tg.pivots.map((p) => (
          <div className="pivblock" key={p.scale.root}>
            {p.pivot ? <>
              <p>{fill(t.pivotIn, { scale: scaleLabel(p.scale), chord: names.chord(current), roman: romanNumeral(p.scale, p.pivot) })}</p>
              <div className="tgts">
                {p.targets.map((x) => (
                  <Target key={x.chord.key} kind="piv" chord={x.chord} roman={`${romanNumeral(p.scale, x.chord)} · ${t.abbr[p.scale.mode]}`}
                    why={fill(t.newNote, { n: p.newNotes.map(names.note).join(', ') })} to={x.to} />
                ))}
              </div>
            </> : (
              <p>
                {fill(t.pivotNot, { chord: names.chord(current), scale: scaleLabel(p.scale) })}{' '}
                {p.sharedChords.map((c, i) => (
                  <span key={c.key}>{i > 0 && ', '}<button type="button" className="linkbtn" onClick={() => dispatch({ type: 'select', degree: c.degree })}>{names.chord(c)}</button></span>
                ))}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
