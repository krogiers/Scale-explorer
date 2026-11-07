/**
 * Waar een klank naartoe gaat: droog, en eventueel ook naar de galm.
 * track: elke gestarte bron aanmelden, zodat stopAll ze echt kan stoppen.
 */
export interface Out { dry: AudioNode; wet: AudioNode; track: (n: AudioScheduledSourceNode) => void }

export const jitter = (amount: number) => (Math.random() * 2 - 1) * amount;

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

/** Kunstmatige zaalrespons: stereoruis die exponentieel uitsterft. */
export function impulse(c: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return ir;
}
