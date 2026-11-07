/**
 * Interface: nootnamen. Zet een gespelde noot (letter + verhoging) om in een naam.
 * Los van de interfacetaal: je kunt de interface in het Nederlands zetten en toch do re mi gebruiken.
 * Een nieuw systeem toevoegen = één object aan NOTE_NAMERS toevoegen.
 */
import type { Chord, Note, Quality } from '../core';
import type { Lang } from '../i18n';

export interface NoteNamer {
  id: string;
  label: Record<Lang, string>;
  name(letter: number, acc: number): string;
}

const ACC: Record<string, string> = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };

const english: NoteNamer = {
  id: 'en',
  label: { nl: 'Engels (C, B♭)', en: 'English (C, B♭)' },
  name: (l, a) => 'CDEFGAB'[l] + ACC[a],
};

const solfege: NoteNamer = {
  id: 'solf',
  label: { nl: 'Do re mi', en: 'Solfège (do re mi)' },
  name: (l, a) => ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'][l] + ACC[a],
};

const dutch: NoteNamer = {
  id: 'nl',
  label: { nl: 'Nederlands (Bes, Fis)', en: 'Dutch (Bes, Fis)' },
  name: (l, a) => {
    const b = 'CDEFGAB'[l];
    if (a === 0) return b;
    if (a > 0) return b + 'is'.repeat(a);
    if (b === 'E' || b === 'A') return b + 's' + 'es'.repeat(-a - 1); // Es, As
    return b + 'es'.repeat(-a);
  },
};

export const NOTE_NAMERS: NoteNamer[] = [english, solfege, dutch];
export const namerById = (id: string) => NOTE_NAMERS.find((n) => n.id === id) ?? english;

const CHORD_SUFFIX: Record<Quality, string> = {
  maj: '', min: 'm', dim: '°', aug: '+', maj7: 'maj7', '7': '7', m7: 'm7', m7b5: 'm7♭5', dim7: '°7', mM7: 'm(maj7)', '?': '',
};

export function makeNames(namer: NoteNamer) {
  const note = (n: Note) => namer.name(n.letter, n.acc);
  return { note, chord: (c: Chord) => note(c.root) + CHORD_SUFFIX[c.quality] };
}
export type Names = ReturnType<typeof makeNames>;
