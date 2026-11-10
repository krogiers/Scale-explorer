import type { InstrumentView } from './types';

/** Gitaarhals in standaardstemming, frets 0 tot 12. Bovenste lijn = hoge E, zoals in een tabulatuur. */
const STRINGS = [4, 11, 7, 2, 9, 4]; // e B G D A E (toonklassen)
const FRETS = 12, FW = 50, SH = 22, LEFT = 34, TOP = 16;
const MARKERS = [3, 5, 7, 9];

export function Guitar(v: InstrumentView) {
  const width = LEFT + FRETS * FW + 10, height = TOP + 5 * SH + 30;
  const blue = v.blue && !v.scale.has(v.blue.pc) ? v.blue : null;
  const gone = (pc: number) => v.dropped?.find((x) => x.pc === pc && !v.scale.has(pc));
  const label = (pc: number) => {
    const n = v.scaleNotes.find((x) => x.pc === pc) ?? (blue && blue.pc === pc ? blue : null) ?? gone(pc);
    return n ? v.names.note(n) : '';
  };
  const fretX = (f: number) => LEFT + f * FW;
  const dotX = (f: number) => (f === 0 ? LEFT - 16 : fretX(f) - FW / 2);
  return (
    <div className="hscroll">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={v.label}>
      {MARKERS.map((f) => <circle key={f} className="gt-mark" cx={fretX(f) - FW / 2} cy={TOP + 2.5 * SH} r={5} />)}
      <circle className="gt-mark" cx={fretX(12) - FW / 2} cy={TOP + 1.5 * SH} r={5} />
      <circle className="gt-mark" cx={fretX(12) - FW / 2} cy={TOP + 3.5 * SH} r={5} />
      {Array.from({ length: FRETS + 1 }, (_, f) => (
        <line key={f} className={f === 0 ? 'gt-nut' : 'gt-fret'} x1={fretX(f)} x2={fretX(f)} y1={TOP} y2={TOP + 5 * SH} />
      ))}
      {STRINGS.map((_, s) => <line key={s} className="gt-str" x1={LEFT} x2={fretX(FRETS)} y1={TOP + s * SH} y2={TOP + s * SH} style={{ strokeWidth: 0.8 + s * 0.3 }} />)}
      {STRINGS.flatMap((open, s) =>
        Array.from({ length: FRETS + 1 }, (_, f) => {
          const pc = (open + f) % 12;
          const isBlue = blue?.pc === pc;
          const isGone = !!gone(pc);
          if (!v.scale.has(pc) && !isBlue && !isGone) return null;
          const inChord = v.chord.has(pc), isRoot = pc === v.root, out = v.outside.has(pc) && !inChord;
          const cls = isGone ? 'gt-dot gone' : isBlue ? 'gt-dot blue' : inChord ? 'gt-dot ch' : out ? 'gt-dot out' : pc === v.characteristic ? 'gt-dot char' : 'gt-dot';
          return (
            <g key={`${s}-${f}`}>
              <circle className={cls} cx={dotX(f)} cy={TOP + s * SH} r={isRoot ? 10 : 8.5} />
              {isRoot && <circle className="gt-root" cx={dotX(f)} cy={TOP + s * SH} r={10} />}
              {v.bridge?.has(pc) && <circle className="gt-br" cx={dotX(f)} cy={TOP + s * SH} r={isRoot ? 12.5 : 11} />}
              <text className={`gt-lbl${isGone ? ' gone' : out ? ' out' : inChord || isBlue || pc === v.characteristic ? ' on' : ''}`} x={dotX(f)} y={TOP + s * SH + 3}>{label(pc)}</text>
            </g>
          );
        }),
      )}
      {[3, 5, 7, 9, 12].map((f) => <text key={f} className="gt-num" x={fretX(f) - FW / 2} y={height - 6}>{f}</text>)}
    </svg>
    </div>
  );
}
