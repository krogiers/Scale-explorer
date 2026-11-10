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
  sopsax: () => import('../samples/sopsax'),
  altsax: () => import('../samples/altsax'),
  tenorsax: () => import('../samples/tenorsax'),
  barisax: () => import('../samples/barisax'),
  guitar: () => import('../samples/guitar'),
};

/**
 * Hoe een klank aanzet en uitklinkt: aanzet en uitklank in seconden, sterkte, en het stuk [van, tot] dat zich herhaalt.
 * vibrato = [diepte in cent, snelheid in Hz, na hoeveel seconden het begint]: zoals een blazer, pas op een aangehouden noot.
 */
export interface Voice { attack: number; release: number; level: number; loop?: [number, number]; vibrato?: [number, number, number] }
export const VOICES: Record<string, Voice> = {
  // sterktes van de nieuwe opnames (Salamander, VSCO 2, Shinyguitar, MTG) zo gekozen dat de mix klinkt zoals met FluidR3:
  // de vorige sterkte × het gemeten luidheidsverschil (mediaan over de noten)
  piano: { attack: 0, release: 0.35, level: 0.062 },
  rhodes: { attack: 0, release: 0.35, level: 0.55 },
  bass: { attack: 0, release: 0.12, level: 0.31 },
  strings: { attack: 0.12, release: 0.6, level: 0.5, loop: [0.8, 2.9] },
  cello: { attack: 0.08, release: 0.45, level: 0.6, loop: [0.8, 2.9] },
  organ: { attack: 0.015, release: 0.12, level: 0.4, loop: [0.2, 0.9] },
  vibes: { attack: 0, release: 0.8, level: 0.6 },
  clarinet: { attack: 0.03, release: 0.2, level: 0.26, loop: [0.8, 2.9] },
  trumpet: { attack: 0.02, release: 0.15, level: 0.15, loop: [0.8, 2.9] },
  flute: { attack: 0.05, release: 0.25, level: 0.22, loop: [0.8, 2.9] },
  sopsax: { attack: 0.03, release: 0.2, level: 0.27, loop: [0.8, 2.9], vibrato: [14, 5.2, 0.35] },
  altsax: { attack: 0.03, release: 0.2, level: 0.27, loop: [0.8, 2.9], vibrato: [14, 5.2, 0.35] },
  tenorsax: { attack: 0.03, release: 0.2, level: 0.27, loop: [0.8, 2.9], vibrato: [14, 5.2, 0.35] },
  // de baritonopnames duren maar 2 à 2,5 s: korter stuk om te herhalen
  barisax: { attack: 0.03, release: 0.2, level: 0.27, loop: [0.5, 1.6], vibrato: [14, 5.2, 0.35] },
  guitar: { attack: 0, release: 0.3, level: 0.11 },
};
