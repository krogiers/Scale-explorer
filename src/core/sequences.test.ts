import { describe, expect, it } from 'vitest';
import { scaleOf, numeralAt, realize, SEQ_STYLES, SEQUENCES } from '.';

const chordsScale = (root: number, mode: number) => scaleOf(root, mode as 0).notes.map((n) => n.pc);
const seq = (id: string) => SEQUENCES.find((s) => s.id === id)!;
const keys = (id: string, tonic: number) => realize(seq(id), tonic, 4).map((s) => s.chord.key);
const numerals = (id: string) => realize(seq(id), 0, 4).map((s) => numeralAt(s.iv, s.chord.quality));

describe('jazzprogressies', () => {
  it('ii–V–I in C en in B♭', () => {
    expect(keys('iiVI', 0)).toEqual(['2:m7', '7:7', '0:maj7']);
    expect(keys('iiVI', 10)).toEqual(['0:m7', '5:7', '10:maj7']);
    expect(numerals('iiVI')).toEqual(['ii7', 'V7', 'Imaj7']);
  });
  it('mineur: halfverminderde ii, en de V7 is gemarkeerd als benadering', () => {
    const s = realize(seq('iiVImin'), 0, 4);
    expect(s.map((x) => x.chord.key)).toEqual(['2:m7b5', '7:7', '0:m7']);
    expect(s.map((x) => x.approx)).toEqual([false, true, false]);
  });
  it('tritonussubstitutie en backdoor', () => {
    expect(numerals('tritone')).toEqual(['ii7', '♭II7', 'Imaj7']);
    expect(numerals('backdoor')).toEqual(['iv7', '♭VII7', 'Imaj7']);
  });
  it('de jazzblues duurt 12 maten, in 4/4 en in 3/4', () => {
    expect(realize(seq('blues'), 5, 4).reduce((n, s) => n + s.beats, 0)).toBe(48);
    expect(realize(seq('rhythm'), 10, 4).reduce((n, s) => n + s.beats, 0)).toBe(32);
    expect(realize(seq('iiVI'), 0, 3).map((s) => s.beats)).toEqual([3, 3, 6]);
  });
  it('Coltrane changes: tonale centra een grote terts uit elkaar', () => {
    const tonics = realize(seq('coltrane'), 0, 4).filter((s) => s.chord.quality === 'maj7').map((s) => s.root);
    expect(tonics).toEqual([8, 4, 0]);
  });
  it('elk akkoord heeft een bekende kwaliteit en de grootte van zijn progressie', () => {
    for (const s of SEQUENCES) for (const x of realize(s, 0, 4)) {
      expect(x.chord.quality).not.toBe('?');
      expect(x.chord.notes).toHaveLength(s.size);
    }
  });
});

describe('progressies per stijl', () => {
  it('elke stijl heeft progressies, en de ids zijn uniek', () => {
    for (const st of SEQ_STYLES) expect(SEQUENCES.some((s) => s.style === st)).toBe(true);
    expect(new Set(SEQUENCES.map((s) => s.id)).size).toBe(SEQUENCES.length);
  });
  it('klassieke cadensen in drieklanken', () => {
    expect(numerals('authentic')).toEqual(['V', 'I']);
    expect(numerals('plagal')).toEqual(['IV', 'I']);
    expect(numerals('half')).toEqual(['I', 'ii', 'V']);
    expect(numerals('deceptive')).toEqual(['V', 'vi']);
    expect(numerals('picardy')).toEqual(['i', 'iv', 'V', 'I']);
  });
  it('pop: I–V–vi–IV en de mineur-plagale iv–I', () => {
    expect(keys('axis', 0)).toEqual(['0:maj', '7:maj', '9:min', '5:maj']);
    expect(numerals('minorPlagal')).toEqual(['iv', 'I']);
    expect(numerals('rockPlagal')).toEqual(['♭VII', 'IV', 'I']);
  });
  it('de basisblues duurt 12 maten, met alleen dominanten', () => {
    const s = realize(seq('blues12'), 0, 4);
    expect(s.reduce((n, x) => n + x.beats, 0)).toBe(48);
    expect(s.every((x) => x.chord.quality === '7')).toBe(true);
  });
  it('modale cadensen: slotakkoord en voorlaatste uit dezelfde moederladder, het slot in de juiste modus', () => {
    const modal = ['dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian'];
    expect(modal.map(numerals)).toEqual([['i', 'IV'], ['♭II', 'i'], ['I', 'II'], ['♭VII', 'I'], ['♭VI', '♭VII', 'i']]);
    for (const id of modal) {
      const s = realize(seq(id), 0, 4);
      // alle noten van de akkoorden zitten in de ladder van het slotakkoord
      const home = s[s.length - 1];
      const pcs = new Set(chordsScale(home.root, home.mode));
      for (const x of s) for (const n of x.chord.notes) expect(pcs.has(n.pc)).toBe(true);
    }
  });
  it('Andalusisch: i – ♭VII – ♭VI – V, de V als benadering', () => {
    const s = realize(seq('andalusian'), 9, 4); // in A
    expect(s.map((x) => x.chord.key)).toEqual(['9:min', '7:maj', '5:maj', '4:maj']);
    expect(s.map((x) => x.approx)).toEqual([false, false, false, true]);
  });
});
