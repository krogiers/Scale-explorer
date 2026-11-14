/**
 * Een verzonnen melodie over het schema ("Verzin een melodie"). Toeval met regels, zodat het als een liedje klinkt:
 * - Ritme: per maat een patroon uit een kleine bibliotheek. Een frase van vier maten heeft de vorm A A B slot, zodat
 *   motiefjes terugkomen; het slot is een lange noot. De laatste maat van alles eindigt lang.
 * - Toonhoogte: op een zware tel (of de eerste noot van een nieuw akkoord) een akkoordnoot dicht bij de vorige;
 *   daartussen stapjes in de ladder van dat akkoord (meestal één trap, soms twee), met een voorkeur om dezelfde
 *   richting te blijven gaan. Wisselt de ladder, dan begint het akkoord vaak op de noot die verandert (de brug).
 *   De kenmerkende noot van de modus krijgt wat extra kans. Het allerlaatste akkoord eindigt op zijn grondtoon.
 * - Bereik: C4 tot A5 (midi 60–81), zodat het in de melodieklank goed ligt.
 * Uitvoer per stap van de tijdlijn: noten met hun begin en duur in tellen vanaf het begin van die stap.
 */
import type { Chord } from './chords';
import { CHAR_DEGREE, type Scale } from './scale';
import { pick, type Rng } from './surprise';

export interface MelodyNote { at: number; dur: number; midi: number }
export interface MelodyStep { scale: Scale; chord: Chord; beats: number }

const LOW = 60, HIGH = 81;
type Pattern = [number, number][]; // [begin, duur] in tellen binnen de maat; wat ontbreekt is rust
const PATTERNS: Record<number, Pattern[]> = {
  4: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[0, 1.5], [1.5, 0.5], [2, 2]],
    [[0, 0.5], [0.5, 0.5], [1, 1], [2, 2]],
    [[0, 2], [2, 1], [3, 1]],
    [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1.5]],
    [[1, 1], [2, 1], [3, 1]],
    [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 2]],
    [[0, 1], [1.5, 0.5], [2, 1], [3, 1]],
  ],
  3: [
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [2, 1]],
    [[0, 1.5], [1.5, 0.5], [2, 1]],
    [[0, 0.5], [0.5, 0.5], [1, 2]],
    [[1, 1], [2, 1]],
  ],
};
const ENDINGS: Record<number, Pattern[]> = { 4: [[[0, 2], [2, 2]], [[0, 1], [1, 3]], [[0, 4]]], 3: [[[0, 3]], [[0, 1], [1, 2]]] };

/** Alle midi-noten in het bereik waarvan de toonklasse in pcs zit. */
const inRange = (pcs: Set<number>) => Array.from({ length: HIGH - LOW + 1 }, (_, i) => LOW + i).filter((m) => pcs.has(m % 12));

export function makeMelody(steps: MelodyStep[], meter: number, rng: Rng): MelodyNote[][] {
  const out: MelodyNote[][] = steps.map(() => []);
  if (steps.length === 0) return out;
  const m = meter === 3 ? 3 : 4;
  const starts: number[] = [];
  let total = 0;
  for (const s of steps) { starts.push(total); total += s.beats; }
  const bars = Math.ceil(total / m);
  const A = pick(PATTERNS[m], () => 1, rng), B = pick(PATTERNS[m].filter((p) => p !== A), () => 1, rng);
  const end = pick(ENDINGS[m], () => 1, rng);
  const stepAt = (beat: number) => { let i = 0; while (i + 1 < steps.length && starts[i + 1] <= beat) i++; return i; };

  let prev = 69; // begin rond A4
  let dir = rng() < 0.5 ? 1 : -1;
  let lastStep = -1;
  for (let bar = 0; bar < bars; bar++) {
    const finalBar = bar === bars - 1;
    const pattern = finalBar ? ENDINGS[m][ENDINGS[m].length - 1] : [A, A, B, end][bar % 4];
    for (const [onset, len] of pattern) {
      const at = bar * m + onset;
      if (at >= total) break;
      const i = stepAt(at);
      const { scale, chord } = steps[i];
      const stepEnd = starts[i] + steps[i].beats;
      const newChord = i !== lastStep;
      const strong = onset === 0 || (m === 4 && onset === 2) || newChord;
      const charPc = scale.notes[CHAR_DEGREE[scale.mode]].pc;
      const weightNear = (x: number) => { const d = Math.abs(x - prev); return d === 0 ? 0.5 : d <= 2 ? 4 : d <= 4 ? 3 : d <= 7 ? 1 : 0; };
      const charBonus = (x: number) => (x % 12 === charPc ? 1.5 : 1);
      let midi: number;
      const prevScale = lastStep >= 0 ? steps[lastStep].scale : null;
      const bridge = newChord && prevScale ? scale.notes.filter((n) => !prevScale.pcs.has(n.pc)).map((n) => n.pc) : [];
      const isLast = i === steps.length - 1 && at + len >= total - 0.001;
      if (isLast) {
        midi = pick(inRange(new Set([chord.root.pc])), (x) => weightNear(x) + 0.01, rng);
      } else if (bridge.length && rng() < 0.6) {
        midi = pick(inRange(new Set(bridge)), (x) => weightNear(x) + 0.01, rng);
      } else if (strong) {
        midi = pick(inRange(chord.pcs), (x) => (weightNear(x) + 0.01) * charBonus(x), rng);
      } else {
        // stapjes in de ladder: meestal één trap, soms twee, liefst in dezelfde richting
        const ladder = inRange(scale.pcs);
        const at0 = ladder.reduce((best, x, k) => (Math.abs(x - prev) < Math.abs(ladder[best] - prev) ? k : best), 0);
        if (rng() > 0.65) dir = -dir;
        const size = rng() < 0.8 ? 1 : 2;
        let k = at0 + dir * size;
        if (k < 0 || k >= ladder.length) { dir = -dir; k = at0 + dir * size; }
        midi = ladder[Math.max(0, Math.min(ladder.length - 1, k))];
      }
      out[i].push({ at: at - starts[i], dur: Math.min(len, stepEnd - at), midi });
      dir = midi > prev ? 1 : midi < prev ? -1 : dir;
      prev = midi;
      lastStep = i;
    }
  }
  return out;
}
