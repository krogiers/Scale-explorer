import { useId, useState, type ReactNode } from 'react';
import { useApp } from '../state';

/** Paneelkop: titel, rechts eventuele bediening, en de uitleg achter een ⓘ-knop (standaard dicht). */
export function Heading({ title, help, children }: { title: ReactNode; help?: ReactNode; children?: ReactNode }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <div className="phead">
        <h2>{title}</h2>
        {help && (
          <button type="button" className="info" aria-expanded={open} aria-controls={id} aria-label={t.info} title={t.info} onClick={() => setOpen(!open)}>ⓘ</button>
        )}
        {children && <div className="phead-right">{children}</div>}
      </div>
      {help && open && <p id={id} className="muted small help">{help}</p>}
    </>
  );
}
