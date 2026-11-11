import { useEffect, useRef } from 'react';
import { COMP_TIMBRES, TIMBRES } from '../../audio';
import { LANGS } from '../../i18n';
import { INSTRUMENTS } from '../../instruments';
import { NOTE_NAMERS } from '../../naming';
import { useApp, type CompTimbre, type SettingsPatch, type Theme, type Timbre } from '../../state';
import { Mixer } from './Mixer';

const THEMES: Theme[] = ['auto', 'light', 'dark'];

/**
 * Instellingen achter ⚙, als dialoogvenster: wat je één keer instelt (je instrument, taal, nootnamen, geluid, thema)
 * en het mengpaneel. Je instrument staat bovenaan: het bepaalt in welke toonaard de hele app leest. Bij het geluid kies je
 * twee klanken: één voor akkoorden (een begeleidingsinstrument) en één voor losse noten (bv. je eigen instrument).
 * Blue note en pentatonisch staan als chips bij de notenrij, drie- of vierklanken bij de akkoorden.
 */
export function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, t } = useApp();
  const set = (patch: SettingsPatch) => dispatch({ type: 'settings', patch });
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    // Escape en de knop sluiten; een klik naast het venster (op de achtergrond) ook
    <dialog ref={ref} className="sheet" aria-labelledby="settings-title" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sheet-head">
        <h2 id="settings-title">{t.settingsTitle}</h2>
        <button type="button" className="ghost iconbtn" onClick={onClose} aria-label={t.close} title={t.close}>✕</button>
      </div>
      <div className="settings">
        <div className="field"><label htmlFor="myinstr">{t.myInstrument}</label>
          <select id="myinstr" value={state.instrument} aria-describedby="myinstr-help" onChange={(e) => set({ instrument: e.target.value })}>
            {INSTRUMENTS.map((i) => <option key={i.id} value={i.id}>{t.instruments[i.id]} ({t.readingKeys[i.transpose ?? 0]})</option>)}
          </select>
          <p id="myinstr-help" className="muted small">{t.myInstrumentHelp}</p>
        </div>
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
        <div className="field"><span className="lbl">{t.theme}</span>
          <div className="seg" role="group">
            {THEMES.map((th) => <button key={th} type="button" aria-pressed={state.theme === th} onClick={() => set({ theme: th })}>{t.themes[th]}</button>)}
          </div>
        </div>
        {state.sound && <>
          <div className="field"><label htmlFor="s-comp">{t.compTimbre}</label>
            <select id="s-comp" value={state.compTimbre} aria-describedby="s-comp-help" onChange={(e) => set({ compTimbre: e.target.value as CompTimbre })}>
              {COMP_TIMBRES.map((k) => <option key={k} value={k}>{t.timbres[k]}</option>)}
            </select>
            <p id="s-comp-help" className="muted small">{t.compTimbreHelp}</p>
          </div>
          <div className="field"><label htmlFor="s-lead">{t.leadTimbre}</label>
            <select id="s-lead" value={state.leadTimbre} aria-describedby="s-lead-help" onChange={(e) => set({ leadTimbre: e.target.value as Timbre })}>
              {TIMBRES.map((k) => <option key={k} value={k}>{t.timbres[k]}</option>)}
            </select>
            <p id="s-lead-help" className="muted small">{t.leadTimbreHelp}</p>
          </div>
          <Mixer />
        </>}
      </div>
    </dialog>
  );
}
