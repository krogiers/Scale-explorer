/**
 * Het verband tussen de 84 modi: 12 moederladders (in kwintvolgorde) × 7 modi.
 * Een rij in dat rooster heeft dezelfde noten (relatief), een diagonaal dezelfde grondtoon (parallel),
 * en één rij verder is precies één noot anders. Zie README, "Modi en bruggen".
 */
import { chordsOf, sharedNotes, type Chord, type ChordSize } from './chords';
import { fifthsIndex, mod12, pcFromFifths, type PitchClass } from './pitch';
import { MAJOR, MODE_OFFSET, scaleOf, type ModeIndex } from './scale';

/** Een plek in het rooster: grondtoon + modus. */
export interface Spot { root: PitchClass; mode: ModeIndex }
export const sameSpot = (a: Spot | null, b: Spot | null) => !!a && !!b && a.root === b.root && a.mode === b.mode;

/** Kenmerkend akkoord per modus (trap): Lyd II, Ion V, Mix ♭VII, Dor IV, Aeo ♭VI, Fry ♭II, Loc ♭V. Bevat telkens de kenmerkende noot. */
export const CHAR_CHORD_DEGREE = [1, 4, 6, 3, 5, 1, 4];

/** Kwintpositie van de moederladder (majeur) van een modus: C = 0, G = 1, F = 11. */
export const parentOf = (s: Spot) => fifthsIndex(mod12(s.root - MAJOR[MODE_OFFSET[s.mode]]));
/** Grondtoon van modus m in de moederladder op kwintpositie k. */
export const rootAt = (k: number, mode: ModeIndex) => mod12(pcFromFifths(k) + MAJOR[MODE_OFFSET[mode]]);
/** De modus van moederladder k die op grondtoon r begint, of -1 als r niet in die ladder zit. */
export function modeOn(k: number, r: PitchClass): ModeIndex | -1 {
  for (let m = 0; m < 7; m++) if (rootAt(k, m as ModeIndex) === mod12(r)) return m as ModeIndex;
  return -1;
}
/** Kwintafstand tussen twee moederladders, met teken: -6 tot 6. */
const signedK = (k: number) => { k = mod12(k); return k > 6 ? k - 12 : k; };

/** Aantal noten dat verschilt (0 = dezelfde moederladder, hoogstens 6). */
export function diffCount(a: Spot, b: Spot): number {
  const B = scaleOf(b.root, b.mode).pcs;
  return 7 - [...scaleOf(a.root, a.mode).pcs].filter((p) => B.has(p)).length;
}

export type JumpKind = 'same' | 'relative' | 'parallel' | 'neighbour';
export interface Bridge {
  kind: JumpKind;
  /** Noten van b die niet in a zitten. */
  newNotes: ReturnType<typeof scaleOf>['notes'];
  /** Akkoorden van b die ook in a zitten: hiermee stap je ongemerkt over. */
  shared: Chord[];
  /** Akkoorden van b met een nieuwe noot: die maken de sprong hoorbaar. */
  fresh: Chord[];
  /** Akkoorden van a die in b niet meer bestaan. */
  gone: Chord[];
  /** Tonica en kenmerkend akkoord van b. */
  tonic: Chord;
  char: Chord;
}

/** Alles wat je nodig hebt om van modus a naar modus b te gaan. Akkoorden worden vergeleken op `key`, los van de spelling. */
export function bridge(a: Spot, b: Spot, size: ChordSize): Bridge {
  const A = scaleOf(a.root, a.mode), B = scaleOf(b.root, b.mode);
  const ca = chordsOf(A, size), cb = chordsOf(B, size);
  const ka = new Set(ca.map((c) => c.key)), kb = new Set(cb.map((c) => c.key));
  const newNotes = B.notes.filter((n) => !A.pcs.has(n.pc));
  const kind: JumpKind = sameSpot(a, b) ? 'same' : newNotes.length === 0 ? 'relative' : a.root === b.root ? 'parallel' : 'neighbour';
  return {
    kind, newNotes,
    shared: cb.filter((c) => ka.has(c.key)),
    fresh: cb.filter((c) => !ka.has(c.key)),
    gone: ca.filter((c) => !kb.has(c.key)),
    tonic: cb[0], char: cb[CHAR_CHORD_DEGREE[b.mode]],
  };
}

/**
 * Een brug- en een sprongakkoord kiezen: de sprong brengt de nieuwe noot (bij voorkeur het kenmerkende akkoord,
 * anders een niet-verminderd akkoord), de brug ligt er zo dicht mogelijk bij (meeste gedeelde noten).
 */
export function pickPair(br: Bridge): { pivot: Chord | null; signal: Chord | null } {
  const signal = br.fresh.find((c) => c.key === br.char.key) ?? br.fresh.find((c) => c.quality !== 'dim' && c.quality !== 'm7b5') ?? br.fresh[0] ?? null;
  const pivot = signal ? [...br.shared].sort((x, y) => sharedNotes(y, signal) - sharedNotes(x, signal))[0] ?? null : null;
  return { pivot, signal };
}

export interface RouteStep { from: Spot; to: Spot; bridge: Bridge; pivot: Chord | null; signal: Chord | null }

/**
 * Kortste route van a naar b: één noot per stap (één kwint op de cirkel van moederladders).
 * Tussenstations houden de grondtoon van a vast als dat kan (parallel lenen), anders die van b.
 * Klopt de moederladder al maar niet de grondtoon, dan volgt een relatieve stap: alleen het thuis verschuift.
 */
export function route(a: Spot, b: Spot, size: ChordSize): RouteStep[] {
  const ka = parentOf(a), d = signedK(parentOf(b) - ka), dir = Math.sign(d);
  const steps: RouteStep[] = [];
  let cur = a;
  for (let i = 1; i <= Math.abs(d); i++) {
    const k = mod12(ka + dir * i);
    let next: Spot;
    if (i === Math.abs(d)) next = b;
    else {
      const ma = modeOn(k, a.root), mb = modeOn(k, b.root);
      next = ma !== -1 ? { root: a.root, mode: ma } : mb !== -1 ? { root: b.root, mode: mb } : { root: rootAt(k, 1), mode: 1 };
    }
    const br = bridge(cur, next, size);
    steps.push({ from: cur, to: next, bridge: br, ...pickPair(br) });
    cur = next;
  }
  if (!sameSpot(cur, b)) steps.push({ from: cur, to: b, bridge: bridge(cur, b, size), pivot: null, signal: null });
  return steps;
}

/** Eén rij van de brugmatrix: een akkoord en de parallelle modi (altijd aaneengesloten) waarin het voorkomt. */
export interface MatrixRow { chord: Chord; modes: ModeIndex[] }

/**
 * Alle akkoorden die in de zeven modi op deze grondtoon voorkomen (25 drieklanken of 31 vierklanken),
 * gesorteerd van helder naar donker. Elk akkoord zit in hoogstens 3 buurmodi.
 */
export function chordsOnRoot(root: PitchClass, size: ChordSize): MatrixRow[] {
  const map = new Map<string, MatrixRow>();
  for (let m = 0; m < 7; m++) {
    for (const c of chordsOf(scaleOf(root, m as ModeIndex), size)) {
      if (!map.has(c.key)) map.set(c.key, { chord: c, modes: [] });
      map.get(c.key)!.modes.push(m as ModeIndex);
    }
  }
  return [...map.values()].sort((a, b) => a.modes[0] - b.modes[0] || a.modes[a.modes.length - 1] - b.modes[b.modes.length - 1]
    || fifthsIndex(a.chord.root.pc) - fifthsIndex(b.chord.root.pc));
}
