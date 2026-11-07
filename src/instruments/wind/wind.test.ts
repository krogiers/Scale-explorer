import { describe, expect, it } from 'vitest';
import { scaleOf, transposed, type ModeIndex } from '../../core';
import { ascend } from './wind';
import type { InstrumentView } from '../types';
import { VALVES } from './Trumpet';
import { FINGERING as CLARINET } from './Clarinet';
import { FINGERING as FLUTE } from './Flute';

const view = (root: number, mode: ModeIndex, shift: number) => {
  const s = transposed(scaleOf(root, mode), shift);
  return { scaleNotes: s.notes, root: s.root } as InstrumentView;
};
const allMidi = (low: number, shift: number) =>
  Array.from({ length: 84 }, (_, i) => ascend(view(i % 12, (i % 7) as ModeIndex, shift), low).map((w) => w.midi)).flat();

describe('blaasinstrumenten', () => {
  it('loopt op van de grondtoon tot het octaaf', () => {
    const m = ascend(view(2, 3, 0), 62).map((w) => w.midi); // D Dorisch vanaf D4
    expect(m).toEqual([62, 64, 65, 67, 69, 71, 72, 74]);
  });
  it('heeft een greep voor elke noot van elke modus', () => {
    for (let r = 0; r < 12; r++) for (let mo = 0; mo < 7; mo++) {
      for (const w of ascend(view(r, mo as ModeIndex, 2), 58)) {
        expect(VALVES[w.midi], `trompet ${w.midi}`).toBeDefined();
        expect(CLARINET[w.midi], `klarinet ${w.midi}`).toBeDefined();
      }
      for (const w of ascend(view(r, mo as ModeIndex, 0), 62)) expect(FLUTE[w.midi] ?? FLUTE[w.midi - 12], `fluit ${w.midi}`).toBeDefined();
    }
    expect(Math.min(...allMidi(58, 2))).toBe(58);
    expect(Math.max(...allMidi(58, 2))).toBe(81);
  });
  it('kent de klarinetduodecime: B4 is de greep van E3 met registerklep', () => {
    expect(CLARINET[71]).toContain('R');
    expect(CLARINET[79]).toEqual(['R', ...CLARINET[60]]); // G5 = C4 + R
  });
});
