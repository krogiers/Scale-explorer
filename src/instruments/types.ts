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
  /** Oefenmodus: de brugnoten, nieuw ten opzichte van de andere modus (bv. F♯ als je van Ionisch naar Lydisch gaat). */
  bridge?: Set<PitchClass>;
  /** Oefenmodus: de noten van de andere modus die nu niet gelden (bv. F), gestreept erbij als geheugensteun. */
  dropped?: Note[];
  names: Names;
  label: string;
}

export interface Instrument {
  id: string;
  component: ComponentType<InstrumentView>;
  /** Gebruikelijke stemming: halve tonen dat de geschreven noot boven de klinkende ligt (B♭-instrumenten: 2). */
  transpose?: number;
  /** Welke uitleg bij de grepen hoort, als die gedeeld wordt (de vier saxen: 'sax'); anders de id. */
  help?: string;
}
