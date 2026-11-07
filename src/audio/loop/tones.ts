import type { TimelineItem } from './types';

/** Bastonen: R = grondtoon, 5 = kwint, O = octaaf, 7 = septiem (of octaaf), W = walking bass,
 * B = boogie (1 3 5 6 ♭7 6 5 3), A = aanloop naar het volgende akkoord op de laatste tel ervan. */
export type Tone = 'R' | '5' | 'O' | '7' | 'W' | 'B' | 'A';

/** Toon van het akkoord in de bas, als interval in halve tonen boven de grondtoon (undefined als het er niet in zit). */
export function interval(bass: number, upper: number[], options: number[]): number | undefined {
  const ivs = upper.map((m) => (((m - bass) % 12) + 12) % 12);
  return options.find((i) => ivs.includes(i));
}

export function bassTone(tone: Tone, item: TimelineItem, beatInChord: number, next?: TimelineItem): number {
  const [bass, ...upper] = item.voicing;
  const fifth = fifthAbove(bass, upper);
  const seventh = interval(bass, upper, [10, 11, 9]);
  const last = !!next && beatInChord === item.beats - 1 && item.beats > 1;
  switch (tone) {
    case 'R': return bass;
    case '5': return fifth;
    case 'O': return bass + 12;
    case '7': return seventh === undefined ? bass + 12 : bass + seventh;
    case 'A': return last ? near(next!.voicing[0], bass) : bass;
    case 'W': {
      // grondtoon, terts, kwint, septiem; op de laatste tel een halve toon naast de volgende grondtoon
      if (last) {
        const target = near(next!.voicing[0], bass);
        return target >= bass ? target - 1 : target + 1;
      }
      const third = interval(bass, upper, [3, 4]) ?? 2;
      return [bass, bass + third, fifth, seventh === undefined ? bass + 12 : bass + seventh][beatInChord % 4];
    }
    case 'B': {
      // boogie: alleen bij een reine kwint; anders (verminderd, overmatig) loopt hij de akkoordtonen
      const third = interval(bass, upper, [4, 3]) ?? 4;
      const sev = interval(bass, upper, [11]) ?? 10;
      if (fifth - bass !== 7) return [bass, bass + third, fifth, bass + third][Math.floor(beatInChord) % 4];
      return bass + [0, third, 7, 9, sev, 9, 7, third][beatInChord % 8];
    }
  }
}

/** Dezelfde toonklasse als m, in het octaaf het dichtst bij ref. */
export function near(m: number, ref: number): number {
  while (m - ref > 6) m -= 12;
  while (ref - m > 6) m += 12;
  return m;
}

/**
 * De echte kwint van het akkoord (rein, verminderd of overmatig), net boven de bas.
 * We zoeken hem op interval, want door de stemvoering staat hij niet op een vaste plaats.
 */
export function fifthAbove(bass: number, upper: number[]): number {
  let fifth = upper.find((m) => [6, 7, 8].includes((((m - bass) % 12) + 12) % 12));
  if (fifth === undefined) return bass + 7;
  while (fifth > bass + 11) fifth -= 12;
  while (fifth <= bass) fifth += 12;
  return fifth;
}
