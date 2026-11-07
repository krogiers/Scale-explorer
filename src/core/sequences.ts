/**
 * Typische jazzsequenties, los van een toonsoort. Elk akkoord is de eerste trap (vierklank) van een modus
 * op iv halve tonen boven de tonica: een dominant is de I van Mixolydisch, een ii de I van Dorisch.
 * Zo zegt elk akkoord meteen welke ladder je erover speelt.
 * approx = de app kent de ladder die er eigenlijk bij hoort niet (harmonisch mineur, alteratie, lydisch dominant)
 * en toont de dichtstbijzijnde modus.
 */
import { chordsOf, type Chord } from './chords';
import { mod12, type PitchClass } from './pitch';
import { scaleOf, type ModeIndex } from './scale';

const LYD = 0, ION = 1, MIX = 2, DOR = 3, AEO = 4, PHR = 5, LOC = 6;

export interface SeqChord { iv: number; mode: ModeIndex; bars: number; approx?: boolean }
export interface Sequence { id: string; chords: SeqChord[] }

const c = (iv: number, mode: number, bars = 1, approx = false): SeqChord => ({ iv, mode: mode as ModeIndex, bars, ...(approx && { approx }) });

export const SEQUENCES: Sequence[] = [
  { id: 'iiVI', chords: [c(2, DOR), c(7, MIX), c(0, ION, 2)] },
  { id: 'iiVImin', chords: [c(2, LOC), c(7, MIX, 1, true), c(0, AEO, 2)] },
  { id: 'turnaround', chords: [c(0, ION), c(9, AEO), c(2, DOR), c(7, MIX)] },
  { id: 'iiiVI', chords: [c(4, PHR), c(9, MIX, 1, true), c(2, DOR), c(7, MIX)] },
  // kwintval door alle trappen, zoals in Autumn Leaves (in de majeurtoonsoort)
  { id: 'fifths', chords: [c(2, DOR), c(7, MIX), c(0, ION), c(5, LYD), c(11, LOC), c(4, MIX, 1, true), c(9, AEO, 2)] },
  { id: 'backdoor', chords: [c(5, DOR), c(10, MIX), c(0, ION, 2)] },
  { id: 'tritone', chords: [c(2, DOR), c(1, MIX, 1, true), c(0, ION, 2)] },
  {
    id: 'blues', chords: [
      c(0, MIX), c(5, MIX), c(0, MIX), c(7, DOR, 0.5), c(0, MIX, 0.5),
      c(5, MIX), c(5, MIX), c(0, MIX), c(9, MIX, 1, true),
      c(2, DOR), c(7, MIX), c(0, MIX, 0.5), c(9, MIX, 0.5, true), c(2, DOR, 0.5), c(7, MIX, 0.5),
    ],
  },
  // A-deel van rhythm changes (I Got Rhythm): twee akkoorden per maat
  {
    id: 'rhythm', chords: [
      c(0, ION, 0.5), c(9, AEO, 0.5), c(2, DOR, 0.5), c(7, MIX, 0.5), c(0, ION, 0.5), c(9, AEO, 0.5), c(2, DOR, 0.5), c(7, MIX, 0.5),
      c(0, ION, 0.5), c(0, MIX, 0.5), c(5, LYD, 0.5), c(5, DOR, 0.5), c(4, PHR, 0.5), c(9, MIX, 0.5, true), c(2, DOR, 0.5), c(7, MIX, 0.5),
    ],
  },
  // Coltrane changes over ii–V–I: tonale centra een grote terts uit elkaar (I, ♭VI, III)
  { id: 'coltrane', chords: [c(2, DOR, 0.5), c(3, MIX, 0.5), c(8, ION, 0.5), c(11, MIX, 0.5), c(4, ION, 0.5), c(7, MIX, 0.5), c(0, ION, 2)] },
];

export interface SeqStep { root: PitchClass; mode: ModeIndex; beats: number; chord: Chord; iv: number; approx: boolean }

/** De sequentie in de toonsoort met deze tonica; de duur in tellen volgt de maatsoort (minstens één tel). */
export function realize(seq: Sequence, tonic: PitchClass, meter: number): SeqStep[] {
  return seq.chords.map(({ iv, mode, bars, approx }) => {
    const root = mod12(tonic + iv);
    return { root, mode, beats: Math.max(1, Math.round(bars * meter)), chord: chordsOf(scaleOf(root, mode), 4)[0], iv, approx: !!approx };
  });
}
