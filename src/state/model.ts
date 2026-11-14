/** Het model van de toestand: wat er in de app gekozen is, en de acties die het veranderen. */
import { chordsOf, scaleOf, type Chord, type ChordSize, type Destination, type ModeIndex } from '../core';
import type { Lang } from '../i18n';
import type { CompTimbre, Mix, Timbre } from '../audio';
import type { RepeatMarks } from './repeats';

export interface Position { root: number; mode: ModeIndex; degree: number }
/** Eén akkoord in het schema: waar het staat, hoeveel tellen het duurt, drie- of vierklank, en eventuele herhaaltekens. */
export interface PathEntry extends Position, RepeatMarks { beats: number; size: ChordSize }
export const chordOf = (p: PathEntry): Chord => chordsOf(scaleOf(p.root, p.mode), p.size)[p.degree];
export type { CompTimbre, Timbre };
export type Theme = 'auto' | 'light' | 'dark';
export interface State extends Position {
  /** Drie- of vierklanken in de akkoordenrij en voor nieuwe akkoorden in het schema. */
  size: ChordSize;
  lang: Lang;
  namer: string;
  /** Stemming: halve tonen dat je partij boven concert staat (0 = C, 2 = B♭, 9 = E♭, …). Alle namen in de app volgen ze. */
  reading: number;
  /** Het instrument op het instrumentpaneel (Spelen): welke grepen je ziet. Bepaalt niet de stemming en niet de klank. */
  instrument: string;
  sound: boolean;
  /** Klank van de akkoorden, overal in de app en in de loop (een begeleidingsinstrument). */
  compTimbre: CompTimbre;
  /** Klank van losse noten: toonladders en vergelijken (bv. je eigen instrument). */
  leadTimbre: Timbre;
  /** Kleurthema: volgt het systeem, of vast licht of donker. */
  theme: Theme;
  /** Mengpaneel: volume, links/rechts, stil en solo per kanaal. */
  mix: Mix;
  /** Blue note (♭5) tonen in de toonladder en op het instrument. */
  showBlue: boolean;
  /** Pentatonisch tonen: de twee noten buiten de pentatonische ladder worden gedimd. */
  showPenta: boolean;
  /** Maatsoort: tellen per maat (4 = 4/4, 3 = 3/4). */
  meter: 3 | 4;
  /** Tempo in tellen per minuut, voor de loop en voor "Speel progressie". */
  bpm: number;
  path: PathEntry[];
  /** Het akkoord in het schema dat nu geselecteerd is (om duur of drie-/vierklank aan te passen); -1 als het schema leeg is. */
  focus: number;
  /** De cursor: de opening waar een nieuw akkoord komt, van 0 (vooraan) tot path.length (achteraan, standaard). */
  cursor: number;
  /** Vorige versies van het schema, voor ongedaan maken (niet bewaard in de browser). */
  history: { path: PathEntry[]; focus: number; cursor: number }[];
}

export type SettingsPatch = Partial<Pick<State, 'size' | 'lang' | 'namer' | 'reading' | 'instrument' | 'sound' | 'compTimbre' | 'leadTimbre' | 'meter' | 'showBlue' | 'showPenta' | 'bpm' | 'theme' | 'mix'>>;

export const BPM_MIN = 40, BPM_MAX = 220;
/** Tempo binnen het bereik van de schuif; onzin (NaN, tekst) wordt het standaardtempo. */
export const clampBpm = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(BPM_MAX, Math.max(BPM_MIN, v))) : 90);

export type Action =
  | { type: 'setRoot'; root: number }
  | { type: 'setMode'; mode: ModeIndex }
  | { type: 'relative'; root: number; mode: ModeIndex }
  /** Een akkoord kiezen (en horen); het schema verandert niet. */
  | { type: 'select'; degree: number }
  /** Naar een akkoord in een andere ladder gaan (kiezen); het schema verandert niet. */
  | { type: 'go'; to: Destination }
  /** Het gekozen akkoord in het schema zetten, op de cursor. */
  | { type: 'add' }
  /** De cursor op een opening zetten: 0 = vooraan, path.length = achteraan. */
  | { type: 'setCursor'; index: number }
  | { type: 'focusPath'; index: number }
  | { type: 'setBeats'; index: number; beats: number }
  | { type: 'setSize'; index: number; size: ChordSize }
  /** Herhaaltekens op een akkoord zetten of weghalen (undefined = weg). */
  | { type: 'setMarks'; index: number; marks: RepeatMarks }
  | { type: 'undo' }
  | { type: 'removeAt'; index: number }
  | { type: 'clearPath' }
  /** Een reeks akkoorden (bv. een sequentie) invoegen op de cursor, of het schema ermee vervangen. */
  | { type: 'insertPath'; entries: PathEntry[]; replace: boolean }
  /** Akkoord `from` verplaatsen (of kopiëren) naar de opening `to`: 0 = vooraan, path.length = achteraan. */
  | { type: 'movePath'; from: number; to: number; copy: boolean }
  | { type: 'setScale'; root: number; mode: ModeIndex }
  | { type: 'settings'; patch: SettingsPatch };
