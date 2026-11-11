import { describe, expect, it } from 'vitest';
import { playOrder, repeatSpans, validMarks, type RepeatMarks } from './repeats';
import { reducer } from './reducer';
import { validChart } from './persist';
import type { PathEntry, State } from './model';

const m = (...marks: RepeatMarks[]) => marks;

describe('herhalingen', () => {
  it('zonder tekens: gewoon van voor naar achter', () => {
    expect(playOrder(m({}, {}, {}))).toEqual([0, 1, 2]);
  });
  it('‖: … :‖ ×2 speelt het stuk twee keer, de rest één keer', () => {
    expect(playOrder(m({}, { repStart: true }, { repEnd: 2 }, {}))).toEqual([0, 1, 2, 1, 2, 3]);
  });
  it('×3 en ×4', () => {
    expect(playOrder(m({ repStart: true }, { repEnd: 3 }))).toEqual([0, 1, 0, 1, 0, 1]);
    expect(playOrder(m({ repStart: true, repEnd: 4 }))).toEqual([0, 0, 0, 0]);
  });
  it('een einde zonder begin herhaalt vanaf het begin, of vanaf het vorige einde', () => {
    expect(playOrder(m({}, { repEnd: 2 }, {}))).toEqual([0, 1, 0, 1, 2]);
    expect(playOrder(m({ repEnd: 2 }, {}, { repEnd: 2 }))).toEqual([0, 0, 1, 2, 1, 2]);
  });
  it('een begin zonder einde doet niets; een tweede begin binnen een open herhaling telt niet', () => {
    expect(playOrder(m({}, { repStart: true }, {}))).toEqual([0, 1, 2]);
    expect(repeatSpans(m({ repStart: true }, { repStart: true }, { repEnd: 2 }))).toEqual([{ start: 0, end: 2, times: 2 }]);
  });
  it('volta 1 en 2: eerste en tweede eindigen', () => {
    // ‖: A B |1. C :‖ |2. D
    expect(playOrder(m({ repStart: true }, {}, { volta: 1, repEnd: 2 }, { volta: 2 }))).toEqual([0, 1, 2, 0, 1, 3]);
    // ×3: volta 1 in doorgang 1 en 2, volta 2 binnen de herhaling alleen in de laatste
    expect(playOrder(m({ repStart: true }, { volta: 1 }, { volta: 2, repEnd: 3 }))).toEqual([0, 1, 0, 1, 0, 2]);
  });
  it('alleen volta 2 in een herhaling: speelt enkel in de laatste doorgang', () => {
    expect(playOrder(m({ volta: 2, repStart: true }, { volta: 2, repEnd: 2 }))).toEqual([0, 1]);
  });
  it('validMarks laat onzin weg', () => {
    expect(validMarks({ repStart: 'ja', repEnd: 5, volta: 3 })).toEqual({});
    expect(validMarks({ repStart: true, repEnd: 2, volta: 1 })).toEqual({ repStart: true, repEnd: 2, volta: 1 });
  });
  it('opgeslagen schema: tekens blijven, foute tekens vallen weg, het schema blijft geldig', () => {
    const c = validChart([{ root: 0, mode: 1, degree: 0, beats: 4, size: 3, repStart: true, repEnd: 9 }]);
    expect(c).toEqual([{ root: 0, mode: 1, degree: 0, beats: 4, size: 3, repStart: true }]);
  });
});

const e = (degree: number, marks: RepeatMarks = {}): PathEntry => ({ root: 0, mode: 1, degree, beats: 4, size: 3, ...marks });
const st = (path: PathEntry[]) => ({ root: 0, mode: 1, degree: 0, size: 3, meter: 4, bpm: 90, path, focus: 0, cursor: path.length, history: [] }) as unknown as State;

describe('herhaaltekens in de reducer', () => {
  it('setMarks zet en wist tekens, en is terug te draaien', () => {
    let s = reducer(st([e(0), e(1)]), { type: 'setMarks', index: 1, marks: { repEnd: 2 } });
    expect(s.path[1].repEnd).toBe(2);
    s = reducer(s, { type: 'setMarks', index: 1, marks: { volta: 1 } });
    expect(s.path[1]).toMatchObject({ repEnd: 2, volta: 1 });
    s = reducer(s, { type: 'setMarks', index: 1, marks: { repEnd: undefined } });
    expect('repEnd' in s.path[1]).toBe(false);
    expect(reducer(s, { type: 'undo' }).path[1].repEnd).toBe(2);
  });
  it('niets veranderd: geen stap voor ongedaan maken', () => {
    const s = st([e(0, { repStart: true })]);
    expect(reducer(s, { type: 'setMarks', index: 0, marks: { repStart: true } })).toBe(s);
  });
  it('verwijderen: een begin schuift naar het volgende akkoord, een einde naar het vorige', () => {
    const s = st([e(0), e(1, { repStart: true }), e(2), e(3, { repEnd: 3 }), e(4)]);
    const a = reducer(s, { type: 'removeAt', index: 1 });
    expect(a.path.map((p) => p.degree)).toEqual([0, 2, 3, 4]);
    expect(a.path[1].repStart).toBe(true);
    const b = reducer(s, { type: 'removeAt', index: 3 });
    expect(b.path[2]).toMatchObject({ degree: 2, repEnd: 3 });
  });
  it('verslepen neemt de tekens mee, kopiëren niet', () => {
    const s = st([e(0, { repStart: true }), e(1), e(2)]);
    expect(reducer(s, { type: 'movePath', from: 0, to: 2, copy: false }).path[1]).toMatchObject({ degree: 0, repStart: true });
    const c = reducer(s, { type: 'movePath', from: 0, to: 3, copy: true }).path;
    expect(c[3].degree).toBe(0);
    expect(c[3].repStart).toBeUndefined();
  });
});
