import { describe, expect, it } from 'vitest';
import { DEFAULT_MIX } from '../audio';
import { clampBpm, MAX_CHORDS, reducer, validChart, type State } from '.';

const base: State = { root: 0, mode: 1, degree: 0, size: 3, lang: 'nl', namer: 'en', instrument: 'piano', sound: false, compTimbre: 'piano', leadTimbre: 'piano', theme: 'auto', mix: DEFAULT_MIX, showBlue: true, showPenta: false, meter: 4, bpm: 90, focus: 0, cursor: 1, history: [], path: [{ root: 0, mode: 1, degree: 0, beats: 4, size: 3 }] };

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
    expect(validChart([])).toBeNull(); // een geïmporteerd schema moet iets bevatten; een leeg bewaard schema laadt apart
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

/** Kiezen en daarna toevoegen (zoals een dubbelklik of de + in de bovenbalk). */
const pick = (s: State, degree: number) => reducer(reducer(s, { type: 'select', degree }), { type: 'add' });
const degrees = (s: State) => s.path.map((p) => p.degree);

describe('navigatie in de toestand', () => {
  it('kiezen verandert het schema niet', () => {
    const s = reducer(reducer(base, { type: 'select', degree: 5 }), { type: 'go', to: { root: 7, mode: 1, degree: 4 } });
    expect(s.path).toBe(base.path);
    expect([s.root, s.degree]).toEqual([7, 4]);
  });
  it('toevoegen zet het gekozen akkoord op de cursor en schuift de cursor erachter', () => {
    const s = pick(pick(base, 5), 1);
    expect(degrees(s)).toEqual([0, 5, 1]);
    expect([s.cursor, s.focus]).toEqual([3, 2]);
  });
  it('houdt bij een relatieve modus hetzelfde akkoord vast', () => {
    const s = reducer({ ...base, degree: 1 }, { type: 'relative', root: 2, mode: 3 }); // Dm in C -> D Dorisch
    expect(s.degree).toBe(0);
  });
  it('springt naar een akkoord in het schema zonder de rest te wissen', () => {
    let s = reducer(reducer(base, { type: 'go', to: { root: 7, mode: 1, degree: 4 } }), { type: 'add' });
    s = pick(s, 0);
    s = reducer(s, { type: 'focusPath', index: 1 });
    expect(s.path.length).toBe(3);
    expect([s.root, s.degree, s.focus]).toEqual([7, 4, 1]);
  });
  it('geeft nieuwe akkoorden een volle maat en laat de duur aanpassen', () => {
    let s = pick({ ...base, meter: 3 }, 3);
    expect(s.path[1].beats).toBe(3);
    s = reducer(s, { type: 'setBeats', index: 1, beats: 8 });
    expect(s.path[1].beats).toBe(8);
  });
  it('verwijdert akkoorden, ook het laatste', () => {
    let s = pick(base, 3);
    s = reducer(s, { type: 'removeAt', index: 0 });
    expect(degrees(s)).toEqual([3]);
    s = reducer(s, { type: 'removeAt', index: 0 });
    expect(s.path).toEqual([]);
    expect([s.focus, s.cursor]).toEqual([-1, 0]);
  });
  it('de cursor bepaalt waar een akkoord komt; selecteren verplaatst hem niet', () => {
    let s = pick(pick(base, 3), 4); // C F G, cursor achteraan
    s = reducer(s, { type: 'focusPath', index: 0 });
    s = pick(s, 5);
    expect(degrees(s)).toEqual([0, 3, 4, 5]);
    s = reducer(s, { type: 'setCursor', index: 1 });
    s = pick(s, 1); // tussen C en F
    expect(degrees(s)).toEqual([0, 1, 3, 4, 5]);
    expect([s.focus, s.cursor]).toEqual([1, 2]);
    s = reducer(s, { type: 'setCursor', index: 0 });
    expect(degrees(pick(s, 6))[0]).toBe(6);
    expect(reducer(s, { type: 'setCursor', index: 99 }).cursor).toBe(5);
  });
  it('verwijderen vóór de cursor houdt de cursor op dezelfde plek in de muziek', () => {
    let s = pick(pick(base, 3), 4); // C F G
    s = reducer(s, { type: 'setCursor', index: 2 }); // tussen F en G
    s = reducer(s, { type: 'removeAt', index: 0 }); // F G
    expect(s.cursor).toBe(1);
  });
  it('voegt niets toe als het schema vol is', () => {
    const full = { ...base, path: Array.from({ length: MAX_CHORDS }, (_, i) => ({ ...base.path[0], degree: i % 7 })), focus: 0, cursor: MAX_CHORDS };
    expect(pick(full, 3).path).toHaveLength(MAX_CHORDS);
  });
  it('leegmaken laat een leeg schema achter, en ongedaan maken zet alles terug', () => {
    let s = pick(base, 3);
    s = reducer(s, { type: 'setBeats', index: 1, beats: 8 });
    s = reducer(s, { type: 'clearPath' });
    expect(s.path).toEqual([]);
    expect([s.focus, s.cursor]).toEqual([-1, 0]);
    s = pick(s, 2);
    expect(degrees(s)).toEqual([2]);
    s = reducer(reducer(s, { type: 'undo' }), { type: 'undo' });
    expect(s.path.map((p) => p.beats)).toEqual([4, 8]);
    expect(s.cursor).toBe(2);
    s = reducer(reducer(s, { type: 'undo' }), { type: 'undo' });
    expect(s.path).toEqual(base.path);
    expect(reducer(s, { type: 'undo' })).toBe(s);
  });
  it('bewaart drie- of vierklank per akkoord', () => {
    let s = pick({ ...base, size: 4 }, 4);
    expect(s.path.map((p) => p.size)).toEqual([3, 4]);
    s = reducer(s, { type: 'setSize', index: 0, size: 4 });
    expect(s.path[0].size).toBe(4);
    s = reducer(s, { type: 'focusPath', index: 0 });
    expect(s.size).toBe(4);
  });
});

describe('sequentie invoegen', () => {
  const seq = [{ root: 2, mode: 3 as const, degree: 0, beats: 4, size: 4 as const }, { root: 7, mode: 2 as const, degree: 0, beats: 4, size: 4 as const }];
  it('voegt in op de cursor, selecteert het eerste nieuwe en zet de cursor erachter', () => {
    const s = reducer({ ...base, cursor: 0 }, { type: 'insertPath', entries: seq, replace: false });
    expect(s.path.map((p) => p.root)).toEqual([2, 7, 0]);
    expect([s.focus, s.root, s.mode, s.cursor]).toEqual([0, 2, 3, 2]);
  });
  it('vervangt het schema, en één keer ongedaan maken zet alles terug', () => {
    const s = reducer(base, { type: 'insertPath', entries: seq, replace: true });
    expect(s.path.map((p) => p.root)).toEqual([2, 7]);
    expect(s.cursor).toBe(2);
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

describe('je instrument en de klank staan los', () => {
  it('een ander instrument verandert de klank niet', () => {
    const s = reducer(base, { type: 'settings', patch: { instrument: 'tenorsax' } });
    expect([s.compTimbre, s.leadTimbre]).toEqual(['piano', 'piano']);
  });
  it('een andere klank verandert het instrument niet, en akkoord- en melodieklank staan los', () => {
    const s = reducer({ ...base, instrument: 'tenorsax' }, { type: 'settings', patch: { compTimbre: 'rhodes' } });
    expect([s.compTimbre, s.leadTimbre, s.instrument]).toEqual(['rhodes', 'piano', 'tenorsax']);
  });
});

describe('bewaarde voorkeuren van vroeger', () => {
  it('de oude sax met stemming wordt tenor- of altsax', async () => {
    const { instrumentFrom } = await import('./persist');
    expect(instrumentFrom({ instrument: 'sax', saxKey: 'Bb' })).toBe('tenorsax');
    expect(instrumentFrom({ instrument: 'sax', saxKey: 'Eb' })).toBe('altsax');
    expect(instrumentFrom({ instrument: 'trumpet' })).toBe('trumpet');
    expect(instrumentFrom({ instrument: 'onbekend' })).toBe('piano');
  });
  it('de oude ene klank: een akkoordinstrument blijft akkoordklank, een blazer wordt melodieklank', async () => {
    const { timbresFrom } = await import('./persist');
    expect(timbresFrom({ timbre: 'rhodes' }, 'tenorsax')).toEqual({ compTimbre: 'rhodes', leadTimbre: 'tenorsax' });
    expect(timbresFrom({ timbre: 'sax' }, 'piano')).toEqual({ compTimbre: 'piano', leadTimbre: 'tenorsax' });
    expect(timbresFrom({ timbre: 'flute' }, 'piano')).toEqual({ compTimbre: 'piano', leadTimbre: 'flute' });
    // zonder keuze: piano voor de akkoorden, je eigen instrument voor de melodie
    expect(timbresFrom({}, 'altsax')).toEqual({ compTimbre: 'piano', leadTimbre: 'altsax' });
    // een blazer als akkoordklank is niet toegelaten
    expect(timbresFrom({ compTimbre: 'tenorsax', leadTimbre: 'onzin' }, 'piano')).toEqual({ compTimbre: 'piano', leadTimbre: 'piano' });
  });
});
