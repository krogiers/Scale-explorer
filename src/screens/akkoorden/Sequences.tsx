import { fifthsIndex, numeralAt, realize, SEQUENCES, type SeqStep } from '../../core';
import { fill } from '../../i18n';
import { useApp } from '../../state';

/** Kleine kwintencirkel: de weg van de grondtonen, met pijlen; de tonica staat gemarkeerd. */
function RootPath({ id, steps, tonic }: { id: string; steps: SeqStep[]; tonic: number }) {
  const R = 38, C = 48;
  const at = (pc: number): [number, number] => {
    const a = (fifthsIndex(pc) / 12) * 2 * Math.PI - Math.PI / 2;
    return [C + R * Math.cos(a), C + R * Math.sin(a)];
  };
  // dezelfde grondtoon twee keer na elkaar (bv. I en I7) is geen beweging
  const roots = steps.map((s) => s.root).filter((r, i, a) => i === 0 || r !== a[i - 1]);
  return (
    <svg className="seq-map" viewBox="0 0 96 96" aria-hidden="true">
      <defs>
        <marker id={`seq-arrow-${id}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8z" className="seq-head" /></marker>
      </defs>
      <circle cx={C} cy={C} r={R} className="seq-ring" />
      {Array.from({ length: 12 }, (_, pc) => {
        const [x, y] = at(pc);
        return <circle key={pc} cx={x} cy={y} r={pc === tonic ? 4.5 : 2} className={pc === tonic ? 'seq-tonic' : 'seq-dot'} />;
      })}
      {roots.slice(1).map((r, i) => {
        const [x1, y1] = at(roots[i]);
        const [x2, y2] = at(r);
        // pijl iets inkorten zodat de punt niet onder de stip verdwijnt
        const d = Math.hypot(x2 - x1, y2 - y1) || 1;
        return <line key={i} x1={x1} y1={y1} x2={x2 - ((x2 - x1) / d) * 5} y2={y2 - ((y2 - y1) / d) * 5} className="seq-step" markerEnd={`url(#seq-arrow-${id})`} />;
      })}
    </svg>
  );
}

/** Typische jazzsequenties in de huidige toonsoort: invoegen in het schema of het schema ermee vervangen. */
export function Sequences() {
  const { state, dispatch, t, names, scale, playChords } = useApp();
  const tonic = state.root;
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h2>{t.seqTitle}</h2>
        <p className="muted small">{fill(t.seqHelp, { tonic: names.note(scale.notes[0]) })}</p>
      </div>
      <div className="seqs">
        {SEQUENCES.map((seq) => {
          const steps = realize(seq, tonic, state.meter);
          const entries = steps.map(({ root, mode, beats }) => ({ root, mode, degree: 0, beats, size: 4 as const }));
          const txt = t.seqs[seq.id];
          return (
            <article key={seq.id} className="seq">
              <div className="seq-top">
                <RootPath id={seq.id} steps={steps} tonic={tonic} />
                <div className="stack" style={{ gap: 2 }}>
                  <h3>{txt.name}</h3>
                  <p className="muted small">{txt.desc}</p>
                </div>
              </div>
              <div className="seq-chords">
                {steps.map((s, i) => (
                  <span key={i} className="seq-ch" title={`${names.note(s.chord.root)} ${t.modes[s.mode]}`}>
                    <b>{names.chord(s.chord)}{s.approx && <sup>*</sup>}</b>
                    <small>{numeralAt(s.iv, s.chord.quality)} · {t.modes[s.mode]}</small>
                  </span>
                ))}
              </div>
              <div className="row seq-actions">
                <button type="button" onClick={() => playChords(steps.map((s) => ({ chord: s.chord, beats: s.beats })))}>▶ {t.seqPlay}</button>
                <button type="button" onClick={() => dispatch({ type: 'insertPath', entries, replace: false })}>＋ {t.seqInsert}</button>
                <button type="button" onClick={() => dispatch({ type: 'insertPath', entries, replace: true })}>{t.seqReplace}</button>
              </div>
            </article>
          );
        })}
      </div>
      <p className="muted small">* {t.seqApprox}</p>
    </>
  );
}
