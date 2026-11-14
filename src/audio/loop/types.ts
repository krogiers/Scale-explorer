import type { Part } from '../types';

export const LOOP_STYLES = ['comp', 'sustain', 'swing', 'shuffle', 'bossa', 'funk'] as const;
export type LoopStyle = (typeof LOOP_STYLES)[number];
export interface LoopOptions {
  bpm: number;
  metronome: boolean;
  /** Drums die bij de stijl horen (opgewekt in de code, geen opnames). */
  drums: boolean;
  style: LoopStyle;
  countIn: boolean;
  /** Tellen per maat, voor het aftellen en het accent van de metronoom. */
  meter: number;
  /** Een verzonnen melodie meespelen (in de melodieklank). */
  melody?: boolean;
}
/** Een melodienoot: begin en duur in tellen vanaf het begin van het akkoord. */
export interface LoopMelodyNote { at: number; dur: number; midi: number }
/** Eén akkoord in de loop: zijn ligging (bas eerst), duur in tellen, en eventueel een melodie (partij lead). */
export interface TimelineItem { voicing: number[]; beats: number; melody?: LoopMelodyNote[] }
/** Wat er op een tel gebeurt; chord = -1 tijdens het aftellen. */
export interface BeatInfo { chord: number; beat: number; beats: number }

/** Wat er op één tel te spelen valt, los van de geluidskaart (zodat het te testen is). */
export interface PlannedNote { midi: number; offset: number; duration: number; vel: number; part: Part }
