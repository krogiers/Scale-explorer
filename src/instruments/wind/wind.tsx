import type { ReactNode } from 'react';
import type { Note } from '../../core';
import type { InstrumentView } from '../types';

/**
 * Gemeenschappelijk voor de blaasinstrumenten: één greepkaart per noot van de toonladder,
 * oplopend tot het octaaf. Elk instrument tekent alleen de inhoud van zijn kaart.
 */
export interface WindNote { n: Note; midi: number }

/** Oplopende toonladder plus het octaaf (geschreven MIDI-noten), met de grondtoon tussen low en low + 11. */
export function ascend(v: InstrumentView, low: number): WindNote[] {
  let prev = low + ((v.root - (low % 12) + 12) % 12) - 1;
  return [...v.scaleNotes, v.scaleNotes[0]].map((n) => {
    let m = 60 + n.pc;
    while (m <= prev) m += 12;
    while (m > prev + 12) m -= 12;
    prev = m;
    return { n, midi: m };
  });
}

export const CW = 58;

/** Rij greepkaarten van CW breed en h hoog; `draw` tekent de kleppen van één kaart vanaf x. */
export function WindCards({ v, low, h, draw }: { v: InstrumentView; low: number; h: number; draw: (w: WindNote, x: number) => ReactNode }) {
  const notes = ascend(v, low);
  // oefenmodus: onder een brugnoot staat gestreept de noot die ze vervangt (een halve toon ernaast, bv. F onder F♯)
  const replaced = (pc: number) => v.bridge?.has(pc) ? v.dropped?.find((d) => Math.abs(((d.pc - pc + 18) % 12) - 6) === 1) : undefined;
  const extra = v.dropped?.length ? 14 : 0;
  return (
    <svg viewBox={`0 0 ${notes.length * CW} ${h + 22 + extra}`} role="img" aria-label={v.label}>
      {notes.map((w, i) => {
        const x = i * CW;
        const pc = w.n.pc;
        const old = replaced(pc);
        return (
          <g key={i} className={`sx-card${v.chord.has(pc) ? ' ch' : ''}${pc === v.characteristic ? ' char' : ''}${v.outside.has(pc) ? ' out' : ''}${v.bridge?.has(pc) ? ' br' : ''}`}>
            <rect className="sx-bg" x={x + 2} y={2} width={CW - 4} height={h - 4} rx={8} />
            {draw(w, x)}
            <text className={`sx-lbl${pc === v.root ? ' root' : ''}`} x={x + CW / 2} y={h + 14}>{v.names.note(w.n)}</text>
            {old && <text className="sx-gone" x={x + CW / 2} y={h + 28}>{v.names.note(old)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Een gat of ronde klep; zwart = dicht of ingedrukt. */
export const Hole = ({ x, y, r = 8, on }: { x: number; y: number; r?: number; on: boolean }) =>
  <circle className={`sx-key${on ? ' on' : ''}`} cx={x} cy={y} r={r} />;

/** Een kleine klep (pink- of zijklep) met eventueel een letter eronder. */
export const Lever = ({ x, y, on, label }: { x: number; y: number; on: boolean; label?: string }) => (
  <>
    <rect className={`sx-key${on ? ' on' : ''}`} x={x} y={y} width={10} height={7} rx={2} />
    {label && <text className="sx-tiny" x={x + 5} y={y + 15}>{label}</text>}
  </>
);
