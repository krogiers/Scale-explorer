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
}
/** Eén akkoord in de loop: zijn ligging (bas eerst) en duur in tellen. */
export interface TimelineItem { voicing: number[]; beats: number }
/** Wat er op een tel gebeurt; chord = -1 tijdens het aftellen. */
export interface BeatInfo { chord: number; beat: number; beats: number }

/** Wat er op één tel te spelen valt, los van de geluidskaart (zodat het te testen is). */
export interface PlannedNote { midi: number; offset: number; duration: number; vel: number; part: Part }
