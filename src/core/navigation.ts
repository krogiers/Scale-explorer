/**
 * Navigatie: van een gekozen akkoord naar mogelijke volgende akkoorden.
 * Drie soorten stappen: binnen de modus, leenakkoorden (zelfde grondtoon, andere modus)
 * en modulatie via een spilakkoord (naar een toonladder een kwint hoger of lager).
 */
import { chordsOf, sharedNotes, type Chord, type ChordSize } from './chords';
import { mod12 } from './pitch';
import { scaleOf, type ModeIndex, type Scale } from './scale';

export type DiatonicMove = 'fifthDown' | 'fifthUp' | 'stepUp' | 'stepDown' | 'thirdUp' | 'thirdDown';
/** Afstand in trappen -> soort stap en sterkte (0 = sterkst). */
const MOVES: Record<number, [DiatonicMove, number]> = {
  3: ['fifthDown', 0], 4: ['fifthUp', 3], 1: ['stepUp', 2], 6: ['stepDown', 2], 2: ['thirdUp', 1], 5: ['thirdDown', 1],
};

/** Waar een klik naartoe leidt: een toonladder plus de trap van het akkoord daarin. */
export interface Destination { root: number; mode: ModeIndex; degree: number }

export interface DiatonicTarget { chord: Chord; move: DiatonicMove; strength: number; shared: number; to: Destination }
export interface BorrowedTarget { chord: Chord; source: Scale; distance: number; shared: number; newNotes: Chord['notes']; to: Destination }
export interface PivotNeighbour {
  scale: Scale;
  /** Het gekozen akkoord in de buurtoonladder, als het daar voorkomt. */
  pivot: Chord | null;
  /** Akkoorden van de buur die niet in de huidige toonladder zitten. */
  targets: { chord: Chord; shared: number; to: Destination }[];
  /** Akkoorden die in beide toonladders zitten (kandidaat-spilakkoorden). */
  sharedChords: Chord[];
  newNotes: Scale['notes'];
}
export interface Targets { diatonic: DiatonicTarget[]; borrowed: BorrowedTarget[]; pivots: PivotNeighbour[] }

export function computeTargets(scale: Scale, size: ChordSize, degree: number, borrowedLimit = 7): Targets {
  const chords = chordsOf(scale, size);
  const current = chords[degree];
  const currentKeys = new Set(chords.map((c) => c.key));

  const diatonic = chords
    .filter((c) => c.degree !== degree)
    .map((c) => {
      const [move, strength] = MOVES[(c.degree - degree + 7) % 7];
      return { chord: c, move, strength, shared: sharedNotes(current, c), to: { root: scale.root, mode: scale.mode, degree: c.degree } };
    })
    .sort((a, b) => a.strength - b.strength || b.shared - a.shared);

  const borrowedByKey = new Map<string, BorrowedTarget>();
  for (let m = 0; m < 7; m++) {
    if (m === scale.mode) continue;
    const source = scaleOf(scale.root, m as ModeIndex);
    for (const c of chordsOf(source, size)) {
      if (currentKeys.has(c.key)) continue;
      const distance = Math.abs(m - scale.mode);
      const prev = borrowedByKey.get(c.key);
      if (!prev || distance < prev.distance) {
        borrowedByKey.set(c.key, {
          chord: c, source, distance, shared: sharedNotes(current, c),
          newNotes: c.notes.filter((n) => !scale.pcs.has(n.pc)),
          to: { root: scale.root, mode: source.mode, degree: c.degree },
        });
      }
    }
  }
  const borrowed = [...borrowedByKey.values()]
    .sort((a, b) => a.distance - b.distance || b.shared - a.shared)
    .slice(0, borrowedLimit);

  const pivots = [mod12(scale.root + 7), mod12(scale.root + 5)].map((root) => {
    const s2 = scaleOf(root, scale.mode);
    const ch2 = chordsOf(s2, size);
    const pivot = ch2.find((c) => c.key === current.key) ?? null;
    const keys2 = new Set(ch2.map((c) => c.key));
    return {
      scale: s2,
      pivot,
      targets: pivot
        ? ch2.filter((c) => !currentKeys.has(c.key))
            .map((c) => ({ chord: c, shared: sharedNotes(current, c), to: { root: s2.root, mode: s2.mode, degree: c.degree } }))
            .sort((a, b) => b.shared - a.shared)
        : [],
      sharedChords: chords.filter((c) => keys2.has(c.key)),
      newNotes: s2.notes.filter((n) => !scale.pcs.has(n.pc)),
    };
  });

  return { diatonic, borrowed, pivots };
}
