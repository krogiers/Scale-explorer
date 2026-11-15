import { describe, expect, it } from 'vitest';
import { chordsOf } from './chords';
import { makeMelody, MELODY_STYLES, type MelodyStep } from './melody';
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

describe('Verzin een melodie: stijlen', () => {
  const all = (style: (typeof MELODY_STYLES)[number], seeds = 40) => Array.from({ length: seeds }, (_, k) => makeMelody(steps, 4, seededRng(k + 1), style));
  it('elke stijl: in het bereik, niets overlapt, eindigt op de grondtoon, noten buiten de ladder dragen hun spelling', () => {
    const starts = steps.reduce<number[]>((a, _s, i) => [...a, i ? a[i - 1] + steps[i - 1].beats : 0], []);
    for (const style of MELODY_STYLES) for (const mel of all(style)) {
      const flat = mel.flatMap((ns, i) => ns.map((n) => ({ ...n, at: starts[i] + n.at, i })));
      flat.forEach((n, k) => {
        expect(n.midi).toBeGreaterThanOrEqual(59);
        expect(n.midi).toBeLessThanOrEqual(82);
        if (k) expect(flat[k - 1].at + flat[k - 1].dur).toBeLessThanOrEqual(n.at + 1e-9);
        if (!steps[n.i].scale.pcs.has(n.midi % 12)) expect(n.note?.pc).toBe(n.midi % 12);
      });
      expect(flat[flat.length - 1].midi % 12).toBe(0);
    }
  });
  it('bebop loopt in achtsten met chromatiek, funk heeft zestienden, swing en bossa anticiperen', () => {
    const count = (style: (typeof MELODY_STYLES)[number], f: (n: { at: number; dur: number; note?: unknown }) => boolean) => all(style).flat(2).filter(f).length;
    expect(count('bebop', (n) => n.dur === 0.5)).toBeGreaterThan(count('bebop', (n) => n.dur !== 0.5) * 3);
    expect(count('bebop', (n) => !!n.note)).toBeGreaterThan(0);
    expect(count('funk', (n) => n.dur === 0.25)).toBeGreaterThan(0);
    expect(count('plain', (n) => !!n.note)).toBe(0);
    // een anticipatie loopt over het einde van zijn stap heen
    for (const style of ['swing', 'bossa'] as const) {
      const over = all(style).flatMap((mel) => mel.flatMap((ns, i) => ns.filter((n) => n.at + n.dur > steps[i].beats + 1e-9)));
      expect(over.length).toBeGreaterThan(0);
    }
  });
});
