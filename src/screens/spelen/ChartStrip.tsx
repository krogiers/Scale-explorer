import { useEffect, useRef } from 'react';
import { chordOf, useApp, useLoop } from '../../state';
import { layoutBars } from '../../ui';

/** Het schema als één strook maten om mee te lezen: de maat die speelt licht op en schuift in beeld. Tik om te selecteren. */
export function ChartStrip() {
  const { state, dispatch, names } = useApp();
  const { info } = useLoop();
  const playing = info && info.chord >= 0 ? info.chord : -1;
  const bars = layoutBars(state.path.map((p) => p.beats), state.meter);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('.scell.playing')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [playing]);
  return (
    <div className="strip" ref={ref}>
      {bars.map((bar, b) => (
        <div className="sbar" key={b}>
          <span className="barno">{b + 1}</span>
          {bar.segments.map((sg, k) => {
            const cls = `scell${sg.index === playing ? ' playing' : ''}${sg.index === state.focus ? ' focus' : ''}`;
            return sg.start ? (
              <button key={k} type="button" className={cls} style={{ flexGrow: sg.beats }} onClick={() => dispatch({ type: 'focusPath', index: sg.index })}>
                {names.chord(chordOf(state.path[sg.index]))}
              </button>
            ) : (
              <span key={k} className={`${cls} cont`} style={{ flexGrow: sg.beats }} aria-hidden="true">{sg.beats === state.meter && k === 0 ? '%' : '·'}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
