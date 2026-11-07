import { useApp } from '../../state';
import { Heading, Legend } from '../../ui';
import { CircleOfFifths } from './CircleOfFifths';
import { ModalMap } from './ModalMap';
import { ModeLadder } from './ModeLadder';
import { ScaleHeader } from './ScaleHeader';

/** Kwintencirkel; de uitleg zit achter ⓘ. */
export function CirclePanel() {
  const { t } = useApp();
  return (
    <>
      <Heading title={t.circleTitle} help={t.circleHelp} />
      <CircleOfFifths />
    </>
  );
}

/** De gekozen modus met zijn noten, en de modusladder op dezelfde grondtoon. */
export function ScalePanel() {
  const { t } = useApp();
  return (
    <>
      <ScaleHeader />
      <Heading title={t.ladderTitle} help={t.ladderHelp} />
      <ModeLadder />
    </>
  );
}

/** Modale kaart: de buren van de huidige ladder. */
export function MapPanel() {
  const { t } = useApp();
  return (
    <>
      <Heading title={t.mapTitle} help={t.mapHelp} />
      <ModalMap />
      <Legend items={[['var(--brass)', t.lgNow], ['var(--brass-soft)', t.lgSame], ['var(--dia-soft)', t.lgOne]]} />
    </>
  );
}

/** Scherm Ladder: waar ben ik? Links de cirkel, rechts de modus, daaronder de modale kaart. */
export function LadderScreen() {
  return (
    <div className="screen-grid">
      <section className="panel circle"><CirclePanel /></section>
      <section className="panel"><ScalePanel /></section>
      <section className="panel wide mapsec"><MapPanel /></section>
    </div>
  );
}
