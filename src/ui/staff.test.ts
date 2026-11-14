import { describe, expect, it } from 'vitest';
import { scaleOf } from '../core';
import { placeNotes } from './Staff';

describe('noten op de notenbalk', () => {
  it('solsleutel: C majeur loopt op vanaf C4 (hulplijn onder de balk)', () => {
    // trap 0 = onderste lijn (E4): C4 = -2, D4 = -1, E4 = 0 … B4 = 4
    expect(placeNotes(scaleOf(0, 1).notes, 'treble')).toEqual([-2, -1, 0, 1, 2, 3, 4]);
  });
  it('fa-sleutel: grondtoon vanaf F2, onderste lijn G2', () => {
    // C3 = trap 3 (tweede tussenruimte), daarna oplopend
    expect(placeNotes(scaleOf(0, 1).notes, 'bass')).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });
  it('een akkoord staat gestapeld in tertsen; voortekens tellen niet als trap', () => {
    const a7 = [{ pc: 9, letter: 5, acc: 0 }, { pc: 1, letter: 0, acc: 1 }, { pc: 4, letter: 2, acc: 0 }, { pc: 7, letter: 4, acc: 0 }];
    expect(placeNotes(a7, 'treble')).toEqual([3, 5, 7, 9]); // A4 C♯5 E5 G5
  });
  it('C♭ en B♯ krijgen het juiste octaaf', () => {
    expect(placeNotes([{ pc: 11, letter: 0, acc: -1 }], 'treble')).toEqual([5]); // C♭5 (klinkt als B4)
    expect(placeNotes([{ pc: 0, letter: 6, acc: 1 }], 'treble')).toEqual([-3]); // B♯3 (klinkt als C4)
  });
});
