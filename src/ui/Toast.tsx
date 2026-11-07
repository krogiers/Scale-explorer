import { useEffect, useState } from 'react';
import { useApp } from '../state';

/** Korte melding onderaan, eventueel met een actie zoals "Ongedaan maken". Er staat er altijd maar één. */
export interface ToastMsg { text: string; action?: { label: string; run: () => void } }
let show: ((m: ToastMsg | null) => void) | null = null;
export const showToast = (m: ToastMsg) => show?.(m);

export function Toaster() {
  const { t } = useApp();
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  useEffect(() => { show = setMsg; return () => { show = null; }; }, []);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 6000);
    return () => window.clearTimeout(id);
  }, [msg]);
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {msg && (
        <div className="toast">
          <span>{msg.text}</span>
          {msg.action && <button type="button" className="toast-act" onClick={() => { msg.action!.run(); setMsg(null); }}>{msg.action.label}</button>}
          <button type="button" className="toast-x" aria-label={t.close} onClick={() => setMsg(null)}>×</button>
        </div>
      )}
    </div>
  );
}
