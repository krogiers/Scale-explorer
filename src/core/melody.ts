/**
 * Een verzonnen melodie over het schema ("Verzin een melodie"). Toeval met regels, zodat het als een liedje klinkt,
 * en in de stijl van de begeleiding (MelodyStyle):
 * - Ritme: per maat een patroon uit de bibliotheek van de stijl. Een frase van vier maten heeft de vorm A A B slot,
 *   zodat motiefjes terugkomen. Swing en blues hebben gesyncopeerde achtsten, bebop lopende achtsten, funk korte
 *   zestienden met rusten, bossa lange noten met verschuivingen, country "rolls" in achtsten.
 * - Toonhoogte: op een zware tel (of de eerste noot van een nieuw akkoord) een akkoordnoot dicht bij de vorige;
 *   daartussen stapjes in de ladder van de stijl (de ladder van het akkoord, de bebopladder met zijn doorgangsnoot,
 *   de pentatonische ladder of de bluesladder van de toonaard), soms een sprong in het akkoord (arpeggio). Wisselt de
 *   ladder, dan begint het akkoord vaak op de noot die verandert (de brug). Het laatste akkoord eindigt op zijn grondtoon.
 * - Daarna, per stijl: een chromatische naderingsnoot vóór een akkoordnoot op de tel (een halve toon eronder of
 *   erboven), bij bebop een omspeling (bovenbuur, dan chromatisch van onder), en anticipaties: de eerste noot van een
 *   nieuw akkoord komt een halve tel te vroeg ("net vóór de tel") en wordt overgebonden.
 * - Riffs (blues, funk): de tweede A-maat herhaalt de toonhoogtes van de eerste, zoals vraag en antwoord.
 * - Bereik: C4 tot A5 (midi 60–81), zodat het in de melodieklank goed ligt (naderingsnoten mogen er een halve toon buiten).
 * Uitvoer per stap van de tijdlijn: noten met hun begin en duur in tellen vanaf het begin van die stap. Een noot buiten de
 * ladder van zijn stap (naderingsnoot, blue note, anticipatie) draagt zijn spelling mee in `note`.
 * Swing speel je lang-kort: dat doet de speler (de noten staan hier recht, zoals op papier).
 */
import { pentatonic } from './colour';
import type { Chord } from './chords';
import { accidentalFor, mod12, type Note } from './pitch';
import { CHAR_DEGREE, type Scale } from './scale';
import { pick, type Rng } from './surprise';

export interface MelodyNote { at: number; dur: number; midi: number; note?: Note }
export interface MelodyStep { scale: Scale; chord: Chord; beats: number }
export const MELODY_STYLES = ['plain', 'swing', 'bebop', 'blues', 'bossa', 'funk', 'country'] as const;
export type MelodyStyle = (typeof MELODY_STYLES)[number];

const LOW = 60, HIGH = 81;
type Pattern = [number, number][]; // [begin, duur] in tellen binnen de maat; wat ontbreekt is rust
type Lib = Record<3 | 4, Pattern[]>;
const e8 = (from: number, to: number): Pattern => Array.from({ length: (to - from) * 2 }, (_, i) => [from + i / 2, 0.5]);

interface Profile {
  patterns: Lib;
  endings: Lib;
  /** kans op een chromatische naderingsnoot vóór een akkoordnoot op de tel */
  chromatic: number;
  /** kans op een omspeling (bebop): bovenbuur uit de ladder, dan chromatisch van onder */
  enclose: number;
  /** kans dat de eerste noot van een nieuw akkoord een halve tel te vroeg komt */
  anticipate: number;
  /** waaruit de noten tussen de tellen komen */
  pool: 'scale' | 'bebop' | 'penta' | 'blues';
  /** kans dat de tweede A-maat de toonhoogtes van de eerste herhaalt */
  riff: number;
  /** kans op een sprong naar een akkoordnoot in plaats van een stap */
  arp: number;
  /** kans dat een stapje van richting wisselt (bebop loopt liever lang in één richting) */
  turn: number;
}

const PLAIN: Lib = {
  4: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[0, 1.5], [1.5, 0.5], [2, 2]],
    [[0, 0.5], [0.5, 0.5], [1, 1], [2, 2]],
    [[0, 2], [2, 1], [3, 1]],
    [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1.5]],
    [[1, 1], [2, 1], [3, 1]],
    [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 2]],
    [[0, 1], [1.5, 0.5], [2, 1], [3, 1]],
  ],
  3: [
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [2, 1]],
    [[0, 1.5], [1.5, 0.5], [2, 1]],
    [[0, 0.5], [0.5, 0.5], [1, 2]],
    [[1, 1], [2, 1]],
  ],
};
const PLAIN_END: Lib = { 4: [[[0, 2], [2, 2]], [[0, 1], [1, 3]], [[0, 4]]], 3: [[[0, 3]], [[0, 1], [1, 2]]] };

const PROFILES: Record<MelodyStyle, Profile> = {
  plain: { patterns: PLAIN, endings: PLAIN_END, chromatic: 0, enclose: 0, anticipate: 0, pool: 'scale', riff: 0, arp: 0.1, turn: 0.35 },
  // swing: achtsten met verschuivingen, noten die over de tel heen lopen, af en toe een chromatische nadering
  swing: {
    patterns: {
      4: [
        [[0, 1], [1, 0.5], [1.5, 1], [2.5, 0.5], [3, 1]],
        [[0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1], [3, 0.5], [3.5, 0.5]],
        [[0, 1.5], [1.5, 1], [2.5, 1.5]],
        [[0, 0.5], [0.5, 0.5], [1, 1], [2.5, 0.5], [3, 1]],
        [[1, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 1.5]],
        [[0, 1], [1.5, 0.5], [2, 1.5], [3.5, 0.5]],
      ],
      3: [[[0, 1], [1, 0.5], [1.5, 1.5]], [[0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1]], [[0, 1.5], [1.5, 1.5]], [[0, 0.5], [0.5, 0.5], [1, 1], [2.5, 0.5]]],
    },
    endings: { 4: [[[0, 1], [1, 0.5], [1.5, 2.5]], [[0, 0.5], [0.5, 1.5]], [[0, 1.5], [1.5, 2.5]]], 3: [[[0, 0.5], [0.5, 2.5]], [[0, 3]]] },
    chromatic: 0.3, enclose: 0, anticipate: 0.35, pool: 'scale', riff: 0, arp: 0.2, turn: 0.35,
  },
  // bebop: lopende achtsten (vaak beginnend op de "en"), dalend door de bebopladder, met omspelingen; slot kort op de "en"
  bebop: {
    patterns: {
      4: [e8(0, 4), e8(0, 4).slice(1), [...e8(0, 3), [3, 1]], [[0, 1], ...e8(1, 4)], e8(1, 4), [...e8(0, 2), [2, 1], ...e8(3, 4)]],
      3: [e8(0, 3), e8(0, 3).slice(1), [[0, 1], ...e8(1, 3)]],
    },
    endings: { 4: [[...e8(0, 1.5), [1.5, 0.5]], [[0, 0.5], [0.5, 1]]], 3: [[...e8(0, 1.5), [1.5, 0.5]]] },
    chromatic: 0.5, enclose: 0.35, anticipate: 0.3, pool: 'bebop', riff: 0, arp: 0.15, turn: 0.2,
  },
  // blues (shuffle): korte riffs uit de bluesladder van de toonaard, vraag en antwoord, rusten om te ademen
  blues: {
    patterns: {
      4: [
        [[0, 0.5], [0.5, 1], [1.5, 0.5], [2, 2]],
        [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1]],
        [[0.5, 0.5], [1, 0.5], [1.5, 1.5]],
        [[0, 0.5], [0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 1]],
        [[0, 1.5], [1.5, 0.5], [2, 0.5], [2.5, 1.5]],
      ],
      3: [[[0, 0.5], [0.5, 1], [1.5, 1.5]], [[0.5, 0.5], [1, 0.5], [1.5, 1.5]], [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1]]],
    },
    endings: { 4: [[[0, 1], [1, 3]], [[0, 0.5], [0.5, 0.5], [1, 3]]], 3: [[[0, 3]], [[0, 0.5], [0.5, 2.5]]] },
    chromatic: 0.2, enclose: 0, anticipate: 0.25, pool: 'blues', riff: 0.7, arp: 0.15, turn: 0.4,
  },
  // bossa: lange, zingende noten, vaak verschoven naar de "en" (de clave), stapjes in de ladder
  bossa: {
    patterns: {
      4: [
        [[0, 1.5], [1.5, 2.5]],
        [[0, 1], [1, 0.5], [1.5, 1], [2.5, 1.5]],
        [[0.5, 1], [1.5, 1], [2.5, 1.5]],
        [[0, 1], [1, 1], [2, 1.5], [3.5, 0.5]],
        [[0, 0.5], [0.5, 1], [1.5, 0.5], [2, 2]],
      ],
      3: [[[0, 1.5], [1.5, 1.5]], [[0, 1], [1, 0.5], [1.5, 1.5]], [[0.5, 1], [1.5, 1.5]]],
    },
    endings: PLAIN_END,
    chromatic: 0.1, enclose: 0, anticipate: 0.5, pool: 'scale', riff: 0, arp: 0.1, turn: 0.3,
  },
  // funk: korte zestienden met rusten, pentatonisch, herhaalde riffs
  funk: {
    patterns: {
      4: [
        [[0, 0.25], [0.25, 0.25], [0.75, 0.25], [1.5, 0.5], [2.5, 0.25], [2.75, 0.25], [3.5, 0.5]],
        [[0, 0.5], [0.75, 0.25], [1, 0.25], [1.5, 0.5], [2.25, 0.25], [2.5, 0.5], [3.25, 0.25], [3.5, 0.25]],
        [[0, 0.25], [0.5, 0.25], [0.75, 0.25], [1, 0.5], [2, 0.25], [2.25, 0.25], [2.75, 0.25], [3, 0.5]],
        [[0.5, 0.25], [0.75, 0.25], [1, 0.5], [1.75, 0.25], [2, 0.5], [3, 0.25], [3.25, 0.25], [3.5, 0.25], [3.75, 0.25]],
      ],
      3: [[[0, 0.25], [0.25, 0.25], [0.75, 0.25], [1.5, 0.5], [2.5, 0.25], [2.75, 0.25]], [[0, 0.5], [0.75, 0.25], [1, 0.25], [1.5, 0.5], [2.25, 0.25], [2.5, 0.5]]],
    },
    endings: { 4: [[[0, 0.25], [0.25, 0.25], [0.75, 0.25], [1, 1]], [[0, 0.5], [0.75, 0.25], [1, 2]]], 3: [[[0, 0.25], [0.25, 0.25], [0.75, 0.25], [1, 1]]] },
    chromatic: 0.15, enclose: 0, anticipate: 0.3, pool: 'penta', riff: 0.6, arp: 0.2, turn: 0.5,
  },
  // country: rolls in achtsten door de akkoordnoten, majeur-pentatonisch, de "country-slide" van ♭3 naar 3
  country: {
    patterns: {
      4: [
        e8(0, 4),
        [[0, 1], [1, 0.5], [1.5, 0.5], [2, 1], [3, 1]],
        [[0, 0.5], [0.5, 0.5], [1, 1], [2, 0.5], [2.5, 0.5], [3, 1]],
        [[0, 1.5], [1.5, 0.5], [2, 2]],
        [[0.5, 0.5], [1, 0.5], [1.5, 0.5], [2, 2]],
      ],
      3: [[[0, 1], [1, 1], [2, 1]], [...e8(0, 2), [2, 1]], [[0, 2], [2, 1]]],
    },
    endings: { 4: [[[0, 0.5], [0.5, 0.5], [1, 1], [2, 2]], [[0, 1], [1, 3]]], 3: [[[0, 0.5], [0.5, 0.5], [1, 2]], [[0, 3]]] },
    chromatic: 0.3, enclose: 0, anticipate: 0.15, pool: 'penta', riff: 0, arp: 0.55, turn: 0.35,
  },
};

/** Alle midi-noten in het bereik waarvan de toonklasse in pcs zit. */
const inRange = (pcs: Set<number>) => Array.from({ length: HIGH - LOW + 1 }, (_, i) => LOW + i).filter((m) => pcs.has(m % 12));

/** Een chromatische buur van `target` (onder: de letter eronder verhoogd, boven: de letter erboven verlaagd). */
function neighbour(target: Note, below: boolean): Note {
  const pc = mod12(target.pc + (below ? -1 : 1));
  let letter = (target.letter + (below ? 6 : 1)) % 7;
  if (Math.abs(accidentalFor(pc, letter)) > 1) letter = target.letter;
  return { pc, letter, acc: accidentalFor(pc, letter) };
}
/** Een noot op `semis` boven de grondtoon van s, gespeld op de trap `degree` (0 = grondtoon). */
const onDegree = (s: Scale, semis: number, degree: number): Note => {
  const pc = mod12(s.root + semis), letter = (s.notes[0].letter + degree) % 7;
  return { pc, letter, acc: accidentalFor(pc, letter) };
};
/** De doorgangsnoot van de bebopladder: grote septiem (dominant), overmatige kwint (majeur) of grote terts (Dorisch). */
function bebopPassing(s: Scale): Note | null {
  if (s.mode === 2) return onDegree(s, 11, 6);
  if (s.mode === 1 || s.mode === 0) return onDegree(s, 8, 4);
  if (s.mode === 3) return onDegree(s, 4, 2);
  return null;
}
/** De bluesladder op de tonica: 1 ♭3 4 ♭5 5 ♭7. */
const bluesScale = (home: Scale): Note[] => [onDegree(home, 0, 0), onDegree(home, 3, 2), onDegree(home, 5, 3), onDegree(home, 6, 4), onDegree(home, 7, 4), onDegree(home, 10, 6)];

interface Raw { at: number; dur: number; midi: number; step: number; note?: Note; strong: boolean }

export function makeMelody(steps: MelodyStep[], meter: number, rng: Rng, style: MelodyStyle = 'plain'): MelodyNote[][] {
  const out: MelodyNote[][] = steps.map(() => []);
  if (steps.length === 0) return out;
  const P = PROFILES[style] ?? PROFILES.plain;
  const m = meter === 3 ? 3 : 4;
  const starts: number[] = [];
  let total = 0;
  for (const s of steps) { starts.push(total); total += s.beats; }
  const bars = Math.ceil(total / m);
  const lib = P.patterns[m];
  const A = pick(lib, () => 1, rng), B = pick(lib.filter((p) => p !== A), () => 1, rng);
  const end = pick(P.endings[m], () => 1, rng);
  const finalEnd = P.endings[m][P.endings[m].length - 1];
  const stepAt = (beat: number) => { let i = 0; while (i + 1 < steps.length && starts[i + 1] <= beat + 1e-9) i++; return i; };
  const home = steps[0].scale;
  const blues = bluesScale(home);

  /** De noten waaruit de stapjes komen, met hun spelling (wat niet in de ladder zit, krijgt zijn spelling mee). */
  const poolOf = (s: Scale): Note[] => {
    if (P.pool === 'penta') return pentatonic(s).notes;
    if (P.pool === 'blues') return blues;
    if (P.pool === 'bebop') { const x = bebopPassing(s); return x && !s.pcs.has(x.pc) ? [...s.notes, x] : s.notes; }
    return s.notes;
  };

  const raw: Raw[] = [];
  const barPitches: number[][] = [];
  let prev = 69; // begin rond A4
  let dir = style === 'bebop' ? -1 : rng() < 0.5 ? 1 : -1;
  let lastStep = -1;
  for (let bar = 0; bar < bars; bar++) {
    const finalBar = bar === bars - 1;
    const pattern = finalBar ? finalEnd : [A, A, B, end][bar % 4];
    // riff: de tweede A-maat neemt de toonhoogtes van de eerste over (als ze in de ladder van nu passen)
    const riff = P.riff > 0 && bar % 4 === 1 && !finalBar && rng() < P.riff ? barPitches[bar - 1] : undefined;
    barPitches[bar] = [];
    // de laatste noot van alles (ook als de slotfrase vóór het einde van de maat stopt, zoals bij bebop)
    const lastK = finalBar ? pattern.reduce((a, [o], k) => (bar * m + o < total - 1e-9 ? k : a), -1) : -1;
    pattern.forEach(([onset, len], k) => {
      const at = bar * m + onset;
      if (at >= total - 1e-9) return;
      const i = stepAt(at);
      const { scale, chord } = steps[i];
      const stepEnd = starts[i] + steps[i].beats;
      const newChord = i !== lastStep;
      const strong = onset === 0 || (m === 4 && onset === 2) || newChord;
      const charPc = scale.notes[CHAR_DEGREE[scale.mode]].pc;
      const weightNear = (x: number) => { const d = Math.abs(x - prev); return d === 0 ? 0.5 : d <= 2 ? 4 : d <= 4 ? 3 : d <= 7 ? 1 : 0; };
      const charBonus = (x: number) => (x % 12 === charPc ? 1.5 : 1);
      const pool = poolOf(scale);
      const poolPcs = new Set(pool.map((n) => n.pc));
      let midi: number;
      const prevScale = lastStep >= 0 ? steps[lastStep].scale : null;
      const bridge = newChord && prevScale ? scale.notes.filter((n) => !prevScale.pcs.has(n.pc)).map((n) => n.pc) : [];
      const isLast = k === lastK;
      const again = riff?.[k];
      if (isLast) {
        midi = pick(inRange(new Set([chord.root.pc])), (x) => weightNear(x) + 0.01, rng);
      } else if (again !== undefined && (scale.pcs.has(again % 12) || poolPcs.has(again % 12))) {
        midi = again;
      } else if (bridge.length && rng() < 0.6) {
        midi = pick(inRange(new Set(bridge)), (x) => weightNear(x) + 0.01, rng);
      } else if (strong) {
        // bij blues tellen ook de ♭3 en de ♭5 van de toonaard als "akkoordnoot": de blue notes
        const tones = new Set(chord.pcs);
        if (P.pool === 'blues') { tones.add(blues[1].pc); if (rng() < 0.3) tones.add(blues[3].pc); }
        midi = pick(inRange(tones), (x) => (weightNear(x) + 0.01) * charBonus(x), rng);
      } else if (rng() < P.arp) {
        // een sprong naar de dichtstbijzijnde akkoordnoot in de richting die we gaan
        const ahead = inRange(chord.pcs).filter((x) => (dir > 0 ? x > prev : x < prev));
        midi = ahead.length ? (dir > 0 ? ahead[0] : ahead[ahead.length - 1]) : pick(inRange(chord.pcs), (x) => weightNear(x) + 0.01, rng);
      } else {
        // stapjes in de ladder van de stijl: meestal één trap, soms twee, liefst in dezelfde richting
        const ladder = inRange(poolPcs);
        const at0 = ladder.reduce((best, x, j) => (Math.abs(x - prev) < Math.abs(ladder[best] - prev) ? j : best), 0);
        if (rng() < P.turn) dir = -dir;
        const size = rng() < 0.8 ? 1 : 2;
        let j = at0 + dir * size;
        if (j < 0 || j >= ladder.length) { dir = -dir; j = at0 + dir * size; }
        midi = ladder[Math.max(0, Math.min(ladder.length - 1, j))];
      }
      const spelled = scale.pcs.has(midi % 12) ? undefined : pool.find((n) => n.pc === midi % 12);
      raw.push({ at, dur: Math.min(len, stepEnd - at), midi, step: i, strong, ...(spelled && { note: spelled }) });
      barPitches[bar].push(midi);
      dir = midi > prev ? 1 : midi < prev ? -1 : dir;
      prev = midi;
      lastStep = i;
    });
  }

  // chromatiek: vóór een akkoordnoot op de tel, als de noot ervoor een achtste (of korter) is die er vlak voor ligt
  const spellIn = (r: Raw): Note => r.note ?? steps[r.step].scale.notes.find((n) => n.pc === r.midi % 12) ?? { pc: r.midi % 12, letter: 0, acc: 0 };
  const contiguous = (a: Raw, b: Raw) => Math.abs(a.at + a.dur - b.at) < 1e-9 && a.dur <= 0.5;
  for (let k = 1; k < raw.length; k++) {
    const t = raw[k], p = raw[k - 1];
    if (!t.strong || !Number.isInteger(t.at) || !steps[t.step].chord.pcs.has(t.midi % 12) || !contiguous(p, t) || k === raw.length - 1) continue;
    const target = spellIn(t);
    const pp = raw[k - 2];
    if (P.enclose && pp && contiguous(pp, p) && rng() < P.enclose) {
      // omspeling: de ladder-noot erboven, dan een halve toon eronder, dan het doel
      const above = inRange(steps[t.step].scale.pcs).find((x) => x > t.midi);
      if (above !== undefined) {
        pp.midi = above; pp.note = spellIn({ ...pp, step: t.step, midi: above, note: undefined });
        p.midi = t.midi - 1; p.note = neighbour(target, true);
        continue;
      }
    }
    if (rng() < P.chromatic) {
      const below = rng() < 0.7;
      p.midi = t.midi + (below ? -1 : 1);
      p.note = neighbour(target, below);
    }
  }

  // anticipatie: de eerste noot van een nieuw akkoord komt een halve tel te vroeg en loopt over de tel heen
  for (let k = 1; k < raw.length; k++) {
    const t = raw[k], p = raw[k - 1];
    const first = t.step > 0 && Math.abs(t.at - starts[t.step]) < 1e-9 && p.step !== t.step;
    if (!first || t.step === steps.length - 1 && k === raw.length - 1 || !(rng() < P.anticipate)) continue;
    const early = t.at - 0.5;
    if (p.at > early - 0.25) continue; // er moet ruimte zijn: de vorige noot wordt hoogstens ingekort
    p.dur = Math.min(p.dur, early - p.at);
    t.note = spellIn(t);
    t.at = early; t.dur += 0.5;
  }

  for (const r of raw) {
    const i = stepAt(r.at);
    out[i].push({ at: r.at - starts[i], dur: r.dur, midi: r.midi, ...(r.note && { note: r.note }) });
  }
  return out;
}
