/**
 * Theoriekern. Rekent alleen met toonklassen (0 = C ... 11 = B) en lettertrappen.
 * Kent geen nootnamen, geen taal en geen instrument: die zitten in hun eigen interfaces.
 */

export type PitchClass = number; // 0..11
/** Een gespelde noot: letter 0..6 (C D E F G A B) plus verhoging (+) of verlaging (-). */
export interface Note {
  pc: PitchClass;
  letter: number;
  acc: number;
}

/** Modi van helder (0, Lydisch) naar donker (6, Locrisch). */
export type ModeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const MODE_COUNT = 7;
export const MODE_IDS = ['lydian', 'ionian', 'mixolydian', 'dorian', 'aeolian', 'phrygian', 'locrian'] as const;
export type ModeId = (typeof MODE_IDS)[number];

export const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** Op welke trap van de majeurladder elke modus begint. */
const MODE_OFFSET = [3, 0, 4, 1, 5, 2, 6];
/** Trap (0-based) van de kenmerkende noot per modus. */
export const CHAR_DEGREE = [3, 6, 6, 5, 5, 1, 4];

export const mod12 = (n: number) => ((n % 12) + 12) % 12;
/** Positie op de kwintencirkel: C = 0, G = 1, D = 2 ... */
export const fifthsIndex = (pc: PitchClass) => mod12(pc * 7);
export const pcFromFifths = (f: number) => mod12(f * 7);

export function intervals(mode: ModeIndex): number[] {
  const o = MODE_OFFSET[mode];
  return MAJOR.map((_, i) => mod12(MAJOR[(o + i) % 7] - MAJOR[o]));
}

function accidentalFor(pc: PitchClass, letter: number): number {
  let a = mod12(pc - LETTER_PC[letter]);
  if (a > 6) a -= 12;
  return a;
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

/** Trapformule van een modus, bv. "1 2 ♭3 4 5 6 ♭7". */
export function formula(mode: ModeIndex): string[] {
  return intervals(mode).map((x, i) => {
    const a = x - MAJOR[i];
    return (a < 0 ? '♭' : a > 0 ? '♯' : '') + (i + 1);
  });
}

export type HarmonicFunction = 'T' | 'S' | 'D';
const FUNCTIONS: HarmonicFunction[] = ['T', 'S', 'T', 'S', 'D', 'T', 'D'];
/** Functies (tonica, subdominant, dominant) zijn alleen zinvol in majeur en mineur. */
export function harmonicFunction(mode: ModeIndex, degree: number): HarmonicFunction | null {
  return mode === 1 || mode === 4 ? FUNCTIONS[degree] : null;
}

/**
 * Blue note: de verlaagde kwint (♭5) van de grondtoon, de kenmerkende noot van de bluesladder
 * (1 ♭3 4 ♭5 5 ♭7). Gespeld op de letter van de kwint, dus op D wordt het A♭ en niet G♯.
 * Zou dat een dubbel voorteken geven (G♭ → D𝄫), dan spellen we hem als ♯4 (C).
 * inScale = true als de modus hem al bevat (Locrisch).
 */
export function blueNote(s: Scale): { note: Note; inScale: boolean } {
  const pc = mod12(s.root + 6);
  let letter = (s.notes[0].letter + 4) % 7;
  if (Math.abs(accidentalFor(pc, letter)) > 1) letter = (s.notes[0].letter + 3) % 7;
  return { note: { pc, letter, acc: accidentalFor(pc, letter) }, inScale: s.pcs.has(pc) };
}

export type PentaKind = 'major' | 'minor' | 'locrian';
/** Trappen die pentatonisch overblijven: majeur 1 2 3 5 6, mineur 1 ♭3 4 5 ♭7 (in Locrisch wordt dat 1 ♭3 4 ♭5 ♭7). */
const PENTA_DEGREES: Record<PentaKind, number[]> = { major: [0, 1, 2, 4, 5], minor: [0, 2, 3, 4, 6], locrian: [0, 2, 3, 4, 6] };
/**
 * Pentatonische ladder binnen de modus: de heldere modi (Lyd, Ion, Mix) geven majeur-pentatonisch,
 * de donkere mineur-pentatonisch. Op Locrisch na valt telkens de kenmerkende noot weg,
 * daarom past één pentatonische ladder over meerdere buurmodi.
 */
export function pentatonic(s: Scale): { kind: PentaKind; notes: Note[]; dropped: Note[]; pcs: Set<PitchClass> } {
  const kind: PentaKind = s.mode <= 2 ? 'major' : s.mode === 6 ? 'locrian' : 'minor';
  const keep = PENTA_DEGREES[kind];
  const notes = keep.map((d) => s.notes[d]);
  return { kind, notes, dropped: s.notes.filter((_, i) => !keep.includes(i)), pcs: new Set(notes.map((n) => n.pc)) };
}
