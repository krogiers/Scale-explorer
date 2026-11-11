import { useApp } from '../state';

/**
 * Drie- of vierklanken: één instelling voor de hele app (akkoordenrij, kwintencirkel, sprongkaart, brugmatrix).
 * Daarom staat dezelfde knop op elke plek waar je het verschil ziet.
 */
export function SizeToggle() {
  const { state, dispatch, t } = useApp();
  return (
    <div className="seg" role="group" aria-label={t.chords} title={t.sizeShared}>
      {([3, 4] as const).map((n) => (
        <button key={n} type="button" aria-pressed={state.size === n} onClick={() => dispatch({ type: 'settings', patch: { size: n } })}>{n === 3 ? t.triads : t.sevenths}</button>
      ))}
    </div>
  );
}
