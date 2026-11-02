/**
 * Akkoordliggingen. De bas speelt altijd de grondtoon. Voor een losse klik klinkt het akkoord in
 * grondligging; in een progressie kiezen we per akkoord de omkering die zo weinig mogelijk beweegt
 * ten opzichte van het vorige akkoord (stemvoering), zoals een pianist dat doet.
 */
import type { Chord } from '../core/theory';

/** Laagste toets van de akkoordtonen bij stemvoering: B2 tot B3. Zo blijft de ligging op één plek. */
const LOW = 47, HIGH = 59, CENTER = 60;

/** Bas: de grondtoon tussen G1 (31) en F♯2 (42). */
export function bassNote(c: Chord): number {
  const b = 36 + c.root.pc;
  return b > 42 ? b - 12 : b;
}

/** Grondligging: bas, dan de akkoordtonen oplopend vanaf de grondtoon. */
export function voicing(c: Chord): number[] {
  const bass = bassNote(c);
  const out = [bass];
  let prev = bass;
  for (const n of c.notes) {
    let m = bass + 12 + ((n.pc - c.root.pc + 12) % 12);
    while (m <= prev) m += 12;
    out.push(m);
    prev = m;
  }
  return out;
}

/** Alle liggingen in nauwe ligging (elke omkering) met de laagste noot tussen LOW en HIGH. */
function closePositions(c: Chord): number[][] {
  const pcs = c.notes.map((n) => n.pc);
  const out: number[][] = [];
  pcs.forEach((_, rot) => {
    const order = [...pcs.slice(rot), ...pcs.slice(0, rot)];
    for (let start = LOW; start <= HIGH; start++) {
      if (start % 12 !== order[0]) continue;
      const notes = [start];
      for (const pc of order.slice(1)) {
        let m = notes[notes.length - 1] + 1;
        while (m % 12 !== pc) m++;
        notes.push(m);
      }
      out.push(notes);
    }
  });
  return out;
}

/** Hoeveel halve tonen de stemmen samen bewegen: elke noot naar de dichtstbijzijnde noot van het andere akkoord. */
function movement(a: number[], b: number[]): number {
  const near = (m: number, set: number[]) => Math.min(...set.map((x) => Math.abs(x - m)));
  return a.reduce((s, m) => s + near(m, b), 0) + b.reduce((s, m) => s + near(m, a), 0);
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Kies de ligging die het dichtst bij de vorige ligt (of rond C4 voor het eerste akkoord). */
export function voiceLead(prev: number[] | null, c: Chord): number[] {
  let best: number[] = [];
  let bestCost = Infinity;
  for (const cand of closePositions(c)) {
    const centre = Math.abs(mean(cand) - CENTER);
    // de afstand tot het midden telt licht mee, zodat de ligging niet wegdrijft
    const cost = prev ? movement(prev, cand) + centre / 100 : centre;
    if (cost < bestCost) { best = cand; bestCost = cost; }
  }
  return [bassNote(c), ...best];
}

/**
 * Liggingen voor een hele progressie. Omdat de loop herhaalt, sluit het eerste akkoord ook
 * aan op het laatste: we rekenen twee keer, de tweede keer vanaf het einde van de eerste.
 */
export function progressionVoicings(chords: Chord[]): number[][] {
  const pass = (start: number[] | null) => {
    let prev = start;
    return chords.map((c) => {
      const v = voiceLead(prev, c);
      prev = v.slice(1);
      return v;
    });
  };
  const first = pass(null);
  return chords.length > 1 ? pass(first[first.length - 1].slice(1)) : first;
}
