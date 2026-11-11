import { useEffect, useState } from 'react';
import { fifthsIndex, numeralAt, realize, SEQ_STYLES, SEQUENCES, type Sequence, type SeqStep, type SeqStyle } from '../../core';
import { fill } from '../../i18n';
import { useApp, type PathEntry } from '../../state';
import { PlayButton, showToast } from '../../ui';

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

type Filter = SeqStyle | 'all';
const FILTER_KEY = 'tln-seq-style';
const loadFilter = (): Filter => {
  try { const v = localStorage.getItem(FILTER_KEY); return (SEQ_STYLES as readonly string[]).includes(v ?? '') ? (v as SeqStyle) : 'all'; } catch { return 'all'; }
};

/**
 * Typische progressies in de huidige toonsoort, per stijl (klassiek, jazz, pop en rock, blues, modaal en Spaans).
 * Bovenaan kies je één stijl of alle (onthouden in de browser). Compact: één rij per progressie met de trapnummers, een label (cadens, turnaround, reeks of vorm), ▶ en ＋.
 * Uitklappen toont de uitleg, de akkoorden met hun modus en "Vervang schema".
 * De titel en de uitleg komen van het blok "volgende stap" waarin dit staat.
 */
export function Sequences() {
  const { state, dispatch, t, names, playChords } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(loadFilter);
  useEffect(() => { try { localStorage.setItem(FILTER_KEY, filter); } catch { /* niet erg */ } }, [filter]);
  const tonic = state.root;
  // invoegen of vervangen: één stap, met een melding om het meteen ongedaan te maken
  const insert = (entries: PathEntry[], replace: boolean, name: string) => {
    dispatch({ type: 'insertPath', entries, replace });
    showToast({ text: fill(t.toastInserted, { name }), action: { label: t.undo, run: () => dispatch({ type: 'undo' }) } });
  };
  const row = (seq: Sequence) => {
    const steps = realize(seq, tonic, state.meter);
    const entries = steps.map(({ root, mode, beats }) => ({ root, mode, degree: 0, beats, size: seq.size }));
    const txt = t.seqs[seq.id];
    const isOpen = open === seq.id;
    const numerals = steps.map((s) => numeralAt(s.iv, s.chord.quality)).join(' – ');
    return (
      <li key={seq.id} className={`seq${isOpen ? ' open' : ''}`}>
        <div className="seq-row">
          <RootPath id={seq.id} steps={steps} tonic={tonic} />
          <button type="button" className="seq-name" aria-expanded={isOpen} aria-controls={`seq-${seq.id}`} onClick={() => setOpen(isOpen ? null : seq.id)}>
            <b>{txt.name}</b>
            <span className="seq-num"><span className={`seq-kind ${seq.kind}`}>{t.seqKinds[seq.kind]}</span> {numerals}</span>
          </button>
          <PlayButton id={`seq:${seq.id}`} label={`${t.seqPlay}: ${txt.name}`} compact className="ghost seq-btn"
            onPlay={() => playChords(steps.map((s) => ({ chord: s.chord, beats: s.beats })), `seq:${seq.id}`)} />
          <button type="button" className="ghost seq-btn" aria-label={`${t.seqInsert}: ${txt.name}`} title={t.seqInsert}
            onClick={() => insert(entries, false, txt.name)}>＋</button>
        </div>
        {isOpen && (
          <div className="seq-more" id={`seq-${seq.id}`}>
            <p className="muted small">{txt.desc}</p>
            <div className="seq-chords">
              {steps.map((s, i) => (
                <span key={i} className="seq-ch" title={`${names.note(s.chord.root)} ${t.modes[s.mode]}`}>
                  <b>{names.chord(s.chord)}{s.approx && <sup>*</sup>}</b>
                  <small>{numeralAt(s.iv, s.chord.quality)} · {t.modes[s.mode]}</small>
                </span>
              ))}
            </div>
            <div className="row seq-actions">
              <button type="button" className="ghost" onClick={() => insert(entries, false, txt.name)}>＋ {t.seqInsert}</button>
              <button type="button" className="ghost" onClick={() => insert(entries, true, txt.name)}>{t.seqReplace}</button>
            </div>
          </div>
        )}
      </li>
    );
  };
  return (
    <>
      <div className="seg seq-filter" role="group" aria-label={t.seqFilter}>
        {(['all', ...SEQ_STYLES] as Filter[]).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? t.seqAll : t.seqStyles[f]}</button>
        ))}
      </div>
      {SEQ_STYLES.filter((s) => filter === 'all' || filter === s).map((style) => (
        <section key={style} className="seq-group" aria-labelledby={`seq-style-${style}`}>
          <h4 id={`seq-style-${style}`} className="seq-style">{t.seqStyles[style]} <span className="muted small">{t.seqStyleSub[style]}</span></h4>
          <ul className="seqs">{SEQUENCES.filter((s) => s.style === style).map(row)}</ul>
        </section>
      ))}
      <p className="muted small">* {t.seqApprox}</p>
    </>
  );
}
