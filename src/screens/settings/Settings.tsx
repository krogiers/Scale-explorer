import { useEffect, useRef } from 'react';
import { LANGS } from '../../i18n';
import { NOTE_NAMERS } from '../../naming';
import { useApp, type SettingsPatch, type Theme } from '../../state';

const THEMES: Theme[] = ['auto', 'light', 'dark'];

/**
 * Instellingen achter ⚙, als dialoogvenster: wat je één keer instelt (taal, nootnamen, geluid, thema).
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
        <button type="button" className="ghost" onClick={onClose} aria-label={t.close}>✕</button>
      </div>
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
        <div className="field"><span className="lbl">{t.theme}</span>
          <div className="seg" role="group">
            {THEMES.map((th) => <button key={th} type="button" aria-pressed={state.theme === th} onClick={() => set({ theme: th })}>{t.themes[th]}</button>)}
          </div>
        </div>
      </div>
    </dialog>
  );
}
