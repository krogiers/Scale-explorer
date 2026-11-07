/** Kleur bovenop de modus: de blue note en de pentatonische ladder. */
import { accidentalFor, mod12, type Note, type PitchClass } from './pitch';
import type { Scale } from './scale';

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
