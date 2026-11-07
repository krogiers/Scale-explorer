import { fifthsIndex, pcFromFifths, scaleOf, type ModeIndex } from '../../core';
import { useApp } from '../../state';
import { signatureLabel, signatureShort } from '../../ui';

export function ModalMap() {
  const { dispatch, t, names, scale, scaleLabel } = useApp();
  const rootF = fifthsIndex(scale.root);
  const cols = [-2, -1, 0, 1, 2].map((d) => pcFromFifths(rootF + d));
  return (
    <div className="mapwrap">
      <table className="map">
        <thead><tr><th />{cols.map((pc) => <th key={pc}>{names.note(scaleOf(pc, scale.mode).notes[0])}</th>)}</tr></thead>
        <tbody>
          {Array.from({ length: 7 }, (_, m) => (
            <tr key={m}>
              <th>{t.modes[m]}</th>
              {cols.map((pc) => {
                const s2 = scaleOf(pc, m as ModeIndex), d = s2.notes.filter((n) => !scale.pcs.has(n.pc)).length;
                const cur = pc === scale.root && m === scale.mode;
                return (
                  <td key={pc}>
                    <button type="button" className={`mc${cur ? ' cur' : d === 0 ? ' d0' : d === 1 ? ' d1' : ''}`} title={scaleLabel(s2)}
                      aria-label={`${scaleLabel(s2)}, ${signatureLabel(s2, t)}`} onClick={() => dispatch({ type: 'setScale', root: pc, mode: m as ModeIndex })}>
                      {signatureShort(s2)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
