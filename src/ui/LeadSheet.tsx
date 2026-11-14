import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LETTER_PC, type Chord, type MelodyNote, type MelodyStep, type Note } from '../core';
import { sheetBars, type SheetEvent } from './sheetLayout';

/** Halve afstand tussen twee lijnen (één trap op de balk), in px. Trap 0 = onderste lijn (E4 in de solsleutel). */
const H = 5;
const BOTTOM = 2 + 7 * 4; // E4 als diatonische trap (letter + 7 × octaaf)
const HI = 17, LO = -5; // vaste hoogte per regel: akkoorden boven, hulplijnen onder
const CHORD_P = 14; // basislijn van de akkoordsymbolen
const BEAT = 46, PAD_L = 22, PAD_R = 10, CLEF_W = 40;
const ACC: Record<number, string> = { 1: '♯', [-1]: '♭', 0: '♮' };
const y = (p: number) => (HI - p) * H;

/** De trap op de balk van een geschreven noot met zijn geschreven toonhoogte. */
const place = (n: Note, midi: number) => n.letter + 7 * Math.round((midi - n.acc - LETTER_PC[n.letter]) / 12 - 1) - BOTTOM;

/** Breedte van een maat: vast per maatsoort, zodat de tellen onder elkaar staan. */
const barW = (meter: number) => PAD_L + meter * BEAT + PAD_R;

/** Hoeveel maten per regel: 4, of 2 als het vak smal is (telefoon). */
function usePerRow(ref: React.RefObject<HTMLElement | null>) {
  const [n, setN] = useState(4);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setN(e.contentRect.width < 560 ? 2 : 4));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return n;
}

/** Rusten getekend als vormen (geen lettertype nodig). */
function Rest({ x, dur }: { x: number; dur: number }) {
  if (dur >= 3) return <rect className="rs" x={x - 6} y={y(6)} width={12} height={H} />; // hele rust hangt aan de 4e lijn
  if (dur === 2) return <rect className="rs" x={x - 6} y={y(4) - H} width={12} height={H} />; // halve rust ligt op de middelste lijn
  if (dur === 1) return <path className="rs" d={`M${x - 2} ${y(7.5)} l5 6 l-4 5 l5 6 c-5 -2 -8 1 -4 6 c-8 -4 -5 -10 0 -7 l-6 -7 l4 -4 z`} />;
  // achtste rust: bolletje met een schuine staart
  return <g className="rs"><circle cx={x - 2} cy={y(5)} r={2.6} /><path d={`M${x - 2} ${y(5) + 2} q4 1 6 -3 l-5 13`} fill="none" strokeWidth={1.6} /></g>;
}

interface Placed extends SheetEvent { x: number; p: number; w?: Note; acc?: number }

/**
 * De verzonnen melodie als leadsheet: solsleutel, maatstrepen, noten met hun ritme, de akkoorden boven de tel waar ze
 * beginnen. In je stemming geschreven (`spell` zet een concertnoot om, `semis` = halve tonen boven concert) en per octaaf naar het midden van de balk gebracht. Voortekens zoals op papier:
 * een voorteken geldt tot de maatstreep, een herstellingsteken waar nodig. `now` = absolute tel die klinkt: die
 * noot licht op en de regel scrollt in beeld.
 */
export function LeadSheet({ steps, notes, meter, spell, semis, chordName, now, label }: {
  steps: MelodyStep[]; notes: MelodyNote[][]; meter: number; spell: (n: Note) => Note; semis: number; chordName: (c: Chord) => string; now: number | null; label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const perRow = usePerRow(box);
  const bars = sheetBars(steps, notes, meter);
  // geschreven toonhoogtes: in je stemming, dan de hele melodie per octaaf rond B4 (midden van de balk)
  const all = bars.flatMap((b) => b.events).filter((e) => !e.rest).map((e) => e.midi! + semis);
  const avg = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 71;
  const shift = Math.round((71 - avg) / 12) * 12 + semis;
  const bw = barW(meter);
  const width = CLEF_W + perRow * bw;
  const rows = Array.from({ length: Math.ceil(bars.length / perRow) }, (_, r) => bars.slice(r * perRow, (r + 1) * perRow));
  // de regel die nu speelt in beeld houden (ook terug naar boven bij de herhaling)
  const nowBar = now == null ? -1 : Math.floor(now / meter);
  const nowRow = nowBar < 0 ? -1 : Math.floor((nowBar % bars.length) / perRow);
  const rowRefs = useRef<(SVGSVGElement | null)[]>([]);
  useEffect(() => {
    const el = box.current, row = rowRefs.current[nowRow];
    if (el && row) el.scrollTo({ top: row.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 4, behavior: 'smooth' });
  }, [nowRow]);

  return (
    <div className="leadsheet" ref={box} role="img" aria-label={label}>
      {rows.map((row, r) => {
        // per maat: x, trap en voorteken van elke noot
        const placed: Placed[][] = row.map((bar, b) => {
          const shown = new Map<number, number>(); // trap → geldend voorteken in deze maat
          let tied = false; // de vorige noot was overgebonden: deze herhaalt geen voorteken
          return bar.events.map((e) => {
            const x = CLEF_W + b * bw + PAD_L + e.at * BEAT + 6;
            if (e.rest) { tied = false; return { ...e, x, p: 4 }; }
            const w = spell(e.note!);
            const p = place(w, e.midi! + shift);
            const cur = shown.get(p) ?? 0;
            const acc = !tied && cur !== w.acc ? w.acc : undefined;
            shown.set(p, w.acc);
            tied = !!e.tie;
            return { ...e, x, p, w, acc };
          });
        });
        const flat = placed.flat();
        const isOn = (e: Placed) => now != null && !e.rest && Math.floor(e.start) === Math.floor(now % (bars.length * meter));
        const up = (p: number) => p < 4;
        // achtsten per tel samen balken: twee noten op dezelfde tel (op de tel en de 'en')
        const beamed = new Set<Placed>();
        const beams: [Placed, Placed][] = [];
        placed.forEach((bar) => bar.forEach((e, k) => {
          const f = bar[k + 1];
          if (f && !e.rest && !f.rest && e.dur === 0.5 && f.dur === 0.5 && Number.isInteger(e.at) && f.at === e.at + 0.5) {
            beams.push([e, f]); beamed.add(e); beamed.add(f);
          }
        }));
        const beamUp = (a: Placed, b: Placed) => (a.p + b.p) / 2 < 4;
        const stemX = (e: Placed, u: boolean) => (u ? e.x + 5.6 : e.x - 5.6);
        const lastRow = r === rows.length - 1;
        return (
          <svg key={r} ref={(el) => { rowRefs.current[r] = el; }} className="ls-row" viewBox={`0 0 ${width} ${(HI - LO) * H}`} preserveAspectRatio="xMinYMin meet">
            {[0, 2, 4, 6, 8].map((p) => <line key={p} className="sl" x1={0} x2={CLEF_W + row.length * bw} y1={y(p)} y2={y(p)} />)}
            <text className="clef" x={2} y={y(2)} fontSize={8 * H}>{'\u{1D11E}'}</text>
            {row.map((bar, b) => {
              const x0 = CLEF_W + b * bw, x1 = x0 + bw;
              const end = lastRow && b === row.length - 1;
              return (
                <g key={b}>
                  {end
                    ? <><line className="bl" x1={x1 - 6} x2={x1 - 6} y1={y(8)} y2={y(0)} /><rect className="blk" x={x1 - 3} y={y(8)} width={3} height={8 * H} /></>
                    : <line className="bl" x1={x1} x2={x1} y1={y(8)} y2={y(0)} />}
                  {bar.chords.map((c, k) => <text key={k} className="cs" x={x0 + PAD_L + c.at * BEAT} y={y(CHORD_P)}>{chordName(c.chord)}</text>)}
                </g>
              );
            })}
            {flat.map((e, k) => {
              if (e.rest) return <Rest key={k} x={e.x} dur={e.dur} />;
              const u = beamed.has(e) ? beamUp(...beams.find((pair) => pair.includes(e))!) : up(e.p);
              const hollow = e.dur >= 2;
              const dotted = e.dur === 1.5 || e.dur === 3;
              const next = flat[k + 1];
              const ledgers: number[] = [];
              for (let l = -2; l >= e.p; l -= 2) ledgers.push(l);
              for (let l = 10; l <= e.p; l += 2) ledgers.push(l);
              const sx = stemX(e, u), tip = u ? y(e.p + 7) : y(e.p - 7);
              return (
                <g key={k} className={isOn(e) ? 'on' : undefined}>
                  {ledgers.map((l) => <line key={l} className="sl" x1={e.x - 2.4 * H} x2={e.x + 2.4 * H} y1={y(l)} y2={y(l)} />)}
                  {e.acc !== undefined && <text className="acc" x={e.x - 3.2 * H} y={y(e.p)} fontSize={7 * H} textAnchor="middle">{ACC[e.acc] ?? ''}</text>}
                  <ellipse className={hollow ? 'nh open' : 'nh'} cx={e.x} cy={y(e.p)} rx={H * 1.3} ry={H * 0.95} transform={`rotate(-20 ${e.x} ${y(e.p)})`} />
                  {dotted && <circle className="dot" cx={e.x + 2.6 * H} cy={y(e.p % 2 === 0 ? e.p + 1 : e.p)} r={1.7} />}
                  {e.dur < 4 && !beamed.has(e) && <line className="stem" x1={sx} x2={sx} y1={y(e.p)} y2={tip} />}
                  {e.dur === 0.5 && !beamed.has(e) && <path className="flag" d={u ? `M${sx} ${tip} c0 6 10 8 8 18 c0 -6 -4 -10 -8 -12 z` : `M${sx} ${tip} c0 -6 10 -8 8 -18 c0 6 -4 10 -8 12 z`} />}
                  {e.tie && (() => {
                    // boog naar de volgende noot (of tot het einde van de regel)
                    const x2 = next && !next.rest ? next.x : CLEF_W + row.length * bw;
                    const yy = y(e.p) + (u ? 1.6 * H : -1.6 * H), bend = u ? 7 : -7;
                    return <path className="tie" d={`M${e.x + 5} ${yy} Q${(e.x + x2) / 2} ${yy + bend} ${x2 - 5} ${yy}`} />;
                  })()}
                </g>
              );
            })}
            {beams.map(([a, b], k) => {
              // een balk boven of onder, horizontaal op de uiterste steel
              const u = beamUp(a, b);
              const by = u ? Math.min(y(a.p + 7), y(b.p + 7)) : Math.max(y(a.p - 7), y(b.p - 7));
              const xa = stemX(a, u), xb = stemX(b, u);
              const on = isOn(a) || isOn(b);
              return (
                <g key={`b${k}`} className={on ? 'on' : undefined}>
                  <line className="stem" x1={xa} x2={xa} y1={y(a.p)} y2={by} />
                  <line className="stem" x1={xb} x2={xb} y1={y(b.p)} y2={by} />
                  <rect className="beam" x={xa - 0.6} y={u ? by : by - 4.5} width={xb - xa + 1.2} height={4.5} />
                </g>
              );
            })}
          </svg>
        );
      })}
    </div>
  );
}
