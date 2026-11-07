/**
 * Er speelt altijd hooguit één ding: de loop, een toonladder, een progressie, een sequentie of een akkoord.
 * Wie begint, neemt over: wat er speelde wordt eerst stilgezet (de loop stopt, geplande noten doven uit).
 * Elk ding heeft een naam (id), zodat een knop kan tonen of hij zelf aan het spelen is.
 */
interface Owner { id: string; stop: () => void }
let current: Owner | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

/** Begin te spelen onder deze naam; stop is hoe het later weer stilgezet wordt als iets anders begint. */
export function takeOver(id: string, stop: () => void) {
  const prev = current;
  current = null;
  prev?.stop();
  current = { id, stop };
  notify();
}

/** Klaar of zelf gestopt: niets meer stilzetten bij de volgende overname. */
export function release(stop: () => void) {
  if (current?.stop !== stop) return;
  current = null;
  notify();
}

/** Zet stil wat er nu speelt (de ■-knop). */
export function stopCurrent() {
  const prev = current;
  current = null;
  prev?.stop();
  notify();
}

/** De naam van wat er nu speelt, of null. */
export const playing = (): string | null => current?.id ?? null;

/** Verwittig bij elke wissel (voor React: useSyncExternalStore). */
export function subscribe(f: () => void): () => void {
  listeners.add(f);
  return () => { listeners.delete(f); };
}
