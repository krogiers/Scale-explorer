import { CHAR_DEGREE, blueNote, fifthsIndex, pcFromFifths, scaleOf, type ModeIndex } from '../core/theory';
import { LANGS } from '../i18n';
import { NOTE_NAMERS } from '../naming';
import { INSTRUMENTS, instrumentById } from '../instruments';
import { useApp, type SettingsPatch } from '../state/store';
import { signatureLabel, signatureShort } from './util';

export function Settings() {
  const { state, dispatch, t } = useApp();
  const set = (patch: SettingsPatch) => dispatch({ type: 'settings', patch });
  return (
    <div className="settings">
      <div className="field"><span className="lbl">{t.lang}</span>
        <div className="seg" role="group">
          {LANGS.map((l) => <button key={l} type="button" aria-pressed={state.lang === l} onClick={() => set({ lang: l })}>{l.toUpperCase()}</button>)}
        </div>
      </div>
      <div className="field"><label htmlFor="names">{t.names}</label>
        <select id="names" value={state.namer} onChange={(e) => set({ namer: e.target.value })}>
          {NOTE_NAMERS.map((n) => <option key={n.id} value={n.id}>{n.label[state.lang]}</option>)}
        </select>
      </div>
      <div className="field"><span className="lbl">{t.sound}</span>
        <div className="seg" role="group">
          <button type="button" aria-pressed={state.sound} onClick={() => set({ sound: true })}>{t.on}</button>
          <button type="button" aria-pressed={!state.sound} onClick={() => set({ sound: false })}>{t.off}</button>
        </div>
      </div>
      <div className="field"><span className="lbl">{t.blue}</span>
        <div className="seg" role="group">
          <button type="button" aria-pressed={state.showBlue} onClick={() => set({ showBlue: true })}>{t.show}</button>
          <button type="button" aria-pressed={!state.showBlue} onClick={() => set({ showBlue: false })}>{t.hide}</button>
        </div>
      </div>
      <div className="field"><span className="lbl">{t.chords}</span>
        <div className="seg" role="group">
          <button type="button" aria-pressed={state.size === 3} onClick={() => set({ size: 3 })}>{t.triads}</button>
          <button type="button" aria-pressed={state.size === 4} onClick={() => set({ size: 4 })}>{t.sevenths}</button>
        </div>
      </div>
    </div>
  );
}

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

export function InstrumentPanel() {
  const { state, dispatch, t, names, scale, chords } = useApp();
  const Instrument = instrumentById(state.instrument).component;
  return (
    <>
      <div className="instrhead">
        <h2>{t.instrTitle}</h2>
        <div className="field"><label htmlFor="instr">{t.instrument}</label>
          <select id="instr" value={state.instrument} onChange={(e) => dispatch({ type: 'settings', patch: { instrument: e.target.value } })}>
            {INSTRUMENTS.map((i) => <option key={i.id} value={i.id}>{t.instruments[i.id] ?? i.id}</option>)}
          </select>
        </div>
      </div>
      <Instrument scaleNotes={scale.notes} scale={scale.pcs} chord={chords[state.degree].pcs} root={scale.root}
        characteristic={scale.notes[CHAR_DEGREE[scale.mode]].pc} blue={state.showBlue ? blueNote(scale).note : null} names={names} label={t.instruments[state.instrument] ?? ''} />
      {t.instrumentHelp[state.instrument] && <p className="muted small">{t.instrumentHelp[state.instrument]}</p>}
    </>
  );
}
