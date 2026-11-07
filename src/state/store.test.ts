import { describe, expect, it } from 'vitest';
import { clampBpm, MAX_CHORDS, reducer, validChart, type State } from '.';

const base: State = { root: 0, mode: 1, degree: 0, size: 3, lang: 'nl', namer: 'en', instrument: 'piano', saxKey: 'Eb', sound: false, timbre: 'piano', showBlue: true, showPenta: false, meter: 4, bpm: 90, focus: 0, history: [], path: [{ root: 0, mode: 1, degree: 0, beats: 4, size: 3 }] };

describe('opgeslagen gegevens', () => {
  it('neemt een geldig schema over', () => {
    expect(validChart([{ root: 2, mode: 3, degree: 0, beats: 4, size: 4 }])).toEqual([{ root: 2, mode: 3, degree: 0, beats: 4, size: 4 }]);
  });
  it('geeft oudere schema\'s zonder grootte de grootte uit de voorkeuren', () => {
    expect(validChart([{ root: 2, mode: 3, degree: 0, beats: 4 }], 4)?.[0].size).toBe(4);
    expect(validChart([{ root: 2, mode: 3, degree: 0, beats: 4, size: 5 }])).toBeNull();
  });
  it('weigert een schema met waarden buiten bereik', () => {
    expect(validChart([{ root: 2, mode: 9, degree: 0, beats: 4 }])).toBeNull();
    expect(validChart([{ root: 12, mode: 1, degree: 0, beats: 4 }])).toBeNull();
    expect(validChart([{ root: 0, mode: 1, degree: 7, beats: 4 }])).toBeNull();
    expect(validChart([{ root: 0, mode: 1, degree: 0, beats: 0 }])).toBeNull();
    expect(validChart([null])).toBeNull();
    expect(validChart('rommel')).toBeNull();
    expect(validChart([])).toBeNull();
  });
  it('houdt het tempo binnen het bereik', () => {
    expect(clampBpm(120)).toBe(120);
    expect(clampBpm(500)).toBe(220);
    expect(clampBpm(5)).toBe(40);
    expect(clampBpm(Number.NaN)).toBe(90);
    expect(clampBpm('snel')).toBe(90);
    expect(reducer(base, { type: 'settings', patch: { bpm: 999 } }).bpm).toBe(220);
  });
});

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
  it('voegt een akkoord in na het geselecteerde, niet achteraan', () => {
    let s = reducer(base, { type: 'select', degree: 3 }); // C, F
    s = reducer(s, { type: 'select', degree: 4 }); // C, F, G
    s = reducer(s, { type: 'focusPath', index: 0 });
    s = reducer(s, { type: 'select', degree: 5 }); // C, Am, F, G
    expect(s.path.map((p) => p.degree)).toEqual([0, 5, 3, 4]);
    expect(s.focus).toBe(1);
  });
  it('voegt niets toe als het schema vol is', () => {
    const full = { ...base, path: Array.from({ length: MAX_CHORDS }, (_, i) => ({ ...base.path[0], degree: i % 7 })), focus: 0 };
    expect(reducer(full, { type: 'select', degree: 3 }).path).toHaveLength(MAX_CHORDS);
  });
  it('maakt wijzigingen aan het schema ongedaan', () => {
    let s = reducer(base, { type: 'select', degree: 3 });
    s = reducer(s, { type: 'setBeats', index: 1, beats: 8 });
    s = reducer(s, { type: 'clearPath' });
    expect(s.path).toHaveLength(1);
    s = reducer(s, { type: 'undo' });
    expect(s.path.map((p) => p.beats)).toEqual([4, 8]);
    s = reducer(reducer(s, { type: 'undo' }), { type: 'undo' });
    expect(s.path).toEqual(base.path);
    expect(reducer(s, { type: 'undo' })).toBe(s);
  });
  it('bewaart drie- of vierklank per akkoord', () => {
    let s = reducer({ ...base, size: 4 }, { type: 'select', degree: 4 });
    expect(s.path.map((p) => p.size)).toEqual([3, 4]);
    s = reducer(s, { type: 'setSize', index: 0, size: 4 });
    expect(s.path[0].size).toBe(4);
    s = reducer(s, { type: 'focusPath', index: 0 });
    expect(s.size).toBe(4);
  });
});

describe('sequentie invoegen', () => {
  const seq = [{ root: 2, mode: 3 as const, degree: 0, beats: 4, size: 4 as const }, { root: 7, mode: 2 as const, degree: 0, beats: 4, size: 4 as const }];
  it('voegt in na het geselecteerde akkoord en selecteert het eerste nieuwe', () => {
    const s = reducer(base, { type: 'insertPath', entries: seq, replace: false });
    expect(s.path.map((p) => p.root)).toEqual([0, 2, 7]);
    expect([s.focus, s.root, s.mode]).toEqual([1, 2, 3]);
  });
  it('vervangt het schema, en één keer ongedaan maken zet alles terug', () => {
    const s = reducer(base, { type: 'insertPath', entries: seq, replace: true });
    expect(s.path.map((p) => p.root)).toEqual([2, 7]);
    expect(reducer(s, { type: 'undo' }).path).toEqual(base.path);
  });
});

describe('akkoord verplaatsen', () => {
  const four: State = { ...base, path: [0, 2, 4, 5].map((root) => ({ root, mode: 1 as const, degree: 0, beats: 4, size: 3 as const })) };
  const roots = (s: State) => s.path.map((p) => p.root);
  it('verplaatst naar achteren en naar voren, en selecteert het verplaatste akkoord', () => {
    const back = reducer(four, { type: 'movePath', from: 0, to: 3, copy: false });
    expect(roots(back)).toEqual([2, 4, 0, 5]);
    expect([back.focus, back.root]).toEqual([2, 0]);
    expect(roots(reducer(four, { type: 'movePath', from: 3, to: 0, copy: false }))).toEqual([5, 0, 2, 4]);
    expect(roots(reducer(four, { type: 'movePath', from: 1, to: 4, copy: false }))).toEqual([0, 4, 5, 2]);
  });
  it('laat alles staan bij de opening vlak voor of na het akkoord zelf', () => {
    expect(reducer(four, { type: 'movePath', from: 1, to: 1, copy: false })).toBe(four);
    expect(reducer(four, { type: 'movePath', from: 1, to: 2, copy: false })).toBe(four);
  });
  it('kopieert met de duur erbij, en één keer ongedaan maken zet alles terug', () => {
    const c = reducer({ ...four, path: four.path.map((p, i) => (i === 1 ? { ...p, beats: 2 } : p)) }, { type: 'movePath', from: 1, to: 4, copy: true });
    expect(roots(c)).toEqual([0, 2, 4, 5, 2]);
    expect(c.path[4].beats).toBe(2);
    expect(c.focus).toBe(4);
    expect(roots(reducer(c, { type: 'undo' }))).toEqual([0, 2, 4, 5]);
  });
});
