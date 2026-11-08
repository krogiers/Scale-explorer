import { bridge, CHAR_CHORD_DEGREE, chordsOf, pickPair, romanNumeral, route, scaleOf, type Chord, type ModeIndex, type Spot } from '../../core';
import { fill } from '../../i18n';
import { useApp } from '../../state';
import { PlayButton, showToast } from '../../ui';

/** Een akkoord met de ladder waar het bij hoort (voor het schema: elk akkoord is een trap van een modus). */
interface Step { chord: Chord; at: Spot }

/**
 * Sprongkaart: hoe kom je van "cur" naar "naar"? Eén noot verschil: brug, sprong en wat wegvalt.
 * Zelfde noten: alleen een nieuw thuis. Verder weg: de kortste route, stap voor stap.
 * Zonder "naar": het thuis en de kleur van waar je bent, en de bruggen naar de twee buurmodi.
 */
export function JumpCard({ cur, naar, onGo }: { cur: Spot; naar: Spot | null; onGo: () => void }) {
  const { state, dispatch, t, names, scaleLabel, playChords } = useApp();
  const size = state.size;
  const label = (s: Spot) => scaleLabel(scaleOf(s.root, s.mode));
  const here = chordsOf(scaleOf(cur.root, cur.mode), size);
  const chip = (c: Chord, cls: string, sub?: string) => (
    <button key={`${c.key}-${cls}`} type="button" className={`bchip ${cls}`} onClick={() => playChords([{ chord: c, beats: 2 }], 'chip')}>
      {names.chord(c)}{sub && <small>{sub}</small>}
    </button>
  );
  const roman = (s: Spot, c: Chord) => romanNumeral(scaleOf(s.root, s.mode), c);

  if (!naar) {
    const neighbours = [cur.mode - 1, cur.mode + 1].filter((m) => m >= 0 && m < 7).map((m) => ({ root: cur.root, mode: m as ModeIndex }));
    const ch = here[CHAR_CHORD_DEGREE[cur.mode]];
    return (
      <div className="jump">
        <h3>{label(cur)}</h3>
        <div className="bchips"><span className="lbl">{t.jHome}</span>{chip(here[0], 'ton', roman(cur, here[0]))}<span className="lbl">{t.jColour}</span>{chip(ch, 'nw', `${roman(cur, ch)} ★`)}</div>
        {neighbours.map((n) => {
          const br = bridge(cur, n, size);
          return (
            <div key={n.mode} className="bchips">
              <span className="lbl">{t.abbr[n.mode]}</span>
              <span className="small muted">{br.newNotes.map(names.note).join(' ')} · {t.jBridge}</span>
              {br.shared.map((c) => chip(c, 'sh'))}
            </div>
          );
        })}
        <p className="muted small">{t.jPick}</p>
      </div>
    );
  }

  const br = bridge(cur, naar, size);
  const n = br.newNotes.length;
  const diff = n === 0 ? t.jSameNotes : fill(n === 1 ? t.jDiff1 : t.jDiffN, { n, notes: br.newNotes.map(names.note).join(', ') });
  let body;
  let seq: Step[];
  if (br.kind === 'relative') {
    body = (
      <>
        <div className="bchips"><span className="lbl">{t.jNewHome}</span>{chip(br.tonic, 'ton', t.jTonic)}{chip(br.char, 'nw', `${t.jChar} ★`)}</div>
        <p className="muted small">{t.jSameChords}</p>
      </>
    );
    seq = [{ chord: here[0], at: cur }, { chord: br.char, at: naar }, { chord: br.tonic, at: naar }];
  } else if (n === 1) {
    body = (
      <>
        <div className="bchips"><span className="lbl">{t.jBridge}</span>{br.shared.map((c) => chip(c, 'sh', roman(naar, c)))}</div>
        <div className="bchips"><span className="lbl">{t.jJump}</span>{br.fresh.map((c) => chip(c, 'nw', roman(naar, c) + (c.key === br.char.key ? ' ★' : '')))}</div>
        <div className="bchips"><span className="lbl">{t.jGone}</span>{br.gone.map((c) => chip(c, 'gn'))}</div>
      </>
    );
    const p = pickPair(br);
    seq = [{ chord: here[0], at: cur }, ...(p.pivot ? [{ chord: p.pivot, at: naar }] : []), ...(p.signal ? [{ chord: p.signal, at: naar }] : []), { chord: br.tonic, at: naar }];
  } else {
    const steps = route(cur, naar, size);
    body = steps.map((s, i) => (
      <div key={i} className="bchips">
        <span className="lbl">{fill(t.jStep, { n: i + 1 })}</span>
        {s.pivot && s.signal
          ? <>{chip(s.pivot, 'sh', t.jBridge)}<span className="muted">→</span>{chip(s.signal, 'nw', t.jJump)}<span className="small muted">{label(s.to)}</span></>
          : <>{chip(s.bridge.tonic, 'ton', t.jHome)}<span className="small muted">{label(s.to)}, {t.jSameNotes}</span></>}
      </div>
    ));
    seq = [{ chord: here[0], at: cur }, ...steps.flatMap((s) => s.pivot && s.signal ? [{ chord: s.pivot, at: s.to }, { chord: s.signal, at: s.to }] : [{ chord: s.bridge.tonic, at: s.to }]), { chord: br.tonic, at: naar }];
  }
  // twee keer hetzelfde akkoord na elkaar heeft geen zin
  seq = seq.filter((s, i) => i === 0 || s.chord.key !== seq[i - 1].chord.key);
  const addToChart = () => {
    dispatch({ type: 'insertPath', replace: false, entries: seq.map((s) => ({ root: s.at.root, mode: s.at.mode, degree: s.chord.degree, beats: state.meter, size })) });
    showToast({ text: fill(t.jAdded, { scale: label(naar) }), action: { label: t.undo, run: () => dispatch({ type: 'undo' }) } });
  };
  return (
    <div className="jump">
      <h3>{label(cur)} → {label(naar)} <span className="muted small jkind">· {t.jKinds[br.kind]} · {diff}</span></h3>
      {body}
      <div className="acts">
        <PlayButton id="jump" label={seq.map((s) => names.chord(s.chord)).join(' → ')} className="ghost jplay"
          onPlay={() => playChords(seq.map((s) => ({ chord: s.chord, beats: 2 })), 'jump')} />
        <button type="button" className="ghost pri" onClick={onGo}>{fill(t.jGo, { scale: label(naar) })}</button>
        <button type="button" className="ghost" onClick={addToChart}>{t.jAdd}</button>
      </div>
    </div>
  );
}
