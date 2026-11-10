/**
 * Voordeur van de instrumenten: het register. Een instrument toevoegen = één component schrijven
 * (zie types.ts) en hier registreren. Blaasinstrumenten staan in wind/ en delen hun greepkaarten.
 */
import { Guitar } from './Guitar';
import { Piano } from './Piano';
import type { Instrument } from './types';
import { Clarinet, Flute, Sax, Trumpet } from './wind';

export type { Instrument, InstrumentView } from './types';

/**
 * Het instrument van de speler (⚙ Instellingen → Mijn instrument). transpose = hoeveel halve tonen je partij boven concert
 * staat: de hele app leest in die toonaard, het geluid blijft concert. De vier saxen delen hun grepen (Sax).
 */
export const INSTRUMENTS: Instrument[] = [
  { id: 'piano', component: Piano },
  { id: 'guitar', component: Guitar },
  { id: 'flute', component: Flute },
  { id: 'clarinet', component: Clarinet, transpose: 2 },
  { id: 'trumpet', component: Trumpet, transpose: 2 },
  { id: 'sopsax', component: Sax, transpose: 2, help: 'sax' },
  { id: 'altsax', component: Sax, transpose: 9, help: 'sax' },
  { id: 'tenorsax', component: Sax, transpose: 2, help: 'sax' },
  { id: 'barisax', component: Sax, transpose: 9, help: 'sax' },
];

export const instrumentById = (id: string) => INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];

/** Hoeveel halve tonen je partij boven concert staat (0 = concert). */
export const writtenShift = (instrument: string): number => instrumentById(instrument).transpose ?? 0;
