import { describe, expect, it } from 'vitest';
import { chordsOf, scaleOf } from '../core';
import { sheetBars, splitDur } from './sheetLayout';

const C = scaleOf(0, 1);
const step = (degree: number, beats = 4) => ({ scale: C, chord: chordsOf(C, 3)[degree], beats });

describe('leadsheet: notenwaarden', () => {
  it('schrijft gewone waarden zoals op papier', () => {
    expect(splitDur(0, 1.5, 4)).toEqual([1.5]); // kwart met punt op de tel
    expect(splitDur(1, 3, 4)).toEqual([1, 2]); // vanaf tel 2: kwart + halve (overgebonden)
    expect(splitDur(0, 4, 4)).toEqual([4]);
    expect(splitDur(0, 3, 3)).toEqual([3]); // halve met punt in 3/4
    expect(splitDur(0, 1.5, 4, true)).toEqual([1, 0.5]); // rusten zonder punt
  });
  it('vult gaten met rusten en zet akkoorden op hun tel', () => {
    const bars = sheetBars([step(0, 2), step(4, 2)], [[{ at: 1, dur: 1, midi: 64 }], [{ at: 0, dur: 2, midi: 67 }]], 4);
    expect(bars).toHaveLength(1);
    expect(bars[0].events.map((e) => [e.at, e.dur, e.rest])).toEqual([[0, 1, true], [1, 1, false], [2, 2, false]]);
    expect(bars[0].chords.map((c) => c.at)).toEqual([0, 2]);
    expect(bars[0].events[1].note).toEqual({ pc: 4, letter: 2, acc: 0 });
  });
  it('een lege maat is één hele rust; hetzelfde akkoord twee keer staat er één keer', () => {
    const bars = sheetBars([step(0), step(0)], [[{ at: 0, dur: 4, midi: 60 }], []], 4);
    expect(bars[1].events).toMatchObject([{ at: 0, dur: 4, rest: true }]);
    expect(bars[1].chords).toEqual([]);
  });
  it('een noot over de maatstreep wordt overgebonden', () => {
    const bars = sheetBars([step(0, 8)], [[{ at: 2, dur: 4, midi: 60 }, { at: 6, dur: 2, midi: 62 }]], 4);
    expect(bars[0].events.at(-1)).toMatchObject({ at: 2, dur: 2, tie: true });
    expect(bars[1].events[0]).toMatchObject({ at: 0, dur: 2 });
    expect(bars[1].events[0].tie).toBeUndefined();
  });
});
