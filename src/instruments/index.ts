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
 * De instrumenten van het instrumentpaneel (Spelen). transpose = de gebruikelijke stemming (halve tonen dat de partij
 * boven concert staat): alleen een hint, want de stemming kies je zelf (⚙ Instellingen → Stemming). De vier saxen delen
 * hun grepen (Sax).
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

/** De gebruikelijke stemming van een instrument (0 = C); oude voorkeuren nemen ze over als stemming. */
export const writtenShift = (instrument: string): number => instrumentById(instrument).transpose ?? 0;
