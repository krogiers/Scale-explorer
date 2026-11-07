import { describe, expect, it } from 'vitest';
import { blueNote, CHAR_DEGREE, chordsOf, formula, harmonicFunction, pentatonic, romanNumeral, scaleOf, transposed, type ModeIndex } from '.';
import { computeTargets } from '.';

const LETTERS = 'CDEFGAB';
const spelled = (root: number, mode: ModeIndex) =>
  scaleOf(root, mode).notes.map((n) => LETTERS[n.letter] + (n.acc > 0 ? '#'.repeat(n.acc) : 'b'.repeat(-n.acc))).join(' ');

describe('spelling van modi', () => {
  it('spelt de zeven modi op C', () => {
    expect(spelled(0, 0)).toBe('C D E F# G A B');
    expect(spelled(0, 1)).toBe('C D E F G A B');
    expect(spelled(0, 2)).toBe('C D E F G A Bb');
    expect(spelled(0, 3)).toBe('C D Eb F G A Bb');
    expect(spelled(0, 4)).toBe('C D Eb F G Ab Bb');
    expect(spelled(0, 5)).toBe('C Db Eb F G Ab Bb');
    expect(spelled(0, 6)).toBe('C Db Eb F Gb Ab Bb');
  });
  it('kiest de spelling met de minste voortekens', () => {
    expect(spelled(10, 1)).toBe('Bb C D Eb F G A');
    expect(spelled(11, 1)).toBe('B C# D# E F# G# A#');
    expect(spelled(6, 1)).toBe('Gb Ab Bb Cb Db Eb F');
    expect(spelled(1, 3)).toBe('C# D# E F# G# A# B');
  });
  it('geeft de juiste voortekens: relatieve modi delen ze', () => {
    expect(scaleOf(2, 3).signature).toBe(0); // D Dorisch
    expect(scaleOf(7, 2).signature).toBe(0); // G Mixolydisch
    expect(scaleOf(0, 0).signature).toBe(1); // C Lydisch
    expect(scaleOf(0, 4).signature).toBe(-3); // C Aeolisch
  });
});

describe('akkoorden', () => {
  it('bouwt drieklanken en trapnummers in Dorisch', () => {
    const s = scaleOf(2, 3);
    const ch = chordsOf(s, 3);
    expect(ch.map((c) => c.quality)).toEqual(['min', 'min', 'maj', 'maj', 'min', 'dim', 'maj']);
    expect(ch.map((c) => romanNumeral(s, c))).toEqual(['i', 'ii', '♭III', 'IV', 'v', 'vi°', '♭VII']);
  });
  it('bouwt vierklanken in Ionisch', () => {
    const s = scaleOf(0, 1);
    expect(chordsOf(s, 4).map((c) => romanNumeral(s, c))).toEqual(['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']);
  });
  it('kent de Lydische ♯iv°', () => {
    const s = scaleOf(0, 0);
    expect(romanNumeral(s, chordsOf(s, 3)[3])).toBe('♯iv°');
  });
  it('toont functies alleen in majeur en mineur', () => {
    expect(harmonicFunction(1, 4)).toBe('D');
    expect(harmonicFunction(3, 4)).toBeNull();
  });
  it('geeft de trapformule', () => {
    expect(formula(5).join(' ')).toBe('1 ♭2 ♭3 4 5 ♭6 ♭7');
  });
});

describe('navigatie', () => {
  it('zet de kwintval bovenaan', () => {
    const t = computeTargets(scaleOf(0, 1), 3, 4); // vanaf G in C majeur
    expect(t.diatonic[0].move).toBe('fifthDown');
    expect(t.diatonic[0].chord.degree).toBe(0);
  });
  it('vindt leenakkoorden uit de buurmodus eerst', () => {
    const t = computeTargets(scaleOf(0, 1), 3, 0);
    expect(t.borrowed[0].distance).toBe(1);
    const keys = t.borrowed.map((b) => b.chord.key);
    expect(keys).toContain('10:maj'); // Bb uit C Mixolydisch
  });
  it('vindt spilakkoorden: Am leidt van C naar G', () => {
    const t = computeTargets(scaleOf(0, 1), 3, 5); // Am in C majeur
    const toG = t.pivots.find((p) => p.scale.root === 7)!;
    expect(toG.pivot && romanNumeral(toG.scale, toG.pivot)).toBe('ii');
    expect(toG.targets.map((x) => x.chord.key)).toContain('2:maj'); // D
  });
  it('meldt wanneer een akkoord geen spil is', () => {
    const t = computeTargets(scaleOf(0, 1), 3, 6); // B° in C
    expect(t.pivots.every((p) => p.pivot === null || p.scale.root === 7)).toBe(true);
    const toF = t.pivots.find((p) => p.scale.root === 5)!;
    expect(toF.pivot).toBeNull();
    expect(toF.sharedChords.length).toBeGreaterThan(0);
  });
});

describe('transponeren', () => {
  const name = (n: { letter: number; acc: number }) => 'CDEFGAB'[n.letter] + ['♭', '', '♯'][n.acc + 1];
  it('geeft geschreven noten voor een E♭-sax: C majeur wordt A majeur', () => {
    const s = transposed(scaleOf(0, 1), 9);
    expect(s.notes.map(name)).toEqual(['A', 'B', 'C♯', 'D', 'E', 'F♯', 'G♯']);
    expect(s.mode).toBe(1);
  });
  it('geeft geschreven noten voor een B♭-sax: B♭ Dorisch wordt C Dorisch', () => {
    expect(transposed(scaleOf(10, 3), 2).notes.map(name)).toEqual(['C', 'D', 'E♭', 'F', 'G', 'A', 'B♭']);
  });
});

describe('blue note', () => {
  it('is de verlaagde kwint, gespeld op de letter van de kwint', () => {
    const d = blueNote(scaleOf(2, 3)); // D Dorisch
    expect([d.note.pc, 'CDEFGAB'[d.note.letter], d.note.acc]).toEqual([8, 'A', -1]);
    expect(d.inScale).toBe(false);
    const bb = blueNote(scaleOf(10, 1)); // Bes majeur -> Fes
    expect(['CDEFGAB'[bb.note.letter], bb.note.acc]).toEqual(['F', -1]);
  });
  it('vermijdt dubbele voortekens: op G♭ en D♭ wordt het de ♯4', () => {
    const gb = blueNote(scaleOf(6, 1)); // Ges majeur -> C, niet D𝄫
    expect(['CDEFGAB'[gb.note.letter], gb.note.acc]).toEqual(['C', 0]);
    const db = blueNote(scaleOf(1, 1)); // Des majeur -> G, niet A𝄫
    expect(['CDEFGAB'[db.note.letter], db.note.acc]).toEqual(['G', 0]);
  });
  it('zit al in Locrisch', () => {
    expect(blueNote(scaleOf(0, 6)).inScale).toBe(true);
  });
});

describe('pentatonisch', () => {
  const p = (root: number, mode: ModeIndex) => {
    const x = pentatonic(scaleOf(root, mode));
    const nm = (n: { letter: number; acc: number }) => LETTERS[n.letter] + (n.acc > 0 ? '#' : n.acc < 0 ? 'b' : '');
    return [x.kind, x.notes.map(nm).join(' '), x.dropped.map(nm).join(' ')];
  };
  it('geeft majeur-pentatonisch in de heldere modi', () => {
    expect(p(0, 1)).toEqual(['major', 'C D E G A', 'F B']);
    expect(p(0, 0)).toEqual(['major', 'C D E G A', 'F# B']);
    expect(p(7, 2)).toEqual(['major', 'G A B D E', 'C F']);
  });
  it('geeft mineur-pentatonisch in de donkere modi', () => {
    expect(p(9, 4)).toEqual(['minor', 'A C D E G', 'B F']);
    expect(p(2, 3)).toEqual(['minor', 'D F G A C', 'E B']);
    expect(p(4, 5)).toEqual(['minor', 'E G A B D', 'F C']);
  });
  it('houdt in Locrisch de ♭5', () => {
    expect(p(11, 6)).toEqual(['locrian', 'B D E F A', 'C G']);
  });
  it('laat de kenmerkende noot weg, behalve in Locrisch', () => {
    for (let m = 0; m < 7; m++) {
      const s = scaleOf(0, m as ModeIndex);
      expect(pentatonic(s).pcs.has(s.notes[CHAR_DEGREE[m]].pc)).toBe(m === 6);
    }
  });
});
