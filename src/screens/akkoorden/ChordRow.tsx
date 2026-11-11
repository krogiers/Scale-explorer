import { CHAR_DEGREE, harmonicFunction, romanNumeral } from '../../core';
import { useApp } from '../../state';
import { useChordPick } from '../../ui';

export function ChordRow() {
  const { state, dispatch, t, names, scale, chords } = useApp();
  const charPc = scale.notes[CHAR_DEGREE[scale.mode]].pc;
  const { handlers } = useChordPick();
  return (
    <div className="chordrow">
      {chords.map((c) => {
        const fn = harmonicFunction(scale.mode, c.degree);
        return (
          <button key={c.degree} type="button" className={`ch${c.pcs.has(charPc) ? ' char' : ''}`} aria-pressed={c.degree === state.degree}
            title={t.pickTip} {...handlers(() => dispatch({ type: 'select', degree: c.degree }))}>
            <span className="rn">{romanNumeral(scale, c)}</span>
            <span className="cn">{names.chord(c)}</span>
            <span className="tones">{c.notes.map(names.note).join(' ')}</span>
            <span className="fn">{fn ? t.fn[fn] : ' '}</span>
            <span className="dot" />
          </button>
        );
      })}
    </div>
  );
}
