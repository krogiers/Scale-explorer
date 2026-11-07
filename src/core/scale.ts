/**
 * Modi en toonladders. Kent geen nootnamen, geen taal en geen instrument: die zitten in hun eigen interfaces.
 */
import { accidentalFor, mod12, type Note, type PitchClass } from './pitch';

/** Modi van helder (0, Lydisch) naar donker (6, Locrisch). */
export type ModeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const MODE_COUNT = 7;
export const MODE_IDS = ['lydian', 'ionian', 'mixolydian', 'dorian', 'aeolian', 'phrygian', 'locrian'] as const;
export type ModeId = (typeof MODE_IDS)[number];

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** Op welke trap van de majeurladder elke modus begint. */
export const MODE_OFFSET = [3, 0, 4, 1, 5, 2, 6];
/** Trap (0-based) van de kenmerkende noot per modus. */
export const CHAR_DEGREE = [3, 6, 6, 5, 5, 1, 4];

export function intervals(mode: ModeIndex): number[] {
  const o = MODE_OFFSET[mode];
  return MAJOR.map((_, i) => mod12(MAJOR[(o + i) % 7] - MAJOR[o]));
}

/** Spel een modus zo dat elke letter één keer voorkomt en er zo weinig mogelijk voortekens zijn. */
function spell(root: PitchClass, mode: ModeIndex): Note[] {
  const iv = intervals(mode);
  let best: { score: number; notes: Note[]; flats: boolean } | null = null;
  for (let L = 0; L < 7; L++) {
    if (Math.abs(accidentalFor(root, L)) > 1) continue;
    const notes = iv.map((x, i) => {
      const pc = mod12(root + x);
      const letter = (L + i) % 7;
      return { pc, letter, acc: accidentalFor(pc, letter) };
    });
    const score = notes.reduce((s, n) => s + Math.abs(n.acc) + (Math.abs(n.acc) > 1 ? 10 : 0), 0);
    const flats = notes.some((n) => n.acc < 0);
    // bij gelijke stand: mollen (blazers lezen liever Ges dan Fis-majeur)
    if (!best || score < best.score || (score === best.score && flats && !best.flats)) best = { score, notes, flats };
  }
  return best!.notes;
}

export interface Scale {
  root: PitchClass;
  mode: ModeIndex;
  notes: Note[];
  intervals: number[];
  pcs: Set<PitchClass>;
  /** Voortekens: positief = kruizen, negatief = mollen. */
  signature: number;
}

const scaleCache = new Map<string, Scale>();
export function scaleOf(root: PitchClass, mode: ModeIndex): Scale {
  const key = `${root}:${mode}`;
  const hit = scaleCache.get(key);
  if (hit) return hit;
  const notes = spell(mod12(root), mode);
  const s: Scale = {
    root: mod12(root),
    mode,
    notes,
    intervals: intervals(mode),
    pcs: new Set(notes.map((n) => n.pc)),
    signature: notes.reduce((a, n) => a + n.acc, 0),
  };
  scaleCache.set(key, s);
  return s;
}

/** Dezelfde modus een aantal halve tonen hoger, opnieuw gespeld (voor transponerende instrumenten). */
export const transposed = (s: Scale, semitones: number): Scale => scaleOf(mod12(s.root + semitones), s.mode);

/** De trap waarop de bijhorende majeurladder begint (voor "gebruikt de noten van ... majeur"). */
export const parentMajorDegree = (mode: ModeIndex) => (7 - MODE_OFFSET[mode]) % 7;

/** Trapformule van een modus, bv. "1 2 ♭3 4 5 6 ♭7". */
export function formula(mode: ModeIndex): string[] {
  return intervals(mode).map((x, i) => {
    const a = x - MAJOR[i];
    return (a < 0 ? '♭' : a > 0 ? '♯' : '') + (i + 1);
  });
}
