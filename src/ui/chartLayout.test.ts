import { describe, expect, it } from 'vitest';
import { layoutBars } from './chartLayout';

describe('akkoordenschema in maten', () => {
  it('zet twee akkoorden van 2 tellen in één maat van 4/4', () => {
    const bars = layoutBars([2, 2, 4], 4);
    expect(bars).toHaveLength(2);
    expect(bars[0].segments.map((s) => s.index)).toEqual([0, 1]);
  });
  it('laat een akkoord van 8 tellen over twee maten doorlopen', () => {
    const bars = layoutBars([8], 4);
    expect(bars.map((b) => b.segments[0])).toEqual([{ index: 0, beats: 4, start: true, end: false }, { index: 0, beats: 4, start: false, end: true }]);
  });
  it('werkt ook in 3/4 en met een akkoord over de maatstreep', () => {
    const bars = layoutBars([2, 2], 3);
    expect(bars[0].segments).toEqual([{ index: 0, beats: 2, start: true, end: true }, { index: 1, beats: 1, start: true, end: false }]);
    expect(bars[1].segments).toEqual([{ index: 1, beats: 1, start: false, end: true }]);
  });
});
