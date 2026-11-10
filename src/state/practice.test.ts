import { describe, expect, it } from 'vitest';
import { practiceAt, practiceTimeline, type Practice } from './loop';

// C Ionisch (modus 1) ↔ C Lydisch (modus 0), wissel om 2 maten
const p: Practice = { a: { root: 0, mode: 1 }, b: { root: 0, mode: 0 }, bars: 2 };

describe('oefenmodus', () => {
  it('tijdlijn: eerst bars maten a, dan bars maten b, elk één maat drone', () => {
    const tl = practiceTimeline({ ...p, b: { root: 7, mode: 1 } }, 4);
    expect(tl).toHaveLength(4);
    expect(tl.every((x) => x.beats === 4)).toBe(true);
    expect(tl.map((x) => x.voicing[0])).toEqual([36, 36, 43, 43]);
    expect(tl[0].voicing[1] - tl[0].voicing[0]).toBe(19); // kwint, een octaaf hoger
  });
  it('welke modus geldt en hoeveel maten tot de wissel', () => {
    expect(practiceAt(p, null)).toMatchObject({ now: p.a, other: p.b, barsLeft: 2 });
    expect(practiceAt(p, { chord: -1, beat: 0, beats: 4 }).now).toBe(p.a); // aftellen
    expect(practiceAt(p, { chord: 1, beat: 3, beats: 4 })).toMatchObject({ now: p.a, barsLeft: 1 });
    expect(practiceAt(p, { chord: 2, beat: 0, beats: 4 })).toMatchObject({ now: p.b, other: p.a, barsLeft: 2 });
    expect(practiceAt(p, { chord: 3, beat: 0, beats: 4 })).toMatchObject({ now: p.b, barsLeft: 1 });
  });
});
