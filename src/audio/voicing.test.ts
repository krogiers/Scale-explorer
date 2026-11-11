import { describe, expect, it } from 'vitest';
import { chordsOf, scaleOf } from '../core';
import { chordEvents, compareEvents, scaleEvents } from './events';
import { progressionVoicings, voiceLead, voicing } from './voicing';

const c7 = chordsOf(scaleOf(0, 1), 4); // C Ionisch, vierklanken
const [cmaj7, dm7, , , g7] = c7;
const pcsOf = (notes: number[]) => new Set(notes.map((m) => m % 12));

describe('liggingen', () => {
  it('speelt een losse klik in grondligging met de grondtoon in de bas', () => {
    expect(voicing(dm7)).toEqual([38, 50, 53, 57, 60]); // D | D F A C
  });
  it('gebruikt in elke ligging precies de akkoordtonen, met de grondtoon in de bas', () => {
    for (const c of c7) {
      const v = voiceLead(null, c);
      expect(v[0] % 12).toBe(c.root.pc);
      expect(pcsOf(v.slice(1))).toEqual(c.pcs);
      expect(v).toHaveLength(5);
    }
  });
  it('laat in ii–V–I elke stem hooguit een toon bewegen', () => {
    const [a, b, c] = progressionVoicings([dm7, g7, cmaj7]).map((v) => v.slice(1));
    for (const [x, y] of [[a, b], [b, c]]) {
      x.forEach((m, i) => expect(Math.abs(m - y[i])).toBeLessThanOrEqual(2));
    }
  });
  it('blijft in hetzelfde register, ook na veel akkoorden', () => {
    const long = Array.from({ length: 24 }, (_, i) => c7[(i * 3) % 7]); // kwintval rond en rond
    for (const v of progressionVoicings(long)) {
      expect(v[1]).toBeGreaterThanOrEqual(47);
      expect(v[1]).toBeLessThanOrEqual(59);
    }
  });
});

describe('hoor het verschil', () => {
  it('C Ionisch → C Lydisch: beide ladders, F en F♯ langer, en daarna F, F♯, F, F♯', () => {
    const ev = compareEvents(scaleOf(0, 1), scaleOf(0, 0));
    const long = ev.filter((e) => e[3] !== 'bass' && e[2] > 0.6 && e[0] >= 60 && e[0] < 72).map((e) => e[0] % 12);
    expect(long.slice(0, 2)).toEqual([5, 6]);
    const tail = ev.slice(-4).map((e) => e[0] % 12);
    expect(tail).toEqual([5, 6, 5, 6]);
    expect(ev.filter((e) => e[3] === 'bass').every((e) => e[0] === 36)).toBe(true);
  });
  it('relatief (zelfde noten): geen wisselnoten, de bas verschuift naar het nieuwe thuis', () => {
    const ev = compareEvents(scaleOf(0, 1), scaleOf(9, 4)); // C Ionisch → A Aeolisch
    expect(new Set(ev.filter((e) => e[3] === 'bass').map((e) => e[0]))).toEqual(new Set([36, 45]));
  });
  it('de ladders in de melodieklank, het orgelpunt (kwint) in de akkoordklank, de grondtoon in de bas', () => {
    const ev = compareEvents(scaleOf(0, 1), scaleOf(0, 0));
    expect(ev.filter((e) => e[0] >= 60).every((e) => e[3] === 'lead')).toBe(true);
    expect(ev.filter((e) => e[3] === undefined).every((e) => e[0] === 55)).toBe(true);
  });
  it('een toonladder speelt in de melodieklank, een akkoord in de akkoordklank', () => {
    expect(scaleEvents(scaleOf(2, 3)).every((e) => e[3] === 'lead')).toBe(true);
    expect(chordEvents(chordsOf(scaleOf(0, 1), 3)[0]).map((e) => e[3] ?? 'keys')).toEqual(['bass', 'keys', 'keys', 'keys']);
  });
});
