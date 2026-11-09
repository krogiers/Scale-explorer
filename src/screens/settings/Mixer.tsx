import { CHANNELS, DEFAULT_MIX, faderGain, PARTS, type Channel, type Strip } from '../../audio';
import { fill } from '../../i18n';
import { useApp, useLoop } from '../../state';

const isPart = (ch: Channel) => (PARTS as readonly string[]).includes(ch);
function dB(vol: number) {
  if (vol <= 0) return '−∞';
  const d = Math.round(20 * Math.log10(faderGain(vol)));
  return `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} dB`;
}

/**
 * Mengpaneel: per kanaal een schuiver, links/rechts, stil (M) en solo (S); galm en totaal alleen een schuiver.
 * Met ▶ Loop hoor je meteen wat je doet. Dubbelklik op een schuiver zet hem terug op de standaard.
 */
export function Mixer() {
  const { state, dispatch, t } = useApp();
  const { running, toggle } = useLoop();
  const mix = state.mix;
  const set = (ch: Channel, patch: Partial<Strip>) => dispatch({ type: 'settings', patch: { mix: { ...mix, [ch]: { ...mix[ch], ...patch } } } });
  const panText = (p: number) => (Math.abs(p) < 0.05 ? t.mixCentre : `${Math.round(Math.abs(p) * 100)}% ${p < 0 ? t.mixLeft : t.mixRight}`);
  const changed = JSON.stringify(mix) !== JSON.stringify(DEFAULT_MIX);
  return (
    <div className="mixer">
      <div className="mixer-head">
        <span className="lbl">{t.mixTitle}</span>
        <button type="button" className={`ghost${running ? ' on' : ''}`} aria-pressed={running} onClick={toggle}>{running ? '■' : '▶'} {t.mixTry}</button>
        <button type="button" className="ghost" disabled={!changed} onClick={() => dispatch({ type: 'settings', patch: { mix: DEFAULT_MIX } })}>{t.mixReset}</button>
      </div>
      <div className="mix-rows">
        {CHANNELS.map((ch) => {
          const s = mix[ch], name = t.mixCh[ch];
          const sub = ch === 'keys' ? t.timbres[state.timbre] : null;
          const silent = s.mute || (isPart(ch) && PARTS.some((p) => mix[p].solo) && !s.solo);
          return (
            <div key={ch} className={`mix-row${silent ? ' silent' : ''}${isPart(ch) ? '' : ' bus'}`}>
              <span className="mix-name">{name}{sub && <small>{sub}</small>}</span>
              <input type="range" className="mix-vol" min={0} max={100} value={s.vol} aria-label={fill(t.mixVol, { ch: name })} aria-valuetext={dB(s.vol)}
                onChange={(e) => set(ch, { vol: +e.target.value })} onDoubleClick={() => set(ch, { vol: DEFAULT_MIX[ch].vol })} />
              <span className="mix-db">{dB(s.vol)}</span>
              {isPart(ch) && <>
                <span className="mix-pan">
                  <span aria-hidden="true">L</span>
                  <input type="range" min={-100} max={100} step={5} value={Math.round(s.pan * 100)} aria-label={fill(t.mixPan, { ch: name })} aria-valuetext={panText(s.pan)}
                    title={panText(s.pan)} onChange={(e) => set(ch, { pan: +e.target.value / 100 })} onDoubleClick={() => set(ch, { pan: DEFAULT_MIX[ch].pan })} />
                  <span aria-hidden="true">R</span>
                </span>
                <button type="button" className="mix-btn m" aria-pressed={s.mute} aria-label={`${name}: ${t.mixMute}`} title={t.mixMute} onClick={() => set(ch, { mute: !s.mute })}>M</button>
                <button type="button" className="mix-btn s" aria-pressed={s.solo} aria-label={`${name}: ${t.mixSolo}`} title={t.mixSolo} onClick={() => set(ch, { solo: !s.solo })}>S</button>
              </>}
            </div>
          );
        })}
      </div>
      <p className="muted small">{t.mixHint}</p>
    </div>
  );
}
