import { describe, expect, it } from 'vitest';
import { bridge, CHAR_CHORD_DEGREE, CHAR_DEGREE, chordsOf, chordsOnRoot, diffCount, parentOf, rootAt, route, scaleOf, type ModeIndex, type Spot } from '.';

const all: Spot[] = Array.from({ length: 84 }, (_, i) => ({ root: i % 12, mode: Math.floor(i / 12) as ModeIndex }));

describe('rooster van de modi', () => {
  it('vindt de moederladder: D Dorisch en G Mixolydisch horen bij C, E Frygisch ook', () => {
    expect(parentOf({ root: 2, mode: 3 })).toBe(0);
    expect(parentOf({ root: 7, mode: 2 })).toBe(0);
    expect(parentOf({ root: 4, mode: 5 })).toBe(0);
    expect(parentOf({ root: 2, mode: 1 })).toBe(2); // D majeur: twee kwinten verder
    for (const s of all) expect(rootAt(parentOf(s), s.mode)).toBe(s.root);
  });
  it('één rij verder in het rooster is precies één noot anders', () => {
    for (const s of all) {
      const k = parentOf(s);
      for (let m = 0; m < 7; m++) expect(diffCount(s, { root: rootAt(k + 1, m as ModeIndex), mode: m as ModeIndex })).toBe(1);
    }
  });
});

describe('bruggen', () => {
  it('buurmodi delen 4 drieklanken of 3 vierklanken; de rest bevat de nieuwe noot', () => {
    const ion = { root: 0, mode: 1 as ModeIndex }, mix = { root: 0, mode: 2 as ModeIndex };
    const b3 = bridge(ion, mix, 3), b4 = bridge(ion, mix, 4);
    expect([b3.kind, b3.shared.length, b3.fresh.length, b3.gone.length]).toEqual(['parallel', 4, 3, 3]);
    expect(b4.shared).toHaveLength(3);
    expect(b3.newNotes.map((n) => n.pc)).toEqual([10]); // B♭
    for (const c of b3.fresh) expect(c.pcs.has(10)).toBe(true);
  });
  it('relatief: alle akkoorden gedeeld, alleen het thuis verschuift', () => {
    const b = bridge({ root: 0, mode: 1 }, { root: 9, mode: 4 }, 3);
    expect([b.kind, b.shared.length, b.fresh.length, b.tonic.key]).toEqual(['relative', 7, 0, '9:min']);
  });
  it('het kenmerkende akkoord bevat de kenmerkende noot', () => {
    for (let m = 0; m < 7; m++) {
      const s = scaleOf(0, m as ModeIndex);
      expect(chordsOf(s, 3)[CHAR_CHORD_DEGREE[m]].pcs.has(s.notes[CHAR_DEGREE[m]].pc)).toBe(true);
    }
  });
});

describe('route', () => {
  it('neemt één noot per stap, zo veel stappen als de kwintafstand', () => {
    const from = { root: 2, mode: 3 as ModeIndex }, to = { root: 3, mode: 3 as ModeIndex }; // So What: D → E♭ Dorisch
    const r = route(from, to, 3);
    expect(r).toHaveLength(5);
    for (const s of r) expect(diffCount(s.from, s.to)).toBe(1);
    expect(r[r.length - 1].to).toEqual(to);
  });
  it('eindigt met een relatieve stap als alleen het thuis nog verschilt', () => {
    const r = route({ root: 0, mode: 1 }, { root: 9, mode: 4 }, 3);
    expect(r).toHaveLength(1);
    expect([r[0].bridge.kind, r[0].pivot]).toEqual(['relative', null]);
  });
  it('kiest bij elke stap een brug en een sprong met de nieuwe noot', () => {
    for (const s of route({ root: 0, mode: 1 }, { root: 0, mode: 5 }, 3)) {
      expect(s.signal && s.bridge.fresh.some((c) => c.key === s.signal!.key)).toBe(true);
      expect(s.pivot && s.bridge.shared.some((c) => c.key === s.pivot!.key)).toBe(true);
    }
  });
});

describe('brugmatrix', () => {
  it('telt 25 drieklanken en 31 vierklanken per grondtoon, elk in hoogstens 3 aaneengesloten modi', () => {
    for (let r = 0; r < 12; r++) {
      expect(chordsOnRoot(r, 3)).toHaveLength(25);
      expect(chordsOnRoot(r, 4)).toHaveLength(31);
      for (const row of chordsOnRoot(r, 3)) {
        expect(row.modes.length).toBeLessThanOrEqual(3);
        expect(row.modes[row.modes.length - 1] - row.modes[0]).toBe(row.modes.length - 1);
      }
    }
  });
});
