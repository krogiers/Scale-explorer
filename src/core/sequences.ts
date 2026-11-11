/**
 * Typische progressies, los van een toonsoort, per stijl: klassiek, jazz, pop en rock, blues, modaal en Spaans.
 * Elk akkoord is de eerste trap van een modus op iv halve tonen boven de tonica: een dominant is de I van
 * Mixolydisch, een ii de I van Dorisch. Zo zegt elk akkoord meteen welke ladder je erover speelt.
 * kind: cadens (een slot), turnaround (terug naar het begin), reeks (een akkoordreeks die je herhaalt) of vorm (een heel schema).
 * size: drieklanken (klassiek, pop, modaal) of vierklanken (jazz, blues).
 * approx = de app kent de ladder die er eigenlijk bij hoort niet (harmonisch mineur, alteratie, lydisch dominant,
 * Frygisch dominant) en toont de dichtstbijzijnde modus.
 */
import { chordsOf, type Chord, type ChordSize } from './chords';
import { mod12, type PitchClass } from './pitch';
import { scaleOf, type ModeIndex } from './scale';

const LYD = 0, ION = 1, MIX = 2, DOR = 3, AEO = 4, PHR = 5, LOC = 6;

export const SEQ_STYLES = ['classical', 'jazz', 'pop', 'blues', 'modal'] as const;
export type SeqStyle = (typeof SEQ_STYLES)[number];
export type SeqKind = 'cadence' | 'turnaround' | 'progression' | 'form';
export interface SeqChord { iv: number; mode: ModeIndex; bars: number; approx?: boolean }
export interface Sequence { id: string; style: SeqStyle; kind: SeqKind; size: ChordSize; chords: SeqChord[] }

const c = (iv: number, mode: number, bars = 1, approx = false): SeqChord => ({ iv, mode: mode as ModeIndex, bars, ...(approx && { approx }) });
const q = (id: string, style: SeqStyle, kind: SeqKind, size: ChordSize, chords: SeqChord[]): Sequence => ({ id, style, kind, size, chords });

export const SEQUENCES: Sequence[] = [
  // klassiek: de vier cadenssoorten, en de hele weg tonica – subdominant – dominant – tonica
  q('authentic', 'classical', 'cadence', 3, [c(7, MIX), c(0, ION, 2)]),
  q('plagal', 'classical', 'cadence', 3, [c(5, LYD), c(0, ION, 2)]),
  q('half', 'classical', 'cadence', 3, [c(0, ION), c(2, DOR), c(7, MIX, 2)]),
  q('deceptive', 'classical', 'cadence', 3, [c(7, MIX), c(9, AEO, 2)]),
  q('full', 'classical', 'cadence', 3, [c(0, ION), c(5, LYD), c(7, MIX), c(0, ION)]),
  // mineur met een majeur slotakkoord (Picardische terts)
  q('picardy', 'classical', 'cadence', 3, [c(0, AEO), c(5, DOR), c(7, MIX, 1, true), c(0, ION, 2)]),

  q('iiVI', 'jazz', 'cadence', 4, [c(2, DOR), c(7, MIX), c(0, ION, 2)]),
  q('iiVImin', 'jazz', 'cadence', 4, [c(2, LOC), c(7, MIX, 1, true), c(0, AEO, 2)]),
  q('backdoor', 'jazz', 'cadence', 4, [c(5, DOR), c(10, MIX), c(0, ION, 2)]),
  q('tritone', 'jazz', 'cadence', 4, [c(2, DOR), c(1, MIX, 1, true), c(0, ION, 2)]),
  q('turnaround', 'jazz', 'turnaround', 4, [c(0, ION), c(9, AEO), c(2, DOR), c(7, MIX)]),
  q('iiiVI', 'jazz', 'turnaround', 4, [c(4, PHR), c(9, MIX, 1, true), c(2, DOR), c(7, MIX)]),
  // kwintval door alle trappen, zoals in Autumn Leaves (in de majeurtoonsoort)
  q('fifths', 'jazz', 'progression', 4, [c(2, DOR), c(7, MIX), c(0, ION), c(5, LYD), c(11, LOC), c(4, MIX, 1, true), c(9, AEO, 2)]),
  // A-deel van rhythm changes (I Got Rhythm): twee akkoorden per maat
  q('rhythm', 'jazz', 'form', 4, [
    c(0, ION, 0.5), c(9, AEO, 0.5), c(2, DOR, 0.5), c(7, MIX, 0.5), c(0, ION, 0.5), c(9, AEO, 0.5), c(2, DOR, 0.5), c(7, MIX, 0.5),
    c(0, ION, 0.5), c(0, MIX, 0.5), c(5, LYD, 0.5), c(5, DOR, 0.5), c(4, PHR, 0.5), c(9, MIX, 0.5, true), c(2, DOR, 0.5), c(7, MIX, 0.5),
  ]),
  // Coltrane changes over ii–V–I: tonale centra een grote terts uit elkaar (I, ♭VI, III)
  q('coltrane', 'jazz', 'form', 4, [c(2, DOR, 0.5), c(3, MIX, 0.5), c(8, ION, 0.5), c(11, MIX, 0.5), c(4, ION, 0.5), c(7, MIX, 0.5), c(0, ION, 2)]),

  q('axis', 'pop', 'progression', 3, [c(0, ION), c(7, MIX), c(9, AEO), c(5, LYD)]),
  q('fifties', 'pop', 'progression', 3, [c(0, ION), c(9, AEO), c(5, LYD), c(7, MIX)]),
  // de iv geleend uit mineur (de Dorische modus op de IV geeft een mineurakkoord)
  q('minorPlagal', 'pop', 'cadence', 3, [c(5, DOR), c(0, ION, 2)]),
  q('rockPlagal', 'pop', 'cadence', 3, [c(10, LYD), c(5, LYD), c(0, ION, 2)]),

  q('blues12', 'blues', 'form', 4, [c(0, MIX, 4), c(5, MIX, 2), c(0, MIX, 2), c(7, MIX), c(5, MIX), c(0, MIX), c(7, MIX)]),
  q('bluesCadence', 'blues', 'cadence', 4, [c(7, MIX), c(5, MIX), c(0, MIX, 2)]),
  q('blues', 'blues', 'form', 4, [
    c(0, MIX), c(5, MIX), c(0, MIX), c(7, DOR, 0.5), c(0, MIX, 0.5),
    c(5, MIX), c(5, MIX), c(0, MIX), c(9, MIX, 1, true),
    c(2, DOR), c(7, MIX), c(0, MIX, 0.5), c(9, MIX, 0.5, true), c(2, DOR, 0.5), c(7, MIX, 0.5),
  ]),

  // modaal: het slotakkoord en het akkoord ervoor komen uit dezelfde moederladder en dragen samen de kenmerkende noot
  q('dorian', 'modal', 'cadence', 3, [c(0, DOR), c(5, MIX, 2)]),
  q('phrygian', 'modal', 'cadence', 3, [c(1, LYD), c(0, PHR, 2)]),
  q('lydian', 'modal', 'cadence', 3, [c(0, LYD), c(2, MIX, 2)]),
  q('mixolydian', 'modal', 'cadence', 3, [c(10, LYD), c(0, MIX, 2)]),
  q('aeolian', 'modal', 'cadence', 3, [c(8, LYD), c(10, MIX), c(0, AEO, 2)]),
  // flamenco: een halve cadens (eindigt op V); de V is eigenlijk Frygisch dominant
  q('andalusian', 'modal', 'cadence', 3, [c(0, AEO), c(10, MIX), c(8, LYD), c(7, MIX, 1, true)]),
];

export interface SeqStep { root: PitchClass; mode: ModeIndex; beats: number; chord: Chord; iv: number; approx: boolean }

/** De progressie in de toonsoort met deze tonica; de duur in tellen volgt de maatsoort (minstens één tel). */
export function realize(seq: Sequence, tonic: PitchClass, meter: number): SeqStep[] {
  return seq.chords.map(({ iv, mode, bars, approx }) => {
    const root = mod12(tonic + iv);
    return { root, mode, beats: Math.max(1, Math.round(bars * meter)), chord: chordsOf(scaleOf(root, mode), seq.size)[0], iv, approx: !!approx };
  });
}
