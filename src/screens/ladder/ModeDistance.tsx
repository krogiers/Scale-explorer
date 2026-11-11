import { useState } from 'react';
import { bridge, diffCount, mod12, parentOf, rootAt, sameSpot, scaleOf, type ModeIndex, type Spot } from '../../core';
import { fill } from '../../i18n';
import { useApp } from '../../state';
import { Heading, signatureShort } from '../../ui';

type View = 'root' | 'keys';
/** Het grootste verschil tussen twee kerkmodi: twee ladders een tritonus uit elkaar delen nog twee noten. */
const MAX = 5;

/**
 * Hoe ver liggen modi uit elkaar? Een tabel met in elk vak het aantal noten verschil tussen de modus van de rij en die
 * van de kolom: donker = dichtbij, licht = ver. "Op één grondtoon": de zeven modi op de grondtoon waar je nu bent,
 * van helder naar donker (buren verschillen één noot). "Alle toonaarden": de twaalf moederladders in kwintvolgorde,
 * met de jouwe in het midden. Een klik op een vak brengt je naar de modus van de kolom.
 */
export function ModeDistance() {
  const { state, dispatch, t, names, scaleLabel } = useApp();
  const [view, setView] = useState<View>('root');
  const cur: Spot = { root: state.root, mode: state.mode };
  const k0 = parentOf(cur);
  // de rijen en kolommen: modi op deze grondtoon, of de majeurladders met de huidige moederladder in het midden
  const spots: Spot[] = view === 'root'
    ? Array.from({ length: 7 }, (_, m) => ({ root: state.root, mode: m as ModeIndex }))
    : Array.from({ length: 12 }, (_, i) => ({ root: rootAt(mod12(k0 + 5 - i), 1 as ModeIndex), mode: 1 as ModeIndex }));
  const isCur = (s: Spot) => (view === 'root' ? sameSpot(s, cur) : parentOf(s) === k0);
  const head = (s: Spot) => {
    const sc = scaleOf(s.root, s.mode);
    return view === 'root'
      ? <>{names.note(sc.notes[0])} <span className="muted">{t.abbr[s.mode]}</span></>
      : <>{names.note(sc.notes[0])} <span className="muted">{signatureShort(names.signature(sc))}</span></>;
  };

  return (
    <div className="dist">
      <Heading title={t.dsTitle} help={t.dsHelp}>
        <div className="seg" role="group" aria-label={t.dsTitle}>
          <button type="button" aria-pressed={view === 'root'} onClick={() => setView('root')}>{fill(t.dsOnRoot, { root: names.note(scaleOf(state.root, state.mode).notes[0]) })}</button>
          <button type="button" aria-pressed={view === 'keys'} onClick={() => setView('keys')}>{t.dsAllKeys}</button>
        </div>
      </Heading>
      <div className="dist-wrap">
        <table className={`dist-t ${view}`}>
          <thead>
            <tr><th aria-hidden="true" />{spots.map((s, j) => <th key={j} scope="col" className={isCur(s) ? 'cur' : undefined}>{head(s)}</th>)}</tr>
          </thead>
          <tbody>
            {spots.map((a, i) => (
              <tr key={i}>
                <th scope="row" className={isCur(a) ? 'cur' : undefined}>{head(a)}</th>
                {spots.map((b, j) => {
                  const d = diffCount(a, b);
                  const la = scaleLabel(scaleOf(a.root, a.mode)), lb = scaleLabel(scaleOf(b.root, b.mode));
                  const tip = d === 0 ? fill(t.dsSame, { a: la, b: lb }) : fill(t.dsDiff, { a: la, b: lb, n: d, notes: bridge(a, b, state.size).newNotes.map(names.note).join(' ') });
                  return (
                    <td key={j} className={`${d <= 2 ? 'near' : ''}${isCur(a) || isCur(b) ? ' line' : ''}`}
                      style={{ background: `color-mix(in srgb, var(--dia) ${Math.round(((MAX - d) / MAX) * 88)}%, var(--surface))` }}>
                      <button type="button" title={tip} aria-label={tip} onClick={() => dispatch({ type: 'setScale', root: b.root, mode: b.mode })}>{d}</button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="dist-scale" aria-hidden="true">
        <span>{t.dsNear}</span>
        {Array.from({ length: MAX + 1 }, (_, d) => <i key={d} style={{ background: `color-mix(in srgb, var(--dia) ${Math.round(((MAX - d) / MAX) * 88)}%, var(--surface))` }}>{d}</i>)}
        <span>{t.dsFar}</span>
      </div>
    </div>
  );
}
