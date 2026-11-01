/**
 * Interface: instrumentweergave. Elk instrument krijgt dezelfde gegevens (InstrumentView)
 * en tekent die op zijn eigen manier. Een saxofoon, gitaar of bas toevoegen =
 * één component schrijven en hier registreren.
 */
import type { ComponentType } from 'react';
import type { Note, PitchClass } from '../core/theory';
import type { Names } from '../naming';
import { Piano } from './Piano';
import { Sax } from './Sax';
import { Guitar } from './Guitar';

export interface InstrumentView {
  scaleNotes: Note[];
  scale: Set<PitchClass>;
  chord: Set<PitchClass>;
  root: PitchClass;
  characteristic: PitchClass;
  /** Blue note (♭5), als die getoond moet worden en niet al in de modus zit. */
  blue: Note | null;
  names: Names;
  label: string;
}

export interface Instrument {
  id: string;
  component: ComponentType<InstrumentView>;
}

export const INSTRUMENTS: Instrument[] = [
  { id: 'piano', component: Piano },
  { id: 'sax', component: Sax },
  { id: 'guitar', component: Guitar },
];
export const instrumentById = (id: string) => INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0];
