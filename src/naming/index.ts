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
 * B♭ (tenor, sopraan, trompet, klarinet) = grote secunde (1 letter, 2 halve tonen); E♭ (alt, bariton) = grote sext (5, 9);
 * F (hoorn) = kwint (4, 7); A (klarinet in A) = kleine terts (2, 3); G (altfluit) = kwart (3, 5); D (trompet in D) = grote
 * secunde lager (6 letters omhoog = 1 omlaag, 10).
 */
export interface Reading { letters: number; semis: number }
export const CONCERT: Reading = { letters: 0, semis: 0 };
const LETTERS: Record<number, number> = { 0: 0, 2: 1, 3: 2, 5: 3, 7: 4, 9: 5, 10: 6 };
/**
 * De stemmingen die je kunt kiezen, als halve tonen dat je partij boven concert staat, gangbaarste eerst:
 * C, B♭, E♭, F, A, G, D. (De naam is de concertnoot van een geschreven C: B♭ = 2, want geschreven C klinkt B♭.)
 */
export const READINGS = [0, 2, 9, 7, 3, 5, 10] as const;
export const isReading = (v: unknown): v is number => (READINGS as readonly unknown[]).includes(v);
export const readingFor = (semis: number): Reading => ({ letters: LETTERS[mod12(semis)] ?? Math.round((mod12(semis) * 7) / 12) % 7, semis: mod12(semis) });

/**
 * Een concertnoot zoals ze op de partij staat: per interval getransponeerd, zodat een ladder elke letter één keer houdt
 * en de voortekening klopt (concert E♭ → F voor B♭). Alleen een dubbel voorteken wordt omgespeld (F𝄪 → G): dat komt
 * voor bij E♭, A en D in één verre familie (7 à 14 van de 84 modi); daar staat dan één letter twee keer in de ladder.
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
/** Het achtervoegsel van een akkoordsoort, zoals de app het toont (m7, maj7, °7, …). */
export const chordSuffix = (q: Quality) => CHORD_SUFFIX[q];

/** Gangbare schrijfwijzen per akkoordsoort (hoofdletters tellen: M7 is maj7, m7 is mineur). */
const QUALITY_ALIASES: [Quality, string[]][] = [
  ['maj', ['', 'M', 'maj', 'major']],
  ['min', ['m', 'min', 'mi', '-']],
  ['dim', ['dim', '°', 'o']],
  ['aug', ['aug', '+']],
  ['maj7', ['maj7', 'M7', 'Maj7', 'ma7', 'Δ', 'Δ7', 'j7']],
  ['7', ['7', 'dom7']],
  ['m7', ['m7', 'min7', 'mi7', '-7']],
  ['m7b5', ['m7b5', 'm7♭5', 'ø', 'ø7', '-7b5', 'min7b5', 'mi7b5']],
  ['dim7', ['dim7', '°7', 'o7']],
  ['mM7', ['mM7', 'm(maj7)', 'mmaj7', 'mMaj7', 'm(M7)', 'mΔ7', '-Δ7', 'minmaj7']],
];
const QUALITY_BY_TEXT = new Map(QUALITY_ALIASES.flatMap(([q, all]) => all.map((a) => [a, q] as const)));

/** Alle manieren om een noot te schrijven: elk naamsysteem, plus # en b voor wie geen ♯ en ♭ typt. Langste eerst. */
const NOTE_SPELLINGS: { text: string; letter: number; acc: number }[] = (() => {
  const out: { text: string; letter: number; acc: number }[] = [];
  for (let letter = 0; letter < 7; letter++) for (const acc of [-1, 0, 1]) {
    for (const n of [english, solfege, dutch]) out.push({ text: n.name(letter, acc).toLowerCase(), letter, acc });
    const b = 'cdefgab'[letter];
    if (acc) out.push({ text: b + (acc > 0 ? '#' : 'b'), letter, acc });
  }
  return out.sort((a, b) => b.text.length - a.text.length);
})();

/**
 * Een getypt akkoord lezen, bv. "Cm7", "F#m7b5", "Bbmaj7", "Bes7", "Do-7". Geeft de geschreven noot (letter en
 * voorteken, zoals je leest) en de soort, of null als het geen akkoord is dat de app kent.
 */
export function parseChord(text: string): { letter: number; acc: number; quality: Quality } | null {
  const t = text.trim().replace(/\s+/g, '');
  if (!t) return null;
  for (const n of NOTE_SPELLINGS) {
    if (!t.toLowerCase().startsWith(n.text)) continue;
    const q = QUALITY_BY_TEXT.get(t.slice(n.text.length));
    if (q) return { letter: n.letter, acc: n.acc, quality: q };
  }
  return null;
}

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
