import { fifthsIndex, mod12, romanNumeral, type Chord, computeTargets, type Destination } from '../../core';
import { useApp } from '../../state';
import { onKeyActivate, useChordPick } from '../../ui';

type Pt = [number, number];
const polar = (r: number, deg: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
};
const NR = 24;
/** Lange namen (bv. Do♯m7♭5) kleiner zetten zodat ze binnen het bolletje passen. */
const fontFor = (label: string) => (label.length > 7 ? 9.5 : label.length > 5 ? 11.5 : 15);
const EDGE_WIDTH = [4, 2.4, 1.8, 1.1];

/** Buitenste akkoorden in een kolom, met het midden vrij zodat geen pijl door een binnenakkoord loopt. */
function column(n: number, x: number): Pt[] {
  const top = Math.ceil(n / 2), bottom = n - top, ys: number[] = [];
  for (let i = 0; i < top; i++) ys.push(-65 - 54 * (top - 1 - i));
  for (let i = 0; i < bottom; i++) ys.push(65 + 54 * i);
  return ys.map((y) => [x, y]);
}

function Edge({ from, to, kind, width }: { from: Pt; to: Pt; kind: 'dia' | 'bor' | 'piv'; width: number }) {
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  return (
    <line className={`n-e ${kind}`} x1={from[0] + ux * NR} y1={from[1] + uy * NR} x2={to[0] - ux * (NR + 3)} y2={to[1] - uy * (NR + 3)}
      style={{ strokeWidth: width }} markerEnd={`url(#ar-${kind})`} />
  );
}

export function ChordNetwork() {
  const { state, dispatch, t, names, scale, chords } = useApp();
  const { handlers } = useChordPick();
  const tg = computeTargets(scale, state.size, state.degree, 6);
  const pivots = tg.pivots.flatMap((p) => p.targets.map((x) => ({ ...x, scale: p.scale }))).slice(0, 6);

  // het gekozen akkoord in het midden, de andere zes in kwintvolgorde eromheen
  const sf = fifthsIndex(chords[state.degree].root.pc);
  const others = chords.filter((c) => c.degree !== state.degree)
    .sort((a, b) => mod12(fifthsIndex(a.root.pc) - sf) - mod12(fifthsIndex(b.root.pc) - sf));
  const pos = new Map<number, Pt>([[state.degree, [0, 0]]]);
  others.forEach((c, j) => pos.set(c.degree, polar(125, 30 + j * 60)));
  const borPos = column(tg.borrowed.length, -250), pivPos = column(pivots.length, 250);
  const center: Pt = [0, 0];

  const node = (p: Pt, kind: string, c: Chord, sub: string, onActivate: () => void, key: string) => (
    <g key={key} className={`n-node ${kind}`} tabIndex={0} role="button" aria-label={`${names.chord(c)} ${sub}`}
      {...handlers(onActivate)} onKeyDown={onKeyActivate(onActivate)}>
      <circle cx={p[0]} cy={p[1]} r={NR} />
      <text className="nn" x={p[0]} y={p[1] + 3} style={{ fontSize: fontFor(names.chord(c)) }}>{names.chord(c)}</text>
      <text className="ns" x={p[0]} y={p[1] + 14}>{sub}</text>
    </g>
  );
  const go = (to: Destination) => () => dispatch({ type: 'go', to });

  return (
    <svg viewBox="-300 -225 600 450" role="img" aria-label={t.netTitle}>
      <defs>
        {(['dia', 'bor', 'piv'] as const).map((k) => (
          <marker key={k} id={`ar-${k}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" style={{ fill: `var(--${k === 'piv' ? 'brass' : k})` }} />
          </marker>
        ))}
      </defs>
      <circle className="n-ring" r={125} />
      {tg.diatonic.map((x) => <Edge key={x.chord.key} from={center} to={pos.get(x.chord.degree)!} kind="dia" width={EDGE_WIDTH[x.strength]} />)}
      {tg.borrowed.map((x, i) => <Edge key={x.chord.key} from={center} to={borPos[i]} kind="bor" width={1.4} />)}
      {pivots.map((x, i) => <Edge key={x.chord.key + x.scale.root} from={center} to={pivPos[i]} kind="piv" width={1.4} />)}
      {chords.map((c) => node(pos.get(c.degree)!, c.degree === state.degree ? 'self' : 'dia', c, romanNumeral(scale, c),
        () => dispatch({ type: 'select', degree: c.degree }), 'd' + c.degree))}
      {tg.borrowed.map((x, i) => node(borPos[i], 'bor', x.chord, t.abbr[x.source.mode], go(x.to), 'b' + x.chord.key))}
      {pivots.map((x, i) => node(pivPos[i], 'piv', x.chord, `${names.note(x.scale.notes[0])} ${t.abbr[x.scale.mode]}`, go(x.to), 'p' + x.chord.key + x.scale.root))}
      {tg.borrowed.length > 0 && <text className="n-lbl" x={-250} y={-200} textAnchor="middle">{t.netBorrowed}</text>}
      {pivots.length > 0 && <text className="n-lbl" x={250} y={-200} textAnchor="middle">{t.netPivot}</text>}
    </svg>
  );
}
