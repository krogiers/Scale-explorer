/**
 * Herhalingen in het schema, zoals op een leadsheet: ‖: … :‖ ×N met eventueel een eerste en tweede volta.
 * De tekens staan op de akkoorden zelf (repStart, repEnd, volta), zodat ze meeschuiven als je akkoorden versleept.
 * Regels:
 * - Een herhaling loopt van een begin tot het eerstvolgende einde. Een einde zonder begin herhaalt vanaf het vorige
 *   einde, of vanaf het begin van het schema (zoals in notatie). Een begin zonder einde doet niets.
 * - Herhalingen in elkaar steken kan niet: een tweede begin binnen een open herhaling telt niet.
 * - Volta 1 speelt in elke doorgang behalve de laatste, volta 2 alleen in de laatste. Buiten een herhaling spelen
 *   ze gewoon (een volta 2 staat meestal net na het einde: die speelt dan na de laatste doorgang).
 */
import type { PathEntry } from './model';

export const REPEAT_TIMES = [2, 3, 4] as const;
export type RepeatTimes = (typeof REPEAT_TIMES)[number];
export type Volta = 1 | 2;
/** De tekens die je op een akkoord kunt zetten. */
export interface RepeatMarks { repStart?: boolean; repEnd?: RepeatTimes; volta?: Volta }
export interface RepeatSpan { start: number; end: number; times: RepeatTimes }

/** De herhalingen die gelden, van voor naar achter. */
export function repeatSpans(path: readonly RepeatMarks[]): RepeatSpan[] {
  const spans: RepeatSpan[] = [];
  let open: number | null = null;
  let after = 0; // waar een einde zonder begin vandaan herhaalt
  path.forEach((e, i) => {
    if (e.repStart && open === null) open = i;
    if (e.repEnd) {
      spans.push({ start: open ?? after, end: i, times: e.repEnd });
      open = null;
      after = i + 1;
    }
  });
  return spans;
}

/** De volgorde waarin de akkoorden klinken: indices in het schema, met de herhalingen uitgeschreven. */
export function playOrder(path: readonly RepeatMarks[]): number[] {
  const order: number[] = [];
  const spans = repeatSpans(path);
  let i = 0;
  for (const sp of spans) {
    for (; i < sp.start; i++) order.push(i);
    for (let pass = 1; pass <= sp.times; pass++) {
      const last = pass === sp.times;
      for (let j = sp.start; j <= sp.end; j++) {
        const v = path[j].volta;
        if ((v === 1 && last) || (v === 2 && !last)) continue;
        order.push(j);
      }
    }
    i = sp.end + 1;
  }
  for (; i < path.length; i++) order.push(i);
  // alles weggefilterd (bv. enkel volta's): speel dan gewoon het schema
  return order.length ? order : path.map((_, k) => k);
}

/** Alleen de geldige tekens van een opgeslagen akkoord (onzin wordt weggelaten). */
export function validMarks(e: { repStart?: unknown; repEnd?: unknown; volta?: unknown }): RepeatMarks {
  return {
    ...(e.repStart === true && { repStart: true }),
    ...((REPEAT_TIMES as readonly unknown[]).includes(e.repEnd) && { repEnd: e.repEnd as RepeatTimes }),
    ...((e.volta === 1 || e.volta === 2) && { volta: e.volta }),
  };
}

/** Een akkoord zonder herhaaltekens (bij kopiëren: geen tweede begin of einde). */
export const withoutMarks = ({ repStart: _s, repEnd: _e, volta: _v, ...rest }: PathEntry): PathEntry => rest;
