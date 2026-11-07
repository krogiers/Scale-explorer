import type { InstrumentView } from '../types';
import { Hole, Lever, WindCards } from './wind';

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

export function Sax(v: InstrumentView) {
  // grondtoon tussen D4 (62) en C#5 (73)
  return (
    <WindCards v={v} low={62} h={182} draw={({ midi }, x) => {
      const octave = midi >= 74;
      const pressed = FINGERING[(midi - (octave ? 12 : 0)) % 12];
      const on = (k: Key) => pressed.includes(k);
      return (
        <>
          <ellipse className={`sx-key${octave ? ' on' : ''}`} cx={x + 12} cy={20} rx={5} ry={7} />
          <text className="sx-tiny" x={x + 12} y={36}>8va</text>
          <Hole x={x + 29} y={32} on={on(1)} />
          <circle className={`sx-key${on('bis') ? ' on' : ''}`} cx={x + 29} cy={43} r={2.6} />
          <Hole x={x + 29} y={54} on={on(2)} />
          <Hole x={x + 29} y={76} on={on(3)} />
          <Lever x={x + 41} y={73} on={on('gis')} />
          <line className="sx-div" x1={x + 14} x2={x + 44} y1={92} y2={92} />
          <Hole x={x + 29} y={106} on={on(4)} />
          <Hole x={x + 29} y={128} on={on(5)} />
          <Hole x={x + 29} y={150} on={on(6)} />
          <Lever x={x + 41} y={152} on={on('es')} />
        </>
      );
    }} />
  );
}
