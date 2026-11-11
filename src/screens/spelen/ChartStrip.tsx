import { useEffect, useRef } from 'react';
import { chordOf, useApp, useLoop } from '../../state';
import { layoutBars, repeatClass, RepeatSigns } from '../../ui';

/**
 * Het schema om mee te lezen: vier maten per rij (twee op een smal scherm), naar onder aangevuld. Is het langer dan het vak, dan scrolt het vak
 * mee met de maat die speelt (met één rij erboven als houvast), ook terug naar boven als de loop opnieuw begint.
 * Tik op een akkoord om het te selecteren.
 */
export function ChartStrip() {
  const { state, dispatch, names } = useApp();
  const { info } = useLoop();
  const playing = info && info.chord >= 0 ? info.chord : -1;
  const bars = layoutBars(state.path.map((p) => p.beats), state.meter);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    const bar = box?.querySelector<HTMLElement>('.scell.playing')?.closest<HTMLElement>('.sbar');
    if (!box || !bar) return;
    // alleen het vak zelf scrollen, niet de pagina
    const top = bar.offsetTop - bar.offsetHeight; // het vak is position:relative, dus offsetTop is binnen het vak
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [playing]);
  return (
    <div className="strip" ref={ref}>
      {bars.map((bar, b) => (
        <div className="sbar" key={b}>
          <span className="barno">{b + 1}</span>
          {bar.segments.map((sg, k) => {
            const cls = `scell${sg.index === playing ? ' playing' : ''}${sg.index === state.focus ? ' focus' : ''}${repeatClass(state.path[sg.index], sg)}`;
            return sg.start ? (
              <button key={k} type="button" className={cls} style={{ flexGrow: sg.beats }} onClick={() => dispatch({ type: 'focusPath', index: sg.index })}>
                <RepeatSigns p={state.path[sg.index]} seg={sg} />
                {names.chord(chordOf(state.path[sg.index]))}
              </button>
            ) : (
              <span key={k} className={`${cls} cont`} style={{ flexGrow: sg.beats }} aria-hidden="true"><RepeatSigns p={state.path[sg.index]} seg={sg} />{sg.beats === state.meter && k === 0 ? '%' : '·'}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
