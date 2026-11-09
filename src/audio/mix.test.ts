import { describe, expect, it } from 'vitest';
import { channelGain, DEFAULT_MIX, faderGain, validMix, type Mix } from './mix';

const withStrip = (patch: Partial<Record<keyof Mix, Partial<Mix['keys']>>>): Mix =>
  Object.fromEntries(Object.entries(DEFAULT_MIX).map(([k, v]) => [k, { ...v, ...patch[k as keyof Mix] }])) as Mix;

describe('mengpaneel', () => {
  it('schuiver: 75 is ongewijzigd, 0 is stil, 100 is ongeveer +6 dB, 50 ongeveer half zo luid', () => {
    expect(faderGain(75)).toBe(1);
    expect(faderGain(0)).toBe(0);
    expect(20 * Math.log10(faderGain(100))).toBeCloseTo(6.2, 0);
    expect(20 * Math.log10(faderGain(50))).toBeCloseTo(-8.8, 0);
  });

  it('standaard klinkt alles zoals voor het mengpaneel', () => {
    for (const ch of ['keys', 'bass', 'drums', 'click', 'reverb', 'master'] as const) expect(channelGain(DEFAULT_MIX, ch)).toBe(1);
  });

  it('stil zet één kanaal uit, solo alle andere partijen (maar niet galm of totaal)', () => {
    expect(channelGain(withStrip({ bass: { mute: true } }), 'bass')).toBe(0);
    const solo = withStrip({ bass: { solo: true } });
    expect(channelGain(solo, 'bass')).toBe(1);
    expect(channelGain(solo, 'keys')).toBe(0);
    expect(channelGain(solo, 'drums')).toBe(0);
    expect(channelGain(solo, 'master')).toBe(1);
    expect(channelGain(solo, 'reverb')).toBe(1);
    // solo en stil tegelijk: stil wint
    expect(channelGain(withStrip({ bass: { solo: true, mute: true } }), 'bass')).toBe(0);
  });

  it('bewaarde waarden worden begrensd; onzin wordt de standaard', () => {
    const m = validMix({ keys: { vol: 140, pan: -3, mute: true }, bass: { vol: 'luid' }, drums: null });
    expect(m.keys).toEqual({ vol: 100, pan: -1, mute: true, solo: false });
    expect(m.bass).toEqual(DEFAULT_MIX.bass);
    expect(m.drums).toEqual(DEFAULT_MIX.drums);
    expect(validMix('x')).toEqual(DEFAULT_MIX);
  });
});
