import type { ReactElement } from 'react';
import type { InstrumentView } from './index';

const W = 30, H = 120, BW = 18, BH = 74, OCTAVES = 2;
const WHITES = [0, 2, 4, 5, 7, 9, 11];
const BLACKS: [number, number][] = [[1, 0], [3, 1], [6, 3], [8, 4], [10, 5]];

export function Piano(v: InstrumentView) {
  const blue = v.blue && !v.scale.has(v.blue.pc) ? v.blue : null;
  const label = (pc: number) => {
    const n = v.scaleNotes.find((x) => x.pc === pc) ?? (blue && blue.pc === pc ? blue : null);
    return n ? v.names.note(n) : '';
  };
  const keys: ReactElement[] = [];
  for (let o = 0; o < OCTAVES; o++) {
    WHITES.forEach((pc, i) => {
      const x = (o * 7 + i) * W, inChord = v.chord.has(pc);
      keys.push(
        <g key={`w${o}-${pc}`}>
          <rect className={`k-w${inChord ? ' ch' : ''}`} x={x + 0.5} y={0.5} width={W - 1} height={H} rx={3} />
          {(v.scale.has(pc) || blue?.pc === pc) && <>
            <circle className={`k-dot${pc === v.characteristic ? ' char' : ''}${blue?.pc === pc ? ' blue' : ''}`} cx={x + W / 2} cy={H - 30} r={pc === v.root ? 6 : 4} />
            <text className={`k-lbl${inChord ? ' on-ch' : ''}`} x={x + W / 2} y={H - 10}>{label(pc)}</text>
          </>}
        </g>,
      );
    });
  }
  for (let o = 0; o < OCTAVES; o++) {
    BLACKS.forEach(([pc, wi]) => {
      const x = (o * 7 + wi + 1) * W - BW / 2, inChord = v.chord.has(pc);
      keys.push(
        <g key={`b${o}-${pc}`}>
          <rect className={`k-b${inChord ? ' ch' : ''}`} x={x} y={0.5} width={BW} height={BH} rx={2} />
          {(v.scale.has(pc) || blue?.pc === pc) && <>
            <circle className={`k-dot${pc === v.characteristic ? ' char' : ''}${blue?.pc === pc ? ' blue' : ''}`} cx={x + BW / 2} cy={BH - 26} r={pc === v.root ? 5 : 3.5} />
            <text className="k-lbl on-b" x={x + BW / 2} y={BH - 8} style={{ fontSize: 8 }}>{label(pc)}</text>
          </>}
        </g>,
      );
    });
  }
  return (
    <svg viewBox={`0 0 ${OCTAVES * 7 * W} ${H + 2}`} role="img" aria-label={v.label}>
      {keys}
    </svg>
  );
}
