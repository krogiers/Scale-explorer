import { harmonicFunction, romanNumeral, computeTargets, type Destination, type Chord } from '../../core';
import { fill } from '../../i18n';
import { useApp } from '../../state';
import { sharedText, useChordPick } from '../../ui';

/** Eén bestemming: links het akkoord met de trap eronder, rechts de uitleg; in een smal vak staat de uitleg eronder.
 * De uitleg breekt alleen tussen de stukjes ("nieuwe noot C♯" blijft samen). */
function Target({ kind, chord, roman, why, to, strong }: { kind: 'dia' | 'bor' | 'piv'; chord: Chord; roman: string; why: string; to: Destination; strong?: boolean }) {
  const { dispatch, names } = useApp();
  const { handlers } = useChordPick();
  return (
    <button type="button" className={`tgt ${kind}${strong ? ' s0' : ''}`} {...handlers(() => dispatch({ type: 'go', to }))}>
      <span className="tl"><span className="tn">{names.chord(chord)}</span><span className="tr">{roman}</span></span><span className="tw">{why.split(' · ').map((part, i, all) => <span key={i}>{i > 0 && ' '}<span className="tp">{part}{i < all.length - 1 && '\u00a0·'}</span></span>)}</span>
    </button>
  );
}

export function NextSteps() {
  const { state, dispatch, t, names, scale, chords, scaleLabel } = useApp();
  const { handlers } = useChordPick();
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
                  <span key={c.key}>{i > 0 && ', '}<button type="button" className="linkbtn" {...handlers(() => dispatch({ type: 'select', degree: c.degree }))}>{names.chord(c)}</button></span>
                ))}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
