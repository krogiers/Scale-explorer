import { LANGS } from '../../i18n';
import { NOTE_NAMERS } from '../../naming';
import { useApp, type SettingsPatch } from '../../state';

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
      <div className="field"><span className="lbl">{t.penta}</span>
        <div className="seg" role="group">
          <button type="button" aria-pressed={state.showPenta} onClick={() => set({ showPenta: true })}>{t.show}</button>
          <button type="button" aria-pressed={!state.showPenta} onClick={() => set({ showPenta: false })}>{t.hide}</button>
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
