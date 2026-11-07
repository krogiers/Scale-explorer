import type { Timbre } from '../types';

/** Extra klanken: elk een eigen bestand, dat Vite als apart stuk bouwt en dat pas bij de eerste keuze geladen wordt. */
export const EXTRA: Partial<Record<Timbre, () => Promise<{ default: Record<number, string> }>>> = {
  strings: () => import('../samples/strings'),
  cello: () => import('../samples/cello'),
  organ: () => import('../samples/organ'),
  vibes: () => import('../samples/vibes'),
  clarinet: () => import('../samples/clarinet'),
  trumpet: () => import('../samples/trumpet'),
  flute: () => import('../samples/flute'),
  sax: () => import('../samples/sax'),
  guitar: () => import('../samples/guitar'),
};

/** Hoe een klank aanzet en uitklinkt: aanzet en uitklank in seconden, sterkte, en het stuk [van, tot] dat zich herhaalt. */
export interface Voice { attack: number; release: number; level: number; loop?: [number, number] }
export const VOICES: Record<string, Voice> = {
  piano: { attack: 0, release: 0.35, level: 0.55 },
  rhodes: { attack: 0, release: 0.35, level: 0.55 },
  bass: { attack: 0, release: 0.12, level: 1.1 },
  strings: { attack: 0.12, release: 0.6, level: 0.5, loop: [0.8, 2.9] },
  cello: { attack: 0.08, release: 0.45, level: 0.6, loop: [0.8, 2.9] },
  organ: { attack: 0.015, release: 0.12, level: 0.4, loop: [0.2, 0.9] },
  vibes: { attack: 0, release: 0.8, level: 0.6 },
  clarinet: { attack: 0.03, release: 0.2, level: 0.45, loop: [0.8, 2.9] },
  trumpet: { attack: 0.02, release: 0.15, level: 0.55, loop: [0.8, 2.9] },
  flute: { attack: 0.05, release: 0.25, level: 0.5, loop: [0.8, 2.9] },
  sax: { attack: 0.03, release: 0.2, level: 0.5, loop: [0.8, 2.9] },
  guitar: { attack: 0, release: 0.3, level: 0.7 },
};
