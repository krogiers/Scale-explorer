/**
 * De verzonnen melodie als leadsheet: per maat de noten en rusten in gewone notenwaarden, met de akkoorden erboven.
 * Puur rekenwerk (zonder React), zodat het te testen is; LeadSheet tekent het.
 * - Een noot die niet in één waarde past, wordt gesplitst en overgebonden (bv. 3 tellen vanaf tel 2 = kwart + halve).
 * - Gaten tussen noten worden rusten (zonder punt, zoals gebruikelijk).
 * - Een noot die over de maatstreep loopt, wordt op de maatstreep gesplitst en overgebonden.
 */
import type { Chord, MelodyNote, MelodyStep, Note } from '../core';

export interface SheetEvent {
  /** begin in tellen binnen de maat */
  at: number;
  dur: number;
  rest: boolean;
  /** klinkende toonhoogte en spelling (uit de ladder van het akkoord), alleen bij noten */
  midi?: number;
  note?: Note;
  /** overgebonden naar de volgende noot */
  tie?: boolean;
  /** de stap in de tijdlijn en het absolute begin (in tellen) van de oorspronkelijke noot, om ze te laten oplichten */
  step: number;
  start: number;
}
export interface SheetBar { events: SheetEvent[]; chords: { at: number; chord: Chord }[] }

/**
 * Een duur vanaf `at` in de maat opdelen in schrijfbare waarden (4 = hele, 3 = halve met punt, 2 = halve,
 * 1.5 = kwart met punt, 1 = kwart, 0.5 = achtste). Een waarde mag alleen beginnen waar ze de tel niet verdoezelt:
 * een halve op een even tel, een kwart met punt op een zware tel, een hele en een halve met punt aan het begin.
 */
export function splitDur(at: number, len: number, meter: number, rest = false): number[] {
  const out: number[] = [];
  let t = at, left = len;
  const ok = (v: number) => {
    if (v > left + 1e-9) return false;
    if (v === 4) return meter === 4 && t === 0;
    if (v === 3) return !rest && t === 0;
    if (v === 2) return Number.isInteger(t) && (meter === 3 ? t <= 1 : t % 2 === 0);
    if (v === 1.5) return !rest && Number.isInteger(t) && (meter === 3 ? t === 0 : t % 2 === 0);
    if (v === 1) return Number.isInteger(t);
    return true;
  };
  while (left > 1e-9) {
    const v = [4, 3, 2, 1.5, 1, 0.5].find(ok) ?? Math.min(0.5, left);
    out.push(v);
    t += v; left -= v;
  }
  return out;
}

/** De melodie (per stap van de tijdlijn) in maten van `meter` tellen. Een volle maat rust wordt één hele rust. */
export function sheetBars(steps: MelodyStep[], notes: MelodyNote[][], meter: number): SheetBar[] {
  const starts: number[] = [];
  let total = 0;
  for (const s of steps) { starts.push(total); total += s.beats; }
  const barCount = Math.max(1, Math.ceil(total / meter));
  const bars: SheetBar[] = Array.from({ length: barCount }, () => ({ events: [], chords: [] }));
  // akkoorden boven de balk; hetzelfde akkoord nog eens (bv. een herhaling) schrijf je niet opnieuw
  steps.forEach((s, i) => {
    if (i > 0 && steps[i - 1].chord.key === s.chord.key) return;
    bars[Math.floor(starts[i] / meter)]?.chords.push({ at: starts[i] % meter, chord: s.chord });
  });
  // alle noten absoluut, in volgorde
  const flat = notes.flatMap((ns, i) => ns.map((n) => ({ ...n, at: starts[i] + n.at, step: i })));
  let t = 0;
  const push = (from: number, len: number, base: Omit<SheetEvent, 'at' | 'dur' | 'tie'>) => {
    // op de maatstrepen knippen, dan per maat opdelen
    let a = from, left = len;
    while (left > 1e-9) {
      const bar = Math.floor(a / meter + 1e-9), inBar = a - bar * meter;
      const piece = Math.min(left, meter - inBar);
      const fullRest = base.rest && inBar === 0 && piece === meter;
      const parts = fullRest ? [meter] : splitDur(inBar, piece, meter, base.rest);
      let x = inBar;
      parts.forEach((d, k) => {
        const last = k === parts.length - 1 && left - piece < 1e-9;
        bars[bar]?.events.push({ ...base, at: x, dur: d, ...(!base.rest && !last && { tie: true }) });
        x += d;
      });
      a += piece; left -= piece;
    }
  };
  for (const n of flat) {
    if (n.at > t + 1e-9) push(t, n.at - t, { rest: true, step: n.step, start: t });
    const note = steps[n.step].scale.notes.find((x) => x.pc === n.midi % 12) ?? { pc: n.midi % 12, letter: 0, acc: 0 };
    push(n.at, n.dur, { rest: false, midi: n.midi, note, step: n.step, start: n.at });
    t = n.at + n.dur;
  }
  const end = barCount * meter;
  if (end > t + 1e-9) push(t, end - t, { rest: true, step: steps.length - 1, start: t });
  return bars;
}
