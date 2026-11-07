import type { InstrumentView } from '../types';
import { Hole, Lever, WindCards } from './wind';

/**
 * Dwarsfluit (in C, geen transpositie): Boehm-grepen, grondtoon tussen D4 en C#5.
 * Het tweede octaaf blaas je over met dezelfde grepen, behalve D en E♭ (linker wijsvinger open).
 * T = duimklep (B), G♯ = linkerpink, E♭ = rechterpink.
 */
type Key = 'T' | 1 | 2 | 3 | 4 | 5 | 6 | 'gis' | 'es';
export const FINGERING: Record<number, Key[]> = {
  62: ['T', 1, 2, 3, 4, 5, 6],             // D
  63: ['T', 1, 2, 3, 4, 5, 6, 'es'],       // E♭
  64: ['T', 1, 2, 3, 4, 5, 'es'],          // E
  65: ['T', 1, 2, 3, 4, 'es'],             // F
  66: ['T', 1, 2, 3, 6, 'es'],             // F♯
  67: ['T', 1, 2, 3, 'es'],                // G
  68: ['T', 1, 2, 3, 'gis', 'es'],         // G♯
  69: ['T', 1, 2, 'es'],                   // A
  70: ['T', 1, 4, 'es'],                   // B♭
  71: ['T', 1, 'es'],                      // B
  72: [1, 'es'],                           // C
  73: ['es'],                              // C♯
  74: ['T', 2, 3, 4, 5, 6],                // D (2e octaaf)
  75: ['T', 2, 3, 4, 5, 6, 'es'],          // E♭ (2e octaaf)
};

export function Flute(v: InstrumentView) {
  return (
    <WindCards v={v} low={62} h={182} draw={({ midi }, x) => {
      const high = midi >= 74;
      const pressed = FINGERING[midi] ?? FINGERING[midi - 12];
      const on = (k: Key) => pressed.includes(k);
      return (
        <>
          <ellipse className={`sx-key${on('T') ? ' on' : ''}`} cx={x + 12} cy={32} rx={5} ry={7} />
          <text className="sx-tiny" x={x + 12} y={48}>T</text>
          <text className={`sx-tiny${high ? ' on' : ''}`} x={x + 12} y={16}>{high ? '8va' : ''}</text>
          <Hole x={x + 29} y={32} on={on(1)} />
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
