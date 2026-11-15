import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LETTER_PC, type Chord, type MelodyNote, type MelodyStep, type Note } from '../core';
import { sheetBars, type SheetEvent } from './sheetLayout';

/** Halve afstand tussen twee lijnen (één trap op de balk), in px. Trap 0 = onderste lijn (E4 in de solsleutel). */
const H = 5;
const BOTTOM = 2 + 7 * 4; // E4 als diatonische trap (letter + 7 × octaaf)
const HI = 17, LO = -5; // vaste hoogte per regel: akkoorden boven, hulplijnen onder
const CHORD_P = 14; // basislijn van de akkoordsymbolen
const PAD_L = 22, PAD_R = 10, CLEF_W = 40;
/** Breedte van een tel: 46 px; met achtsten 60 en met zestienden 92, zodat een voorteken niet tegen de vorige noot botst. */
const beatW = (sixteenths: boolean, eighths: boolean) => (sixteenths ? 92 : eighths ? 60 : 46);
const ACC: Record<number, string> = { 1: '♯', [-1]: '♭', 0: '♮' };
const y = (p: number) => (HI - p) * H;

/** De trap op de balk van een geschreven noot met zijn geschreven toonhoogte. */
const place = (n: Note, midi: number) => n.letter + 7 * Math.round((midi - n.acc - LETTER_PC[n.letter]) / 12 - 1) - BOTTOM;

/** Breedte van een maat: vast per maatsoort, zodat de tellen onder elkaar staan. */
const barW = (meter: number, beat: number) => PAD_L + meter * beat + PAD_R;

/** Hoeveel maten per regel: 4, of 2 als het vak smal is (telefoon); met zestienden de helft. */
function usePerRow(ref: React.RefObject<HTMLElement | null>, wide: boolean) {
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 560));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return (narrow ? 2 : 4) / (wide ? 2 : 1);
}

/** Rusten getekend als vormen (geen lettertype nodig). */
function Rest({ x, dur }: { x: number; dur: number }) {
  if (dur >= 3) return <rect className="rs" x={x - 6} y={y(6)} width={12} height={H} />; // hele rust hangt aan de 4e lijn
  if (dur === 2) return <rect className="rs" x={x - 6} y={y(4) - H} width={12} height={H} />; // halve rust ligt op de middelste lijn
  if (dur === 1) return <path className="rs" d={`M${x - 2} ${y(7.5)} l5 6 l-4 5 l5 6 c-5 -2 -8 1 -4 6 c-8 -4 -5 -10 0 -7 l-6 -7 l4 -4 z`} />;
  // achtste rust: bolletje met een schuine staart; zestiende rust: twee bolletjes en een langere staart
  if (dur === 0.5) return <g className="rs"><circle cx={x - 2} cy={y(5)} r={2.6} /><path d={`M${x - 2} ${y(5) + 2} q4 1 6 -3 l-5 13`} fill="none" strokeWidth={1.6} /></g>;
  return (
    <g className="rs">
      <circle cx={x - 1} cy={y(5)} r={2.4} /><path d={`M${x - 1} ${y(5) + 2} q4 1 6 -3 l-7 22`} fill="none" strokeWidth={1.6} />
      <circle cx={x - 3.5} cy={y(3)} r={2.4} /><path d={`M${x - 3.5} ${y(3) + 2} q4 1 6.5 -3`} fill="none" strokeWidth={1.6} />
    </g>
  );
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
  const bars = sheetBars(steps, notes, meter);
  const sixteenths = bars.some((b) => b.events.some((e) => !Number.isInteger(e.at * 2) || !Number.isInteger(e.dur * 2)));
  const eighths = bars.some((b) => b.events.some((e) => !e.rest && e.dur < 1));
  const BEAT = beatW(sixteenths, eighths);
  const perRow = usePerRow(box, sixteenths);
  // geschreven toonhoogtes: in je stemming, dan de hele melodie per octaaf rond B4 (midden van de balk)
  const all = bars.flatMap((b) => b.events).filter((e) => !e.rest).map((e) => e.midi! + semis);
  const avg = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 71;
  const shift = Math.round((71 - avg) / 12) * 12 + semis;
  const bw = barW(meter, BEAT);
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
        // balken per tel: opeenvolgende noten korter dan een kwart binnen dezelfde tel (zonder rust ertussen)
        const beams: Placed[][] = [];
        placed.forEach((bar) => {
          let cur: Placed[] = [];
          const flush = () => { if (cur.length > 1) beams.push(cur); cur = []; };
          for (const e of bar) {
            if (e.rest || e.dur >= 1) { flush(); continue; }
            if (cur.length && Math.floor(cur[0].at + 1e-9) !== Math.floor(e.at + 1e-9)) flush();
            cur.push(e);
          }
          flush();
        });
        const groupOf = new Map<Placed, Placed[]>();
        beams.forEach((g) => g.forEach((e) => groupOf.set(e, g)));
        const beamed = { has: (e: Placed) => groupOf.has(e) };
        const beamUp = (g: Placed[]) => g.reduce((a, e) => a + e.p, 0) / g.length < 4;
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
              const u = beamed.has(e) ? beamUp(groupOf.get(e)!) : up(e.p);
              const hollow = e.dur >= 2;
              const dotted = e.dur === 0.75 || e.dur === 1.5 || e.dur === 3;
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
                  {e.dur < 1 && !beamed.has(e) && (e.dur <= 0.25 ? [0, 7] : [0]).map((d) => (
                    <path key={d} className="flag" d={u ? `M${sx} ${tip + d} c0 6 10 8 8 18 c0 -6 -4 -10 -8 -12 z` : `M${sx} ${tip - d} c0 -6 10 -8 8 -18 c0 6 -4 10 -8 12 z`} />
                  ))}
                  {e.tie && (() => {
                    // boog naar de volgende noot (of tot het einde van de regel)
                    const x2 = next && !next.rest ? next.x : CLEF_W + row.length * bw;
                    const yy = y(e.p) + (u ? 1.6 * H : -1.6 * H), bend = u ? 7 : -7;
                    return <path className="tie" d={`M${e.x + 5} ${yy} Q${(e.x + x2) / 2} ${yy + bend} ${x2 - 5} ${yy}`} />;
                  })()}
                </g>
              );
            })}
            {beams.map((g, k) => {
              // een balk boven of onder, horizontaal op de uiterste steel; zestienden krijgen een tweede balk
              // (tussen twee zestienden over de hele breedte, bij een losse zestiende een stompje naar zijn buur)
              const u = beamUp(g);
              const by = u ? Math.min(...g.map((e) => y(e.p + 7))) : Math.max(...g.map((e) => y(e.p - 7)));
              const xs = g.map((e) => stemX(e, u));
              const bh = 4.5, inner = u ? by + 7 : by - 7 - bh;
              const second: [number, number][] = [];
              g.forEach((e, j) => {
                if (e.dur > 0.25) return;
                const nb = g[j + 1], pv = g[j - 1];
                if (nb && nb.dur <= 0.25) second.push([xs[j], xs[j + 1]]);
                else if (!(pv && pv.dur <= 0.25)) second.push(nb ? [xs[j], xs[j] + 8] : [xs[j] - 8, xs[j]]);
              });
              return (
                <g key={`b${k}`} className={g.some(isOn) ? 'on' : undefined}>
                  {g.map((e, j) => <line key={j} className="stem" x1={xs[j]} x2={xs[j]} y1={y(e.p)} y2={by + (u ? 0 : 0)} />)}
                  <rect className="beam" x={xs[0] - 0.6} y={u ? by : by - bh} width={xs[xs.length - 1] - xs[0] + 1.2} height={bh} />
                  {second.map(([a, b], j) => <rect key={j} className="beam" x={a - 0.6} y={inner} width={b - a + 1.2} height={bh} />)}
                </g>
              );
            })}
          </svg>
        );
      })}
    </div>
  );
}
