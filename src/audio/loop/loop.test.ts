import { describe, expect, it } from 'vitest';
import { locate, planBeat, planDrums, swingRatio, type TimelineItem } from '.';

const dm7: TimelineItem = { voicing: [38, 50, 53, 57, 60], beats: 4 }; // bas D, dan D F A C
const opts = { bpm: 120, style: 'comp' as const, meter: 4 };

describe('begeleiding van de loop', () => {
  it('speelt ritmisch: grondtoon op 1, akkoord op 2, kwint op 3', () => {
    expect(planBeat(dm7, 0, 0, opts).map((n) => [n.midi, n.part])).toEqual([[38, 'bass']]);
    expect(planBeat(dm7, 1, 1, opts).map((n) => n.midi)).toEqual([50, 53, 57, 60]);
    expect(planBeat(dm7, 2, 2, opts).map((n) => n.midi)).toEqual([45]);
  });
  it('speelt de echte kwint van het akkoord, ook verminderd', () => {
    const bm7b5: TimelineItem = { voicing: [35, 47, 50, 53, 57], beats: 4 }; // bas B, dan B D F A
    expect(planBeat(bm7b5, 2, 2, opts).map((n) => n.midi)).toEqual([41]); // F, niet F♯
  });
  it('laat een akkoord van één tel ook horen', () => {
    const one = { ...dm7, beats: 1 };
    const parts = planBeat(one, 0, 0, opts).map((n) => n.part);
    expect(parts).toContain('bass');
    expect(parts).toContain('keys');
  });
  it('volgt de maat, niet het begin van het akkoord', () => {
    // akkoord begint op tel 4 van de maat: grondtoon in de bas plus het akkoord
    expect(planBeat(dm7, 0, 3, opts).map((n) => n.part)).toEqual(['bass', 'keys', 'keys', 'keys', 'keys']);
    // de tweede tel van dat akkoord valt op de 1 van de volgende maat: bas, geen akkoord
    expect(planBeat(dm7, 1, 0, opts).map((n) => n.part)).toEqual(['bass']);
  });
  it('speelt in 3/4 bas op 1 en akkoord op 2 en 3', () => {
    const waltz = { ...opts, meter: 3 };
    expect(planBeat(dm7, 0, 0, waltz).map((n) => n.part)).toEqual(['bass']);
    expect(planBeat(dm7, 1, 1, waltz).every((n) => n.part === 'keys')).toBe(true);
    expect(planBeat(dm7, 2, 2, waltz).every((n) => n.part === 'keys')).toBe(true);
  });
  it('houdt het akkoord aan over zijn eigen duur', () => {
    const long = { ...dm7, beats: 8 };
    const first = planBeat(long, 0, 0, { ...opts, style: 'sustain' });
    expect(first).toHaveLength(5);
    expect(first[0].duration).toBeCloseTo(8 * 0.5 * 0.95);
    expect(planBeat(long, 1, 1, { ...opts, style: 'sustain' })).toEqual([]);
  });
});

describe('tijdlijn van het schema', () => {
  const tl: TimelineItem[] = [{ voicing: [1], beats: 2 }, { voicing: [2], beats: 4 }, { voicing: [3], beats: 2 }];
  it('vindt het akkoord bij een tel, met verschillende duur', () => {
    expect(locate(tl, 0)).toEqual({ chord: 0, beat: 0 });
    expect(locate(tl, 2)).toEqual({ chord: 1, beat: 0 });
    expect(locate(tl, 5)).toEqual({ chord: 1, beat: 3 });
    expect(locate(tl, 7)).toEqual({ chord: 2, beat: 1 });
  });
  it('begint na het laatste akkoord weer vooraan', () => {
    expect(locate(tl, 8)).toEqual({ chord: 0, beat: 0 });
    expect(locate(tl, 19)).toEqual({ chord: 1, beat: 1 });
  });
});

describe('ritmestijlen', () => {
  const g7: TimelineItem = { voicing: [43, 53, 55, 59, 62], beats: 4 }; // bas G, dan F G B D
  const cmaj: TimelineItem = { voicing: [36, 52, 55, 59, 60], beats: 4 };
  const swing = { ...opts, style: 'swing' as const };
  const bassOf = (n: ReturnType<typeof planBeat>) => n.filter((x) => x.part === 'bass').map((x) => x.midi);
  it('walking bass: grondtoon, terts, kwint en een halve toon naast het volgende akkoord', () => {
    expect([0, 1, 2, 3].map((b) => bassOf(planBeat(dm7, b, b, swing, g7))[0])).toEqual([38, 41, 45, 42]); // D F A, dan F♯ naar G
    expect(bassOf(planBeat(g7, 3, 3, swing, cmaj))[0]).toBe(47); // B, van onder naar de dichtstbijzijnde C
  });
  it('swingt de "en": Charleston op 1 en net voor 3', () => {
    const keys = planBeat(dm7, 1, 1, swing, g7).filter((n) => n.part === 'keys');
    expect(keys[0].offset).toBeCloseTo(0.5 * swingRatio(120));
    expect(swingRatio(120)).toBeCloseTo(2 / 3);
    expect(swingRatio(240)).toBeLessThan(2 / 3);
  });
  it('shuffle: boogiebas 1 3 5 6 in geswingde achtsten', () => {
    const c: TimelineItem = { voicing: [36, 48, 52, 55], beats: 4 };
    const sh = { ...opts, style: 'shuffle' as const };
    expect([0, 1, 2, 3].map((b) => bassOf(planBeat(c, b, b, sh))[0])).toEqual([36, 40, 43, 45]);
    expect(planBeat(c, 0, 0, sh).filter((n) => n.part === 'bass')).toHaveLength(2);
  });
  it('bossa: aanloop naar de grondtoon van het volgende akkoord op de "en" van 4', () => {
    const last = planBeat(dm7, 3, 3, { ...opts, style: 'bossa' }, g7).filter((n) => n.part === 'bass');
    expect(last.map((n) => n.midi)).toEqual([43]);
    expect(last[0].offset).toBeCloseTo(0.25);
  });
  it('een nieuw akkoord midden in het patroon krijgt meteen zijn grondtoon', () => {
    expect(bassOf(planBeat(g7, 0, 1, { ...opts, style: 'funk' }))).toContain(43);
  });
  it('drums: ride ding-a-ding en hihat op 2 en 4 in swing; backbeat in funk', () => {
    const kinds = (b: number, style: 'swing' | 'funk') => planDrums(b, { ...opts, style }).map(([, k]) => k);
    expect(kinds(1, 'swing')).toEqual(['ride', 'ride', 'pedal']);
    expect(kinds(0, 'swing')).not.toContain('pedal');
    expect(kinds(1, 'funk')).toContain('snare');
  });
});
