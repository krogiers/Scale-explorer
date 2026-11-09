/**
 * Het mengpaneel, los van de geluidskaart (zodat het te testen is): per kanaal een schuiver,
 * links/rechts, stil (M) en solo (S). Galm en Totaal hebben alleen een schuiver.
 */
export const CHANNELS = ['keys', 'bass', 'drums', 'click', 'reverb', 'master'] as const;
export type Channel = (typeof CHANNELS)[number];
/** Kanalen met links/rechts, stil en solo: de echte partijen. */
export const PARTS = ['keys', 'bass', 'drums', 'click'] as const;
export type PartChannel = (typeof PARTS)[number];

/** vol: stand van de schuiver, 0 tot 100 (75 = zoals voorheen). pan: -1 links tot 1 rechts. */
export interface Strip { vol: number; pan: number; mute: boolean; solo: boolean }
export type Mix = Record<Channel, Strip>;

/** Standaard: alles op 75 (dezelfde klank als voor het mengpaneel), lichtjes gespreid zoals op een podium. */
export const UNITY = 75;
export const DEFAULT_MIX: Mix = {
  keys: { vol: UNITY, pan: -0.15, mute: false, solo: false },
  bass: { vol: UNITY, pan: 0, mute: false, solo: false },
  drums: { vol: UNITY, pan: 0.15, mute: false, solo: false },
  click: { vol: UNITY, pan: 0, mute: false, solo: false },
  reverb: { vol: UNITY, pan: 0, mute: false, solo: false },
  master: { vol: UNITY, pan: 0, mute: false, solo: false },
};

/**
 * Van schuiverstand naar versterking, zoals het oor het hoort: 75 = ongewijzigd, 100 ≈ +6 dB,
 * 50 ≈ -9 dB (ongeveer half zo luid), 0 = stil.
 */
export const faderGain = (vol: number) => (vol <= 0 ? 0 : Math.pow(vol / UNITY, 2.5));

/** Versterking van een kanaal met stil en solo erbij: staat er ergens solo aan, dan klinken alleen de solokanalen. */
export function channelGain(mix: Mix, ch: Channel): number {
  const s = mix[ch];
  if ((PARTS as readonly string[]).includes(ch)) {
    const anySolo = PARTS.some((p) => mix[p].solo);
    if (s.mute || (anySolo && !s.solo)) return 0;
  }
  return faderGain(s.vol);
}

const num = (v: unknown, min: number, max: number, dflt: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : dflt;

/** Een bewaard mengpaneel overnemen; wat ontbreekt of onzin is, krijgt de standaardwaarde. */
export function validMix(m: unknown): Mix {
  const src = (m && typeof m === 'object' ? m : {}) as Record<string, Partial<Strip> | undefined>;
  const out = {} as Mix;
  for (const ch of CHANNELS) {
    const d = DEFAULT_MIX[ch], s = src[ch] ?? {};
    out[ch] = { vol: num(s.vol, 0, 100, d.vol), pan: num(s.pan, -1, 1, d.pan), mute: s.mute === true, solo: s.solo === true };
  }
  return out;
}
