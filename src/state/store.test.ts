import { describe, expect, it } from 'vitest';
import { reducer, type State } from './store';

const base: State = { root: 0, mode: 1, degree: 0, size: 3, lang: 'nl', namer: 'en', instrument: 'piano', sound: false, timbre: 'piano', showBlue: true, meter: 4, focus: 0, path: [{ root: 0, mode: 1, degree: 0, beats: 4 }] };

describe('navigatie in de toestand', () => {
  it('voegt gekozen akkoorden toe aan de progressie', () => {
    const s = reducer(reducer(base, { type: 'select', degree: 5 }), { type: 'select', degree: 1 });
    expect(s.path.map((p) => p.degree)).toEqual([0, 5, 1]);
  });
  it('houdt bij een relatieve modus hetzelfde akkoord vast', () => {
    const s = reducer({ ...base, degree: 1 }, { type: 'relative', root: 2, mode: 3 }); // Dm in C -> D Dorisch
    expect(s.degree).toBe(0);
  });
  it('springt naar een akkoord in het schema zonder de rest te wissen', () => {
    let s = reducer(base, { type: 'go', to: { root: 7, mode: 1, degree: 4 } });
    s = reducer(s, { type: 'select', degree: 0 });
    s = reducer(s, { type: 'focusPath', index: 1 });
    expect(s.path.length).toBe(3);
    expect([s.root, s.degree, s.focus]).toEqual([7, 4, 1]);
  });
  it('geeft nieuwe akkoorden een volle maat en laat de duur aanpassen', () => {
    let s = reducer({ ...base, meter: 3 }, { type: 'select', degree: 3 });
    expect(s.path[1].beats).toBe(3);
    s = reducer(s, { type: 'setBeats', index: 1, beats: 8 });
    expect(s.path[1].beats).toBe(8);
  });
  it('verwijdert een akkoord maar nooit het laatste', () => {
    let s = reducer(base, { type: 'select', degree: 3 });
    s = reducer(s, { type: 'removeAt', index: 0 });
    expect(s.path.map((p) => p.degree)).toEqual([3]);
    expect(reducer(s, { type: 'removeAt', index: 0 }).path.length).toBe(1);
  });
});
