/** Akkoorden binnen een ladder, hun kwaliteit, trapnummers en functies. */
import { mod12, type Note, type PitchClass } from './pitch';
import { MAJOR, type ModeIndex, type Scale } from './scale';

export type Quality = 'maj' | 'min' | 'dim' | 'aug' | 'maj7' | '7' | 'm7' | 'm7b5' | 'dim7' | 'mM7' | '?';
const QUALITY: Record<string, Quality> = {
  '4,7': 'maj', '3,7': 'min', '3,6': 'dim', '4,8': 'aug',
  '4,7,11': 'maj7', '4,7,10': '7', '3,7,10': 'm7', '3,6,10': 'm7b5', '3,6,9': 'dim7', '3,7,11': 'mM7',
};
export const MINOR_LIKE = new Set<Quality>(['min', 'dim', 'm7', 'm7b5', 'dim7', 'mM7']);
export type ChordSize = 3 | 4;

export interface Chord {
  degree: number;
  root: Note;
  notes: Note[];
  quality: Quality;
  /** Identiteit los van de spelling: grondtoon + kwaliteit. */
  key: string;
  pcs: Set<PitchClass>;
}

export function chordsOf(s: Scale, size: ChordSize): Chord[] {
  return s.notes.map((_, i) => {
    const notes = [0, 2, 4, 6].slice(0, size).map((k) => s.notes[(i + k) % 7]);
    const quality = QUALITY[notes.slice(1).map((n) => mod12(n.pc - notes[0].pc)).join(',')] ?? '?';
    return { degree: i, root: notes[0], notes, quality, key: `${notes[0].pc}:${quality}`, pcs: new Set(notes.map((n) => n.pc)) };
  });
}

export function sharedNotes(a: Chord, b: Chord): number {
  let n = 0;
  a.pcs.forEach((p) => { if (b.pcs.has(p)) n++; });
  return n;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const ROMAN_SUFFIX: Record<Quality, string> = {
  maj: '', min: '', dim: '°', aug: '+', maj7: 'maj7', '7': '7', m7: '7', m7b5: 'ø7', dim7: '°7', mM7: '(maj7)', '?': '',
};
/** Trapnummer ten opzichte van de majeurladder op dezelfde grondtoon, bv. ♭VII of ♯iv°. */
export function romanNumeral(s: Scale, c: Chord): string {
  let a = mod12(c.root.pc - s.root) - MAJOR[c.degree];
  if (a > 6) a -= 12;
  if (a < -6) a += 12;
  const prefix = a < 0 ? '♭'.repeat(-a) : '♯'.repeat(a);
  let n = NUMERALS[c.degree];
  if (MINOR_LIKE.has(c.quality)) n = n.toLowerCase();
  return prefix + n + ROMAN_SUFFIX[c.quality];
}

/** Trap en voorteken voor elk interval boven de tonica, zoals in jazzanalyse: ♭II, ♭III, ♭V, ♭VI, ♭VII. */
const IV_DEGREE: [number, number][] = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
/** Trapnummer van een akkoord met deze kwaliteit op iv halve tonen boven de tonica, bv. ♭II7 of iiø7. */
export function numeralAt(iv: number, quality: Quality): string {
  const [d, a] = IV_DEGREE[mod12(iv)];
  const n = NUMERALS[d];
  return (a < 0 ? '♭' : '') + (MINOR_LIKE.has(quality) ? n.toLowerCase() : n) + ROMAN_SUFFIX[quality];
}

export type HarmonicFunction = 'T' | 'S' | 'D';
const FUNCTIONS: HarmonicFunction[] = ['T', 'S', 'T', 'S', 'D', 'T', 'D'];
/** Functies (tonica, subdominant, dominant) zijn alleen zinvol in majeur en mineur. */
export function harmonicFunction(mode: ModeIndex, degree: number): HarmonicFunction | null {
  return mode === 1 || mode === 4 ? FUNCTIONS[degree] : null;
}
