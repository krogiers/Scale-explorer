/**
 * Er speelt altijd hooguit één ding: de loop, een toonladder, een progressie, een sequentie of een akkoord.
 * Wie begint, neemt over: wat er speelde wordt eerst stilgezet (de loop stopt, geplande noten doven uit).
 */
let current: (() => void) | null = null;

/** Begin te spelen; stop is hoe dit later weer stilgezet wordt als iets anders begint. */
export function takeOver(stop: () => void) {
  const prev = current;
  current = null;
  prev?.();
  current = stop;
}

/** Klaar of zelf gestopt: niets meer stilzetten bij de volgende overname. */
export function release(stop: () => void) {
  if (current === stop) current = null;
}
