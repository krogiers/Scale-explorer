/**
 * Interface: instrumentweergave. Elk instrument krijgt dezelfde gegevens (InstrumentView)
 * en tekent die op zijn eigen manier. Een instrument toevoegen = één component schrijven en hier registreren.
 * Blaasinstrumenten delen de greepkaarten uit wind.tsx.
 */
import type { ComponentType } from 'react';
import type { Note, PitchClass } from '../core/theory';
import type { Names } from '../naming';
import { Piano } from './Piano';
import { Sax } from './Sax';
import { Guitar } from './Guitar';
import { Trumpet } from './Trumpet';
import { Clarinet } from './Clarinet';
import { Flute } from './Flute';

export interface InstrumentView {
  scaleNotes: Note[];
  scale: Set<PitchClass>;
  chord: Set<PitchClass>;
  root: PitchClass;
  characteristic: PitchClass;
  /** Blue note (♭5), als die getoond moet worden en niet al in de modus zit. */
  blue: Note | null;
  /** Noten van de modus die buiten de pentatonische ladder vallen: gedimd tonen (leeg = alles normaal). */
  outside: Set<PitchClass>;
  names: Names;
  label: string;
}

export interface Instrument {
  id: string;
  component: ComponentType<InstrumentView>;
  /** Vaste stemming: halve tonen dat de geschreven noot boven de klinkende ligt (B♭-instrumenten: 2). */
  transpose?: number;
}

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
