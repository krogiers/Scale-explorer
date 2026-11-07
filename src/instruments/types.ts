/**
 * Interface: instrumentweergave. Elk instrument krijgt dezelfde gegevens (InstrumentView)
 * en tekent die op zijn eigen manier.
 */
import type { ComponentType } from 'react';
import type { Note, PitchClass } from '../core';
import type { Names } from '../naming';

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
  /** De klank die bij dit instrument hoort (een Timbre uit audio), voor "klank volgt instrument". */
  timbre?: string;
}
