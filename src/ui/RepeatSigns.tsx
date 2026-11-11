import type { PathEntry } from '../state';
import type { Segment } from './chartLayout';

/**
 * Herhaaltekens in een vak van het schema: ‖: waar het akkoord begint, :‖ ×N waar het eindigt, en een volta-haak
 * boven alle maten van een volta-akkoord (met 1. of 2. bij het begin). Alleen om te zien; de uitleg staat in aria-label.
 */
export function RepeatSigns({ p, seg }: { p: PathEntry; seg: Pick<Segment, 'start' | 'end'> }) {
  return (
    <>
      {p.volta && <span className={`volta${seg.start ? ' first' : ''}`} aria-hidden="true">{seg.start ? `${p.volta}.` : ''}</span>}
      {p.repStart && seg.start && <span className="rep rep-l" aria-hidden="true" />}
      {p.repEnd && seg.end && <><span className="rep rep-r" aria-hidden="true" /><span className="rep-n" aria-hidden="true">×{p.repEnd}</span></>}
    </>
  );
}

/** Klassen voor het vak, zodat de tekst plaats maakt voor de tekens. */
export const repeatClass = (p: PathEntry, seg: Pick<Segment, 'start' | 'end'>) =>
  `${p.repStart && seg.start ? ' has-rep-l' : ''}${p.repEnd && seg.end ? ' has-rep-r' : ''}${p.volta ? ' has-volta' : ''}`;
