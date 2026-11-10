/**
 * Interface: nootnamen. Zet een gespelde noot (letter + verhoging) om in een naam.
 * Los van de interfacetaal: je kunt de interface in het Nederlands zetten en toch do re mi gebruiken.
 * Een nieuw systeem toevoegen = één object aan NOTE_NAMERS toevoegen.
 * Ook het lezen in de toonaard van je instrument (B♭, E♭) gebeurt hier: de app rekent en klinkt in concert,
 * alleen de namen zijn getransponeerd.
 */
import { accidentalFor, mod12, type Chord, type Note, type Quality, type Scale } from '../core';
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

/**
 * Lezen in de toonaard van een transponerend instrument: geschreven = zoveel letters en halve tonen boven concert.
 * B♭ (tenor, sopraan, trompet, klarinet) = grote secunde (1 letter, 2 halve tonen); E♭ (alt, bariton) = grote sext (5, 9).
 */
export interface Reading { letters: number; semis: number }
export const CONCERT: Reading = { letters: 0, semis: 0 };
const LETTERS: Record<number, number> = { 0: 0, 2: 1, 7: 4, 9: 5 };
export const readingFor = (semis: number): Reading => ({ letters: LETTERS[mod12(semis)] ?? Math.round((mod12(semis) * 7) / 12) % 7, semis: mod12(semis) });

/**
 * Een concertnoot zoals ze op de partij staat: per interval getransponeerd, zodat een ladder elke letter één keer houdt
 * en de voortekening klopt (concert E♭ → F voor B♭). Alleen een dubbel voorteken wordt omgespeld (F𝄪 → G):
 * dat komt enkel voor bij E♭ in de familie van concert B majeur.
 */
export function transposeNote(n: Note, r: Reading): Note {
  if (!r.semis) return n;
  const pc = mod12(n.pc + r.semis);
  let letter = (n.letter + r.letters) % 7;
  let acc = accidentalFor(pc, letter);
  if (Math.abs(acc) > 1) {
    letter = (letter + (acc > 0 ? 1 : 6)) % 7;
    acc = accidentalFor(pc, letter);
  }
  return { pc, letter, acc };
}

/** Een ladder zoals je ze leest: zelfde modus, noten getransponeerd en gespeld zoals transposeNote. */
export function writtenScale(s: Scale, r: Reading): Scale {
  if (!r.semis) return s;
  const notes = s.notes.map((n) => transposeNote(n, r));
  return { ...s, root: notes[0].pc, notes, pcs: new Set(notes.map((n) => n.pc)), signature: notes.reduce((a, n) => a + n.acc, 0) };
}

/** Namen voor de interface; met een Reading in de toonaard van je instrument. */
export function makeNames(namer: NoteNamer, reading: Reading = CONCERT) {
  const note = (n: Note) => { const w = transposeNote(n, reading); return namer.name(w.letter, w.acc); };
  return {
    note,
    chord: (c: Chord) => note(c.root) + CHORD_SUFFIX[c.quality],
    /** Voortekens van een ladder zoals je ze leest (positief = kruizen). */
    signature: (s: Scale) => writtenScale(s, reading).signature,
    reading,
  };
}
export type Names = ReturnType<typeof makeNames>;
