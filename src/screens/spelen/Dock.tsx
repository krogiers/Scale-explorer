import { LOOP_STYLES, type LoopStyle } from '../../audio/loop';
import { BPM_MAX, BPM_MIN, chordOf, useApp, useLoop } from '../../state';
import { InstrumentPanel } from './panels';

/**
 * Dock onderaan op de schermen Ladder en Akkoorden: de loop (▶/■, tempo, stijl, nu → daarna)
 * en het instrument, dat je kunt uitklappen. Zo hoor en zie je elke klik, op elk scherm.
 */
export function Dock({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { state, dispatch, t, names } = useApp();
  const { running, info, opts, setOpts, toggle } = useLoop();
  const n = state.path.length;
  let now = <span className="muted">{t.loopOff}</span>;
  if (running && info) {
    now = info.chord < 0
      ? <span>{t.countingIn} <b>{info.beat + 1}</b></span>
      : <span>{t.nowShort} <b>{names.chord(chordOf(state.path[info.chord % n]))}</b>{n > 1 && <> → {t.nextShort} {names.chord(chordOf(state.path[(info.chord + 1) % n]))}</>}</span>;
  }
  return (
    <aside className={`dock${open ? ' open' : ''}`} aria-label={t.loopTitle}>
      <div className="dock-bar">
        <button type="button" className={`loopbtn${running ? ' on' : ''}`} aria-pressed={running} onClick={toggle}>
          {running ? '■ ' + t.loopStop : '▶ ' + t.loopStart}
        </button>
        <label className="dock-tempo">
          <span className="sr-only">{t.tempo}</span>
          <input type="range" min={BPM_MIN} max={BPM_MAX} step={2} value={state.bpm} onChange={(e) => dispatch({ type: 'settings', patch: { bpm: +e.target.value } })} />
          <b>{state.bpm}</b>
        </label>
        <select aria-label={t.accompaniment} value={opts.style} onChange={(e) => setOpts({ style: e.target.value as LoopStyle })}>
          {LOOP_STYLES.map((k) => <option key={k} value={k}>{t.styles[k]}</option>)}
        </select>
        <span className="dock-now" aria-live="polite">{now}</span>
        <button type="button" className="ghost" aria-expanded={open} onClick={onToggle}>{open ? t.dockHide : t.dockShow}</button>
      </div>
      {open && <div className="dock-body"><InstrumentPanel /></div>}
    </aside>
  );
}
