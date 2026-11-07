import type { InstrumentView } from '../types';
import { Hole, Lever, WindCards } from './wind';

/**
 * Klarinet in B♭ (Boehm): basisgrepen per geschreven noot, volgens de Woodwind Fingering Guide.
 * Grondtoon tussen B♭3 en A4. De registerklep (R) geeft een duodecime hoger, geen octaaf:
 * daarom lijken de grepen van B4 en hoger op die van E3 en hoger.
 * R = registerklep, T = duimgat, A en G♯ = klepjes boven de linkerwijsvinger, 4 = onderste zijklep rechts (E♭/B♭).
 * Pinkkleppen: links E, F♯ en C♯, rechts F en G♯.
 */
type Key = 'R' | 'T' | 'A' | 'gs' | 1 | 2 | 3 | 4 | 5 | 6 | 's4' | 'lE' | 'lFs' | 'lCs' | 'rF' | 'rGs';
const L: Key[] = ['T', 1, 2, 3];
export const FINGERING: Record<number, Key[]> = {
  58: [...L, 4],                          // B♭3
  59: [...L, 5],                          // B3
  60: L,                                  // C4
  61: [...L, 'lCs'],                      // C♯4
  62: ['T', 1, 2],                        // D4
  63: ['T', 1, 2, 's4'],                  // E♭4
  64: ['T', 1],                           // E4
  65: ['T'],                              // F4
  66: [1],                                // F♯4
  67: [],                                 // G4
  68: ['gs'],                             // G♯4
  69: ['A'],                              // A4
  70: ['R', 'A'],                         // B♭4
  71: ['R', ...L, 'lE', 4, 5, 6],         // B4
  72: ['R', ...L, 4, 5, 6, 'rF'],         // C5
  73: ['R', ...L, 'lFs', 4, 5, 6],        // C♯5
  74: ['R', ...L, 4, 5, 6],               // D5
  75: ['R', ...L, 4, 5, 6, 'rGs'],        // E♭5
  76: ['R', ...L, 4, 5],                  // E5
  77: ['R', ...L, 4],                     // F5
  78: ['R', ...L, 5],                     // F♯5
  79: ['R', ...L],                        // G5
  80: ['R', ...L, 'lCs'],                 // G♯5
  81: ['R', 'T', 1, 2],                   // A5
};

export function Clarinet(v: InstrumentView) {
  return (
    <WindCards v={v} low={58} h={204} draw={({ midi }, x) => {
      const on = (k: Key) => FINGERING[midi].includes(k);
      return (
        <>
          <ellipse className={`sx-key${on('R') ? ' on' : ''}`} cx={x + 11} cy={18} rx={4} ry={6} />
          <text className="sx-tiny" x={x + 11} y={32}>R</text>
          <Hole x={x + 11} y={44} r={5} on={on('T')} />
          <text className="sx-tiny" x={x + 11} y={58}>T</text>
          <Lever x={x + 24} y={10} on={on('A')} />
          <text className="sx-tiny" x={x + 40} y={16}>A</text>
          <Hole x={x + 29} y={34} on={on(1)} />
          <Lever x={x + 42} y={30} on={on('gs')} />
          <Hole x={x + 29} y={56} on={on(2)} />
          <Hole x={x + 29} y={78} on={on(3)} />
          <Lever x={x + 8} y={92} on={on('lE')} label="E" />
          <Lever x={x + 24} y={92} on={on('lFs')} label="F♯" />
          <Lever x={x + 40} y={92} on={on('lCs')} label="C♯" />
          <line className="sx-div" x1={x + 14} x2={x + 44} y1={116} y2={116} />
          <Hole x={x + 29} y={130} on={on(4)} />
          <Lever x={x + 42} y={134} on={on('s4')} label="4" />
          <Hole x={x + 29} y={152} on={on(5)} />
          <Hole x={x + 29} y={174} on={on(6)} />
          <Lever x={x + 14} y={186} on={on('rF')} label="F" />
          <Lever x={x + 34} y={186} on={on('rGs')} label="G♯" />
        </>
      );
    }} />
  );
}
