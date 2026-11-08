import { CHAR_CHORD_DEGREE, chordsOf, chordsOnRoot, romanNumeral, scaleOf, type ModeIndex, type Spot } from '../../core';
import { useApp } from '../../state';
import { onKeyActivate } from '../../ui';

const LX = 96, CW = 46, TY = 34, RH = 22;

/**
 * Brugmatrix voor één grondtoon: kolommen = de zeven parallelle modi, rijen = alle akkoorden die erin voorkomen.
 * Een balk over 2 of 3 kolommen is een brug, over 1 kolom de eigen kleur van die modus; ★ = kenmerkend akkoord.
 * Met "van" en "naar" krijgt elk akkoord een label (brug, nieuw, valt weg). all = ook de akkoorden buiten van en naar.
 */
export function BridgeMatrix({ root, from, to, all, onPick }: {
  root: number; from: ModeIndex; to: ModeIndex | null; all: boolean; onPick: (s: Spot) => void;
}) {
  const { state, t, names, playChords } = useApp();
  const size = state.size;
  const keys = (m: ModeIndex) => new Set(chordsOf(scaleOf(root, m), size).map((c) => c.key));
  const inV = keys(from);
  const inN = to === null ? null : keys(to);
  const rows = chordsOnRoot(root, size).filter((r) => all || inV.has(r.chord.key) || inN?.has(r.chord.key));
  const charKey = (m: number) => chordsOf(scaleOf(root, m as ModeIndex), size)[CHAR_CHORD_DEGREE[m]].key;
  const TX = LX + 7 * CW + 8, H = TY + rows.length * RH + 6;
  return (
    <svg className="mx" viewBox={`0 0 ${TX + 70} ${H}`} role="group" aria-label={t.mxTitle.replace('{root}', '')}>
      {Array.from({ length: 7 }, (_, m) => {
        const x = LX + m * CW;
        const s: Spot = { root, mode: m as ModeIndex };
        return (
          <g key={m} className={`mcol${m === from ? ' cur' : m === to ? ' naar' : ''}`} role="button" tabIndex={0} aria-label={t.modes[m]}
            onClick={() => onPick(s)} onKeyDown={onKeyActivate(() => onPick(s))}>
            <rect x={x} y={0} width={CW} height={H} rx={6} />
            <rect x={x + 8} y={4} width={CW - 16} height={8} rx={3} style={{ fill: `var(--m${m})`, stroke: 'var(--line)' }} />
            <text className="hd" x={x + CW / 2} y={27}>{t.abbr[m]}</text>
          </g>
        );
      })}
      {rows.map(({ chord, modes }, i) => {
        const y = TY + i * RH;
        const a = modes[0], b = modes[modes.length - 1];
        const iv = inV.has(chord.key), inn = !!inN?.has(chord.key);
        const tag = !inN ? null : iv && inn ? ['br', t.tagBridge] : inn ? ['nw', t.tagNew] : iv ? ['gn', t.tagGone] : null;
        return (
          <g key={chord.key} className={`mrow${!iv && !inn ? ' dim' : ''}${iv && inn ? ' bridge' : ''}`}>
            <text className="nm" x={6} y={y + 15} role="button" tabIndex={0}
              onClick={() => playChords([{ chord, beats: 2 }], 'mx')} onKeyDown={onKeyActivate(() => playChords([{ chord, beats: 2 }], 'mx'))}>{names.chord(chord)}</text>
            <text className="rn" x={LX - 8} y={y + 15} textAnchor="end">{romanNumeral(scaleOf(root, a), chord)}</text>
            <rect className={`bar bar${b - a + 1}`} x={LX + a * CW + 4} y={y + 3} width={(b - a + 1) * CW - 8} height={RH - 6} rx={(RH - 6) / 2} />
            {modes.map((m) => charKey(m) === chord.key
              ? <text key={m} className="star" x={LX + m * CW + CW / 2} y={y + 15}>★</text>
              : (m === from || m === to) ? <circle key={m} className="dot" cx={LX + m * CW + CW / 2} cy={y + RH / 2} r={3} /> : null)}
            {tag && <text className={`tag ${tag[0]}`} x={TX} y={y + 15}>{tag[1]}</text>}
          </g>
        );
      })}
    </svg>
  );
}
