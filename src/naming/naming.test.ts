import { describe, expect, it } from 'vitest';
import { scaleOf, type ModeIndex, type Note } from '../core';
import { makeNames, namerById, parseChord, readingFor, transposeNote, writtenScale } from '.';

const en = namerById('en');
const n = (pc: number, letter: number, acc: number): Note => ({ pc, letter, acc });
const name = (x: Note) => en.name(x.letter, x.acc);
const BB = readingFor(2), EB = readingFor(9);

describe('lezen in de toonaard van je instrument', () => {
  it('B♭: een grote secunde hoger, met de juiste spelling', () => {
    expect(name(transposeNote(n(0, 0, 0), BB))).toBe('D');
    expect(name(transposeNote(n(3, 2, -1), BB))).toBe('F'); // E♭ → F
    expect(name(transposeNote(n(1, 1, -1), BB))).toBe('E♭'); // D♭ → E♭
    expect(name(transposeNote(n(6, 3, 1), BB))).toBe('G♯'); // F♯ → G♯
    expect(name(transposeNote(n(11, 6, 0), BB))).toBe('C♯'); // B → C♯
  });
  it('E♭: een grote sext hoger; een dubbelkruis wordt omgespeld', () => {
    expect(name(transposeNote(n(0, 0, 0), EB))).toBe('A');
    expect(name(transposeNote(n(10, 6, -1), EB))).toBe('G'); // B♭ → G
    expect(name(transposeNote(n(10, 5, 1), EB))).toBe('G'); // A♯ → F𝄪 → G
  });
  it('concert blijft ongewijzigd', () => {
    const x = n(3, 2, -1);
    expect(transposeNote(x, readingFor(0))).toBe(x);
  });
  it('geschreven ladders en voortekening', () => {
    const d = writtenScale(scaleOf(0, 1), BB); // concert C Ionisch
    expect(d.notes.map(name).join(' ')).toBe('D E F♯ G A B C♯');
    expect(d.signature).toBe(2);
    expect(writtenScale(scaleOf(6, 1), BB).signature).toBe(-4); // concert G♭ → A♭ majeur
    expect(writtenScale(scaleOf(0, 1), EB).signature).toBe(3); // concert C → A majeur
    expect(writtenScale(scaleOf(1, 1), EB).signature).toBe(-2); // concert D♭ → B♭ majeur
  });
  it('B♭: elke geschreven modus heeft elke letter één keer en geen dubbele voortekens', () => {
    for (let root = 0; root < 12; root++) for (let m = 0; m < 7; m++) {
      const w = writtenScale(scaleOf(root, m as ModeIndex), BB);
      expect(new Set(w.notes.map((x) => x.letter)).size).toBe(7);
      expect(w.notes.every((x) => Math.abs(x.acc) <= 1)).toBe(true);
      expect(w.root).toBe((root + 2) % 12);
    }
  });
  it('makeNames: akkoorden en voortekening zoals je leest', () => {
    const names = makeNames(en, BB);
    const c = scaleOf(0, 1);
    expect(names.note(c.notes[0])).toBe('D');
    expect(names.signature(c)).toBe(2);
    expect(makeNames(en).note(c.notes[0])).toBe('C');
  });
});

describe('een getypt akkoord lezen', () => {
  const p = (s: string) => { const r = parseChord(s); return r && `${'CDEFGAB'[r.letter]}${r.acc}${r.quality}`; };
  it('Engels, met ♯/♭ of #/b', () => {
    expect(p('Cm7')).toBe('C0m7');
    expect(p('F#m7b5')).toBe('F1m7b5');
    expect(p('Bbmaj7')).toBe('B-1maj7');
    expect(p('B♭7')).toBe('B-17');
    expect(p('G')).toBe('G0maj');
    expect(p(' e  m ')).toBe('E0min');
  });
  it('Nederlands en do re mi', () => {
    expect(p('Bes7')).toBe('B-17');
    expect(p('Fism7')).toBe('F1m7');
    expect(p('Es')).toBe('E-1maj');
    expect(p('Do-7')).toBe('C0m7');
    expect(p('Solmaj7')).toBe('G0maj7');
  });
  it('schrijfwijzen van de soort; hoofdletter M is majeur', () => {
    expect(p('CM7')).toBe('C0maj7');
    expect(p('CΔ')).toBe('C0maj7');
    expect(p('Cø')).toBe('C0m7b5');
    expect(p('C°7')).toBe('C0dim7');
    expect(p('C+')).toBe('C0aug');
    expect(p('Cm(maj7)')).toBe('C0mM7');
  });
  it('onzin wordt niet gelezen', () => {
    expect(p('')).toBeNull();
    expect(p('H7')).toBeNull();
    expect(p('Cm9')).toBeNull();
  });
});
