import { describe, expect, it } from 'vitest';
import { numeralAt } from './theory';
import { realize, SEQUENCES } from './sequences';

const seq = (id: string) => SEQUENCES.find((s) => s.id === id)!;
const keys = (id: string, tonic: number) => realize(seq(id), tonic, 4).map((s) => s.chord.key);
const numerals = (id: string) => realize(seq(id), 0, 4).map((s) => numeralAt(s.iv, s.chord.quality));

describe('jazzsequenties', () => {
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
  it('elk akkoord is een vierklank met een bekende kwaliteit', () => {
    for (const s of SEQUENCES) for (const x of realize(s, 0, 4)) expect(x.chord.quality).not.toBe('?');
  });
});
