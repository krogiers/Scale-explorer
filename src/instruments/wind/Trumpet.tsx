import type { InstrumentView } from '../types';
import { Hole, WindCards } from './wind';

/**
 * Trompet in B♭: per geschreven noot de ventielen die je indrukt (de gewone greep;
 * welke boventoon klinkt, bepaal je met je lippen). Grondtoon tussen B♭3 en A4.
 */
export const VALVES: Record<number, number[]> = {
  58: [1], 59: [2], 60: [], 61: [1, 2, 3], 62: [1, 3], 63: [2, 3], 64: [1, 2], 65: [1], 66: [2], 67: [],
  68: [2, 3], 69: [1, 2], 70: [1], 71: [2], 72: [], 73: [1, 2], 74: [1], 75: [2], 76: [], 77: [1],
  78: [2], 79: [], 80: [2, 3], 81: [1, 2],
};

export function Trumpet(v: InstrumentView) {
  return (
    <WindCards v={v} low={58} h={112} draw={({ midi }, x) => (
      <>
        {[1, 2, 3].map((k) => (
          <g key={k}>
            <text className="sx-tiny" x={x + 13} y={k * 28 + 3}>{k}</text>
            <Hole x={x + 32} y={k * 28} r={10} on={VALVES[midi].includes(k)} />
          </g>
        ))}
      </>
    )} />
  );
}
