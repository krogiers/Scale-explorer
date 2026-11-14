/**
 * Toeval met regels: een willekeurig akkoordenschema ("Verras me") dat toch klinkt.
 * - Het begint op de tonica van je ladder en eindigt erop, na een cadens die bij de modus past: in Ionisch V → I,
 *   in de andere modi het kenmerkende akkoord → i (Dorisch IV → i, Mixolydisch ♭VII → I, Lydisch II → I, …).
 * - Daartussen volgt elke stap de regels van "volgende stap" (navigation): kwintval het vaakst, dan tertsstappen,
 *   dan secundes, kwint omhoog het minst. Soms (1 op 6) een leenakkoord uit een buurmodus op dezelfde grondtoon;
 *   daarna keert het terug naar de eigen ladder.
 * - Nooit twee keer hetzelfde akkoord na elkaar; verminderde akkoorden (°, ø) maar af en toe.
 * De toevalsgenerator komt van buiten (rng), zodat tests herhaalbaar zijn.
 */
import { chordsOf, type ChordSize } from './chords';
import { CHAR_CHORD_DEGREE } from './modes';
import { computeTargets, type Destination } from './navigation';
import { scaleOf, type ModeIndex } from './scale';

export type Rng = () => number;

/** Een kleine, zaaibare toevalsgenerator (mulberry32): dezelfde zaad = dezelfde reeks. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Kies een element naar gewicht. */
export function pick<T>(items: T[], weight: (x: T) => number, rng: Rng): T {
  const total = items.reduce((s, x) => s + weight(x), 0);
  let r = rng() * total;
  for (const x of items) { r -= weight(x); if (r < 0) return x; }
  return items[items.length - 1];
}

/** Gewicht per soort stap (sterkte 0 = kwintval … 3 = kwint omhoog). */
const STEP_WEIGHT = [6, 4, 2, 1];
export const SURPRISE_SIZES = [4, 8, 12, 16] as const;
/** Verminderde akkoorden klinken als spanning, niet als rustpunt: ze komen minder vaak voor. */
const DIMINISHED = new Set(['dim', 'm7b5', 'dim7']);

/** Het voorlaatste akkoord: V in Ionisch, anders het kenmerkende akkoord van de modus. */
export const cadenceDegree = (mode: ModeIndex) => (mode === 1 ? 4 : CHAR_CHORD_DEGREE[mode]);

/** Een willekeurig schema van n akkoorden (minstens 3) in de ladder home. */
export function surprise(home: { root: number; mode: ModeIndex }, size: ChordSize, n: number, rng: Rng): Destination[] {
  const count = Math.max(3, Math.round(n));
  const homeScale = scaleOf(home.root, home.mode);
  const tonic: Destination = { root: home.root, mode: home.mode, degree: 0 };
  const cadence: Destination = { ...tonic, degree: cadenceDegree(home.mode) };
  const same = (a: Destination, b: Destination) => chordsOf(scaleOf(a.root, a.mode), size)[a.degree].key === chordsOf(scaleOf(b.root, b.mode), size)[b.degree].key;
  const out: Destination[] = [tonic];
  let cur = tonic;
  // het midden: alles behalve het eerste akkoord en de cadens (voorlaatste + tonica)
  for (let i = 1; i < count - 2; i++) {
    const inHome = cur.root === home.root && cur.mode === home.mode;
    // na een leenakkoord: terug naar de eigen ladder, vanaf dezelfde trap
    const t = computeTargets(homeScale, size, cur.degree, 3);
    const last = i === count - 3; // het akkoord vóór de cadens: niet de cadens zelf, en liever niet de tonica
    let next: Destination;
    if (inHome && !last && rng() < 1 / 6 && t.borrowed.length) {
      next = pick(t.borrowed, (b) => 1 / b.distance, rng).to; // de dichtste buurmodi het vaakst
    } else {
      const options = t.diatonic.filter((d) => !same(d.to, cur) && !(last && (d.to.degree === cadence.degree || d.to.degree === 0)));
      next = pick(options, (d) => STEP_WEIGHT[d.strength] * (d.to.degree === 0 ? 0.4 : 1) * (DIMINISHED.has(d.chord.quality) ? 0.2 : 1), rng).to;
    }
    out.push(next);
    cur = next;
  }
  out.push(cadence, tonic);
  return out;
}
