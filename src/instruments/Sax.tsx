import type { InstrumentView } from './index';

/**
 * Saxofoon: een greepschema per noot van de toonladder (plus het octaaf).
 * Grepen volgen de nootnamen zoals je ze op de sax leest; het register loopt van D4 tot C#6,
 * het bereik waarin de grepen het eenvoudigst zijn (octaafklep voor D5 en hoger).
 */
type Key = 1 | 2 | 3 | 4 | 5 | 6 | 'bis' | 'gis' | 'es';
const FINGERING: Record<number, Key[]> = {
  2: [1, 2, 3, 4, 5, 6],          // D
  3: [1, 2, 3, 4, 5, 6, 'es'],    // D♯/E♭
  4: [1, 2, 3, 4, 5],             // E
  5: [1, 2, 3, 4],                // F
  6: [1, 2, 3, 5],                // F♯/G♭
  7: [1, 2, 3],                   // G
  8: [1, 2, 3, 'gis'],            // G♯/A♭
  9: [1, 2],                      // A
  10: [1, 'bis'],                 // A♯/B♭
  11: [1],                        // B
  0: [2],                         // C
  1: [],                          // C♯/D♭
};

const CW = 58, CH = 182;

function Diagram({ x, pressed, octave, label, inChord, isRoot, isChar, out }: {
  x: number; pressed: Key[]; octave: boolean; label: string; inChord: boolean; isRoot: boolean; isChar: boolean; out: boolean;
}) {
  const on = (k: Key) => (pressed.includes(k) ? ' on' : '');
  const hole = (k: 1 | 2 | 3 | 4 | 5 | 6, y: number) => <circle key={k} className={`sx-key${on(k)}`} cx={x + 29} cy={y} r={8} />;
  return (
    <g className={`sx-card${inChord ? ' ch' : ''}${isChar ? ' char' : ''}${out ? ' out' : ''}`}>
      <rect className="sx-bg" x={x + 2} y={2} width={CW - 4} height={CH - 4} rx={8} />
      <ellipse className={`sx-key${octave ? ' on' : ''}`} cx={x + 12} cy={20} rx={5} ry={7} />
      <text className="sx-tiny" x={x + 12} y={36}>8va</text>
      {hole(1, 32)}
      <circle className={`sx-key${on('bis')}`} cx={x + 29} cy={43} r={2.6} />
      {hole(2, 54)}
      {hole(3, 76)}
      <rect className={`sx-key${on('gis')}`} x={x + 41} y={73} width={10} height={7} rx={2} />
      <line className="sx-div" x1={x + 14} x2={x + 44} y1={92} y2={92} />
      {hole(4, 106)}
      {hole(5, 128)}
      {hole(6, 150)}
      <rect className={`sx-key${on('es')}`} x={x + 41} y={152} width={10} height={7} rx={2} />
      <text className={`sx-lbl${isRoot ? ' root' : ''}`} x={x + CW / 2} y={CH + 14}>{label}</text>
    </g>
  );
}

export function Sax(v: InstrumentView) {
  // oplopende toonladder vanaf de grondtoon, met de grondtoon tussen D4 (62) en C#5 (73)
  let prev = 62 + ((v.root - 2 + 12) % 12) - 1;
  const notes = [...v.scaleNotes, v.scaleNotes[0]].map((n) => {
    let m = 60 + n.pc;
    while (m <= prev) m += 12;
    while (m > prev + 12) m -= 12;
    prev = m;
    return { n, midi: m };
  });
  return (
    <svg viewBox={`0 0 ${notes.length * CW} ${CH + 22}`} role="img" aria-label={v.label}>
      {notes.map(({ n, midi }, i) => {
        const octave = midi >= 74;
        const pressed = FINGERING[(midi - (octave ? 12 : 0)) % 12];
        return (
          <Diagram key={i} x={i * CW} pressed={pressed} octave={octave} label={v.names.note(n)}
            inChord={v.chord.has(n.pc)} isRoot={n.pc === v.root} isChar={n.pc === v.characteristic} out={v.outside.has(n.pc)} />
        );
      })}
    </svg>
  );
}
