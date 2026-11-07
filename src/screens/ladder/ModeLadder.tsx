import { formula, scaleOf, type ModeIndex } from '../../core';
import { useApp } from '../../state';

export function ModeLadder() {
  const { dispatch, t, names, scale } = useApp();
  return (
    <div className="ladder">
      {Array.from({ length: 7 }, (_, m) => {
        const s2 = scaleOf(scale.root, m as ModeIndex), current = m === scale.mode;
        const diff = s2.notes.filter((n) => !scale.pcs.has(n.pc)).map(names.note);
        return (
          <button key={m} type="button" className="lad" aria-current={current} onClick={() => dispatch({ type: 'setMode', mode: m as ModeIndex })}>
            <span className="sw" style={{ background: `var(--m${m})` }} />
            <span className="nm">
              <span><b>{t.modes[m]}</b>{t.alias[m] && <span className="muted small"> {t.alias[m]}</span>}</span>
              <small>{formula(m as ModeIndex).join(' ')}</small>
            </span>
            <span className="df">{current ? t.now : <>{t.changes} <b>{diff.join(', ')}</b></>}</span>
          </button>
        );
      })}
    </div>
  );
}
