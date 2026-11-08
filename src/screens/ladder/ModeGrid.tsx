import { diffCount, fifthsIndex, mod12, pcFromFifths, rootAt, sameSpot, scaleOf, type ModeIndex, type Spot } from '../../core';
import { useApp } from '../../state';
import { onKeyActivate, signatureShort } from '../../ui';

const CW = 46, CH = 32, LX = 80, TY = 30;

/**
 * Rooster van alle 84 modi: rijen = moederladders in kwintvolgorde (♯ boven, ♭ onder), kolommen = modi van helder naar donker.
 * Een rij heeft dezelfde noten, een diagonaal dezelfde grondtoon; het cijfer is het aantal noten verschil met "cur".
 */
export function ModeGrid({ cur, naar, onPick }: { cur: Spot; naar: Spot | null; onPick: (s: Spot) => void }) {
  const { t, names, scaleLabel } = useApp();
  // de majeurladder van de huidige grondtoon in het midden, drie kwinten erboven
  const k0 = fifthsIndex(cur.root);
  const rows = Array.from({ length: 12 }, (_, i) => mod12(k0 + 3 - i));
  return (
    <svg className="mgrid" viewBox={`0 0 ${LX + 7 * CW + 2} ${TY + 12 * CH + 4}`} role="group" aria-label={t.modesTitle}>
      {t.abbr.map((a, m) => (
        <g key={m}>
          <rect x={LX + m * CW + 8} y={2} width={CW - 16} height={8} rx={3} style={{ fill: `var(--m${m})`, stroke: 'var(--line)' }} />
          <text className="hd" x={LX + m * CW + CW / 2} y={24}>{a}</text>
        </g>
      ))}
      {rows.map((k, i) => {
        const y = TY + i * CH;
        const parent = scaleOf(pcFromFifths(k), 1);
        return (
          <g key={k}>
            <text className="rl" x={LX - 30} y={y + 20}>{names.note(parent.notes[0])}</text>
            <text className="rl sig" x={LX - 6} y={y + 20}>{signatureShort(parent)}</text>
            {Array.from({ length: 7 }, (_, m) => {
              const s: Spot = { root: rootAt(k, m as ModeIndex), mode: m as ModeIndex };
              const d = diffCount(cur, s);
              const here = sameSpot(s, cur);
              const cls = ['mcell', here ? 'cur' : d === 0 ? 'row' : d === 1 ? 'one' : '', s.root === cur.root && !here ? 'par' : '', sameSpot(s, naar) ? 'naar' : '', d > 2 ? 'far' : ''].filter(Boolean).join(' ');
              const x = LX + m * CW;
              const label = scaleLabel(scaleOf(s.root, s.mode));
              return (
                <g key={m} className={cls} role="button" tabIndex={0} aria-label={label} aria-pressed={sameSpot(s, naar)}
                  onClick={() => onPick(s)} onKeyDown={onKeyActivate(() => onPick(s))}>
                  <title>{label}</title>
                  <rect x={x + 2} y={y + 2} width={CW - 4} height={CH - 4} rx={6} />
                  <text x={x + CW / 2} y={y + 21}>{names.note(scaleOf(s.root, s.mode).notes[0])}</text>
                  {d > 0 && <text className="d" x={x + CW - 6} y={y + 12}>{d}</text>}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
