import { useApp } from '../../state';
import { Legend } from '../../ui';
import { CircleOfFifths } from './CircleOfFifths';
import { ModalMap } from './ModalMap';
import { ModeLadder } from './ModeLadder';
import { ScaleHeader } from './ScaleHeader';

/** Kwintencirkel met uitleg. */
export function CirclePanel() {
  const { t } = useApp();
  return (
    <>
      <h2>{t.circleTitle}</h2>
      <CircleOfFifths />
      <p className="muted small">{t.circleHelp}</p>
    </>
  );
}

/** De gekozen modus met zijn noten, en de modusladder op dezelfde grondtoon. */
export function ScalePanel() {
  const { t } = useApp();
  return (
    <>
      <ScaleHeader />
      <div className="stack" style={{ gap: 6 }}>
        <h2>{t.ladderTitle}</h2>
        <p className="muted small">{t.ladderHelp}</p>
      </div>
      <ModeLadder />
    </>
  );
}

/** Modale kaart: de buren van de huidige ladder. */
export function MapPanel() {
  const { t } = useApp();
  return (
    <>
      <h2>{t.mapTitle}</h2>
      <ModalMap />
      <Legend items={[['var(--brass)', t.lgNow], ['var(--brass-soft)', t.lgSame], ['var(--dia-soft)', t.lgOne]]} />
      <p className="muted small">{t.mapHelp}</p>
    </>
  );
}
