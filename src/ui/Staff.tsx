import { useState } from 'react';
import { LETTER_PC, mod12, type Note } from '../core';

export type Clef = 'treble' | 'bass';
const CLEF_KEY = 'tln-clef';

/** De gekozen sleutel, onthouden in de browser (alleen een gemak voor deze kijker). */
export function useClef(): [Clef, (c: Clef) => void] {
  const [clef, setClef] = useState<Clef>(() => { try { return localStorage.getItem(CLEF_KEY) === 'bass' ? 'bass' : 'treble'; } catch { return 'treble'; } });
  const set = (c: Clef) => { setClef(c); try { localStorage.setItem(CLEF_KEY, c); } catch { /* niet erg */ } };
  return [clef, set];
}

/** Halve afstand tussen twee lijnen (één trap op de notenbalk), in px. */
const H = 5;
/**
 * Per sleutel: de onderste lijn als diatonische trap (letter + 7 × octaaf: E4 bij sol, G2 bij fa), de laagste MIDI-noot
 * voor de grondtoon (zo staat een ladder grotendeels op de balk: sol vanaf C4, fa vanaf F2), en het teken met zijn lijn.
 */
const CLEFS = {
  // tekens zijn zo groot als de balk (SMuFL: 1 em = 4 tussenruimtes); dy = bijstelling in trappen (het fa-teken van
  // Noto Music staat anders te hoog); top/low = hoe ver het teken boven/onder de balk komt
  treble: { bottom: 2 + 7 * 4, base: 60, glyph: '\u{1D11E}', line: 2, dy: 0, top: 13, low: -5 }, // noten van C4 tot A5: trap -2 … 10
  bass: { bottom: 4 + 7 * 2, base: 41, glyph: '\u{1D122}', line: 6, dy: 2.5, top: 13, low: -3 }, // noten van F2 tot D4: trap -1 … 11
} as const;
const ACC: Record<number, string> = { 1: '♯', [-1]: '♭', 0: '' };

/**
 * Plaatst geschreven noten op de balk. Noten hebben geen octaaf: de eerste komt zo laag mogelijk vanaf `base`, elke volgende
 * net boven de vorige (een ladder loopt op, een akkoord staat in grondligging). Geeft per noot de trap t.o.v. de onderste lijn.
 */
export function placeNotes(notes: Note[], clef: Clef, midis?: number[]): number[] {
  const { bottom, base } = CLEFS[clef];
  let prev = -Infinity;
  return notes.map((n, i) => {
    const midi = midis?.[i] ?? (i === 0 ? base + mod12(n.pc - base) : prev + (mod12(n.pc - prev) || 12));
    prev = midi;
    const octave = (midi - n.acc - LETTER_PC[n.letter]) / 12 - 1;
    return n.letter + 7 * Math.round(octave) - bottom;
  });
}

/** Een reeks toonhoogtes zoveel octaven verschuiven dat ze rond het midden van de balk liggen (sol: B4, fa: D3). */
function fitOctaves(midis: number[], clef: Clef): number[] {
  if (!midis.length) return midis;
  const mid = clef === 'treble' ? 71 : 50;
  const avg = midis.reduce((a, b) => a + b, 0) / midis.length;
  const k = Math.round((mid - avg) / 12) * 12;
  return midis.map((m) => m + k);
}

/**
 * Een notenbalk met sleutel en noten zonder steel (gewoon de toonhoogte, om te leren lezen). chord = gestapeld als
 * akkoord, anders naast elkaar als ladder. Elke noot krijgt zijn eigen voorteken (geen voortekening).
 * mark geeft een klasse per noot (bv. 'char' voor de kenmerkende noot, 'hot' voor een noot die verandert).
 */
export function Staff({ notes, clef, chord = false, mark, label, midis }: { notes: Note[]; clef: Clef; chord?: boolean; mark?: (n: Note, i: number) => string | undefined; label: string; midis?: number[] }) {
  const c = CLEFS[clef];
  // echte toonhoogtes (melodie): in de buurt van de balk brengen, per octaaf, zodat de hele lijn samen verschuift
  const shifted = midis && fitOctaves(midis, clef);
  const ps = placeNotes(notes, clef, shifted);
  // een vaste hoogte per sleutel (alles wat placeNotes kan geven past erin), zodat de balk niet verspringt
  const lo = Math.min(c.low, ...ps.map((p) => p - 2)), hi = Math.max(c.top, ...ps.map((p) => p + 2));
  const y = (p: number) => (hi - p) * H;
  const clefW = 8 * H, step = 6 * H; // ruimte voor een voorteken tussen twee noten
  const x = (i: number) => clefW + 4 * H + (chord ? 0 : i * step);
  const width = x(chord ? 0 : notes.length - 1) + 3 * H;
  // hulplijnen onder (trap -2, -4, …) en boven (10, 12, …) de balk
  const ledgers = (p: number) => {
    const out: number[] = [];
    for (let l = -2; l >= p; l -= 2) out.push(l);
    for (let l = 10; l <= p; l += 2) out.push(l);
    return out;
  };
  // voortekens in een akkoord: wie te dicht bij het vorige staat, schuift naar links
  let lastAcc = -Infinity, shift = 0;
  return (
    <svg className="staff" width={width} height={(hi - lo) * H} viewBox={`0 0 ${width} ${(hi - lo) * H}`} role="img" aria-label={label}>
      {[0, 2, 4, 6, 8].map((p) => <line key={p} className="sl" x1={0} x2={width} y1={y(p)} y2={y(p)} />)}
      <text className="clef" x={2} y={y(c.line) + c.dy * H} fontSize={8 * H}>{c.glyph}</text>
      {notes.map((n, i) => {
        const p = ps[i];
        const cx = x(i);
        if (chord && n.acc) { shift = p - lastAcc < 6 ? shift + 2 * H : 0; lastAcc = p; }
        const ax = cx - 3 * H - (chord ? shift : 0);
        return (
          <g key={i} className={mark?.(n, i)}>
            {ledgers(p).map((l) => <line key={l} className="sl" x1={cx - 2 * H} x2={cx + 2 * H} y1={y(l)} y2={y(l)} />)}
            {n.acc !== 0 && <text className="acc" x={ax} y={y(p)} fontSize={8 * H} textAnchor="middle">{ACC[n.acc] ?? ''}</text>}
            <ellipse className="nh" cx={cx} cy={y(p)} rx={H * 1.3} ry={H * 0.95} transform={`rotate(-20 ${cx} ${y(p)})`} />
          </g>
        );
      })}
    </svg>
  );
}
