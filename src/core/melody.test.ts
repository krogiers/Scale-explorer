import { describe, expect, it } from 'vitest';
import { chordsOf } from './chords';
import { makeMelody, type MelodyStep } from './melody';
import { scaleOf, type ModeIndex } from './scale';
import { seededRng } from './surprise';

const step = (root: number, mode: number, beats = 4): MelodyStep => {
  const scale = scaleOf(root, mode as ModeIndex);
  return { scale, chord: chordsOf(scale, 4)[0], beats };
};
// ii – V – I – A7 (met een andere ladder: C♯ en F♯ zijn nieuw), twee keer, en een akkoord van 2 tellen
const steps = [step(2, 3), step(7, 2), step(0, 1), step(9, 2), step(2, 3, 2), step(7, 2, 2), step(0, 1, 8)];

describe('Verzin een melodie', () => {
  it('elke noot zit in de ladder van zijn akkoord, in het bereik, binnen de duur van het akkoord', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const mel = makeMelody(steps, 4, seededRng(seed));
      expect(mel).toHaveLength(steps.length);
      mel.forEach((notes, i) => notes.forEach((n) => {
        expect(steps[i].scale.pcs.has(n.midi % 12)).toBe(true);
        expect(n.midi).toBeGreaterThanOrEqual(60);
        expect(n.midi).toBeLessThanOrEqual(81);
        expect(n.at).toBeGreaterThanOrEqual(0);
        expect(n.dur).toBeGreaterThan(0);
        expect(n.at + n.dur).toBeLessThanOrEqual(steps[i].beats + 1e-9);
      }));
    }
  });
  it('eindigt op de grondtoon van het laatste akkoord', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const mel = makeMelody(steps, 4, seededRng(seed));
      const last = mel[mel.length - 1];
      expect(last[last.length - 1].midi % 12).toBe(0);
    }
  });
  it('maten 1 en 2 hebben hetzelfde ritme (motief A A)', () => {
    const mel = makeMelody([step(0, 1, 16)], 4, seededRng(3))[0];
    const bar = (k: number) => mel.filter((n) => n.at >= 4 * k && n.at < 4 * (k + 1)).map((n) => n.at - 4 * k);
    expect(bar(0)).toEqual(bar(1));
  });
  it('herhaalbaar met hetzelfde zaad; werkt ook in 3/4', () => {
    expect(makeMelody(steps, 4, seededRng(9))).toEqual(makeMelody(steps, 4, seededRng(9)));
    const m3 = makeMelody([step(0, 1, 3), step(7, 2, 3)], 3, seededRng(2));
    expect(m3.flat().every((n) => n.at < 3)).toBe(true);
  });
});
