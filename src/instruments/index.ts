/**
 * Voordeur van de instrumenten: het register. Een instrument toevoegen = één component schrijven
 * (zie types.ts) en hier registreren. Blaasinstrumenten staan in wind/ en delen hun greepkaarten.
 */
import { Guitar } from './Guitar';
import { Piano } from './Piano';
import type { Instrument } from './types';
import { Clarinet, Flute, Sax, Trumpet } from './wind';

export type { Instrument, InstrumentView } from './types';

export const INSTRUMENTS: Instrument[] = [
  { id: 'piano', component: Piano },
  { id: 'sax', component: Sax },
  { id: 'guitar', component: Guitar },
  { id: 'trumpet', component: Trumpet, transpose: 2 },
  { id: 'clarinet', component: Clarinet, transpose: 2 },
  { id: 'flute', component: Flute },
];
/**
 * Stemming van de sax: hoeveel halve tonen de geschreven noot boven de klinkende ligt.
 * Alle saxen hebben dezelfde grepen per geschreven noot; alleen de stemming verschilt.
 */
export type SaxKey = 'C' | 'Eb' | 'Bb';
export const SAX_KEYS: SaxKey[] = ['C', 'Eb', 'Bb'];
export const SAX_TRANSPOSE: Record<SaxKey, number> = { C: 0, Eb: 9, Bb: 2 };

export const instrumentById = (id: string) => INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];
