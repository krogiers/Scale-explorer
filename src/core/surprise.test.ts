import { describe, expect, it } from 'vitest';
import { chordsOf } from './chords';
import { scaleOf, type ModeIndex } from './scale';
import { cadenceDegree, seededRng, surprise } from './surprise';

const key = (d: { root: number; mode: ModeIndex; degree: number }) => chordsOf(scaleOf(d.root, d.mode), 4)[d.degree].key;

describe('Verras me', () => {
  it('heeft het gevraagde aantal akkoorden, begint en eindigt op de tonica, met de cadens ervoor', () => {
    for (const n of [3, 4, 8, 12, 16]) for (let m = 0; m < 7; m++) for (let seed = 1; seed <= 20; seed++) {
      const home = { root: 2, mode: m as ModeIndex };
      const s = surprise(home, 4, n, seededRng(seed));
      expect(s).toHaveLength(n);
      expect(s[0]).toEqual({ ...home, degree: 0 });
      expect(s[n - 1]).toEqual({ ...home, degree: 0 });
      expect(s[n - 2]).toEqual({ ...home, degree: cadenceDegree(home.mode) });
      // nooit twee keer hetzelfde akkoord na elkaar; alles op dezelfde grondtoon (eigen ladder of een leenakkoord)
      for (let i = 1; i < n; i++) expect(key(s[i])).not.toBe(key(s[i - 1]));
      expect(s.every((d) => d.root === home.root)).toBe(true);
    }
  });
  it('hetzelfde zaad geeft hetzelfde schema, een ander zaad (meestal) een ander', () => {
    const home = { root: 0, mode: 1 as ModeIndex };
    expect(surprise(home, 3, 8, seededRng(7))).toEqual(surprise(home, 3, 8, seededRng(7)));
    const all = new Set(Array.from({ length: 10 }, (_, k) => JSON.stringify(surprise(home, 3, 8, seededRng(k + 1)))));
    expect(all.size).toBeGreaterThan(5);
  });
  it('kwintval komt vaker voor dan kwint omhoog', () => {
    let down = 0, up = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = surprise({ root: 0, mode: 1 }, 3, 12, seededRng(seed));
      for (let i = 1; i < s.length - 2; i++) if (s[i].mode === 1 && s[i - 1].mode === 1) {
        const d = (s[i].degree - s[i - 1].degree + 7) % 7;
        if (d === 3) down++; if (d === 4) up++;
      }
    }
    expect(down).toBeGreaterThan(up * 2);
  });
});

describe('Verras me: verminderde akkoorden zijn zeldzaam', () => {
  it('minder dan 1 op 10 van de akkoorden in het midden', () => {
    let dim = 0, all = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = surprise({ root: 2, mode: 3 }, 3, 12, seededRng(seed));
      for (const d of s.slice(1, -2)) { all++; if (chordsOf(scaleOf(d.root, d.mode), 3)[d.degree].quality === 'dim') dim++; }
    }
    expect(dim / all).toBeLessThan(0.1);
  });
});
