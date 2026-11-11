/** Verdeelt akkoorden met een duur in tellen over maten, zoals op een akkoordenschema. */
export interface Segment {
  /** Index van het akkoord in het schema. */
  index: number;
  /** Hoeveel tellen van dit akkoord in deze maat vallen. */
  beats: number;
  /** Begint het akkoord in deze maat (dan tonen we de naam), of loopt het door uit een vorige maat? */
  start: boolean;
  /** Eindigt het akkoord in deze maat (daar staat een eventueel herhaalteken :‖)? */
  end: boolean;
}
export interface Bar { segments: Segment[] }

export function layoutBars(durations: number[], meter: number): Bar[] {
  const bars: Bar[] = [];
  let current: Bar = { segments: [] };
  let free = meter;
  durations.forEach((total, index) => {
    let left = total;
    let start = true;
    while (left > 0) {
      const take = Math.min(left, free);
      left -= take;
      current.segments.push({ index, beats: take, start, end: left === 0 });
      start = false;
      free -= take;
      if (free === 0) { bars.push(current); current = { segments: [] }; free = meter; }
    }
  });
  if (current.segments.length > 0) bars.push(current);
  return bars;
}
