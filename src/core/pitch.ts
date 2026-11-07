/** Toonklassen en gespelde noten. Rekent alleen met getallen (0 = C ... 11 = B) en lettertrappen. */

export type PitchClass = number; // 0..11
/** Een gespelde noot: letter 0..6 (C D E F G A B) plus verhoging (+) of verlaging (-). */
export interface Note {
  pc: PitchClass;
  letter: number;
  acc: number;
}

export const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

export const mod12 = (n: number) => ((n % 12) + 12) % 12;
/** Positie op de kwintencirkel: C = 0, G = 1, D = 2 ... */
export const fifthsIndex = (pc: PitchClass) => mod12(pc * 7);
export const pcFromFifths = (f: number) => mod12(f * 7);

/** Voorteken om toonklasse pc op deze letter te spellen (-2 tot +2, enz.). */
export function accidentalFor(pc: PitchClass, letter: number): number {
  let a = mod12(pc - LETTER_PC[letter]);
  if (a > 6) a -= 12;
  return a;
}
