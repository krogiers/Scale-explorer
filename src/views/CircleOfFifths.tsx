import { fifthsIndex, pcFromFifths, scaleOf, type ModeIndex } from '../core/theory';
import { useApp } from '../state/store';
import { onKeyActivate, signatureLabel } from './util';

const polar = (r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
};
function sector(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = polar(r2, a1), [x2, y2] = polar(r2, a2), [x3, y3] = polar(r1, a2), [x4, y4] = polar(r1, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4}Z`;
}

/** Kwintencirkel met de zeven gebruikte noten als boog. Langs de boog liggen de modi in volgorde van helder naar donker. */
export function CircleOfFifths() {
  const { state, dispatch, t, names, scale, chords } = useApp();
  const start = fifthsIndex(scale.root) - scale.mode;

  const slots = Array.from({ length: 7 }, (_, j) => {
    const f = start + j, pc = pcFromFifths(f), ang = f * 30;
    const chord = chords.find((c) => c.root.pc === pc);
    const selected = chord?.degree === state.degree;
    const [x, y] = polar(125, ang), [mx, my] = polar(80, ang);
    const note = scale.notes.find((n) => n.pc === pc)!;
    return (
      <g key={j}>
        {selected && <circle className="slot-ring" cx={x} cy={y} r={21} />}
        <text className={`slot-chord${selected ? ' sel' : ''}`} x={x} y={y + 4} textAnchor="middle">{chord ? names.chord(chord) : ''}</text>
        <g className={`c-mode${j === scale.mode ? ' cur' : ''}`} tabIndex={0} role="button"
          aria-label={`${names.note(note)} ${t.modes[j]}`}
          onClick={() => dispatch({ type: 'relative', root: pc, mode: j as ModeIndex })}
          onKeyDown={onKeyActivate(() => dispatch({ type: 'relative', root: pc, mode: j as ModeIndex }))}>
          <rect x={mx - 18} y={my - 11} width={36} height={22} rx={4} />
          <text x={mx} y={my + 4} textAnchor="middle">{t.abbr[j]}</text>
        </g>
      </g>
    );
  });

  const outer = Array.from({ length: 12 }, (_, k) => {
    const pc = pcFromFifths(k), [x, y] = polar(170, k * 30);
    const inScale = scale.pcs.has(pc), isRoot = pc === scale.root;
    const label = inScale
      ? names.note(scale.notes.find((n) => n.pc === pc)!)
      : pc === 6
        ? `${names.note({ pc: 6, letter: 3, acc: 1 })}/${names.note({ pc: 6, letter: 4, acc: -1 })}`
        : names.note(scaleOf(pc, 1).notes[0]);
    const long = label.length > 4;
    return (
      <g key={k} className={`c-note${inScale ? ' in' : ''}${isRoot ? ' root' : ''}`} tabIndex={0} role="button"
        aria-label={`${label} ${t.modes[scale.mode]}`}
        onClick={() => dispatch({ type: 'setRoot', root: pc })}
        onKeyDown={onKeyActivate(() => dispatch({ type: 'setRoot', root: pc }))}>
        <circle cx={x} cy={y} r={long ? 22 : 19} />
        <text x={x} y={y + 4.5} textAnchor="middle" style={{ fontSize: long ? 10 : 13 }}>{label}</text>
      </g>
    );
  });

  return (
    <svg viewBox="-200 -200 400 400" role="img" aria-label={t.circleTitle}>
      <circle r={185} fill="none" stroke="var(--line)" />
      <circle r={100} fill="none" stroke="var(--line)" strokeDasharray="2 4" />
      <path className="arc" d={sector(100, 150, (start - 0.5) * 30, (start + 6.5) * 30)} />
      {slots}
      {outer}
      <text className="c-center-root" x={0} y={6} textAnchor="middle">{names.note(scale.notes[0])}</text>
      <text className="c-center-mode" x={0} y={28} textAnchor="middle">{t.modes[scale.mode]}</text>
      <text className="c-center-sig" x={0} y={46} textAnchor="middle">{signatureLabel(scale, t)}</text>
    </svg>
  );
}
