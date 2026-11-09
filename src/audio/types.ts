import type { Mix } from './mix';

/**
 * Interface: geluid. De rest van de app vraagt alleen "speel deze MIDI-noten op deze tijden".
 * De implementatie zit in engine/.
 */
export type Part = 'bass' | 'keys';
/** Drumklanken voor de loop, opgewekt met oscillatoren en ruis. pedal = hihat met de voet. */
export type Drum = 'kick' | 'snare' | 'hat' | 'pedal' | 'ride' | 'rim';
/** [MIDI-noot, start in seconden vanaf nu, duur in seconden, partij] */
export type NoteEvent = [midi: number, at: number, duration: number, part?: Part];
export const TIMBRES = ['piano', 'rhodes', 'synth', 'strings', 'cello', 'organ', 'vibes', 'clarinet', 'trumpet', 'flute', 'sax', 'guitar'] as const;
export type Timbre = (typeof TIMBRES)[number];

export interface AudioEngine {
  /** Speel noten direct, relatief ten opzichte van nu. */
  play(events: NoteEvent[]): void;
  /** Ingelost als de opnames van de gekozen klank geladen zijn (start zo nodig de geluidskaart). */
  ready(): Promise<void>;
  /** Klok van de geluidskaart in seconden (null als er geen geluid beschikbaar is). Start de klok zo nodig. */
  now(): number | null;
  /** Plan één noot op een absoluut tijdstip van die klok; vel is de sterkte (0 tot 1). */
  noteAt(midi: number, time: number, duration: number, vel?: number, part?: Part): void;
  /** Metronoomtik; accent = eerste tel. */
  clickAt(time: number, accent: boolean): void;
  /** Eén drumslag op een absoluut tijdstip; vel is de sterkte (0 tot 1). */
  drumAt(time: number, kind: Drum, vel?: number): void;
  /** Alles wat klinkt of al gepland is kort laten uitdoven en stilzetten. */
  stopAll(): void;
  /** Kies de klank; de belofte is ingelost zodra de opnames ervan klaar zijn. */
  setTimbre(t: Timbre): Promise<void>;
  /** Het mengpaneel: volume en links/rechts per kanaal, stil en solo. */
  setMix(mix: Mix): void;
}
