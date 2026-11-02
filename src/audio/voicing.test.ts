import { describe, expect, it } from 'vitest';
import { chordsOf, scaleOf } from '../core/theory';
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
