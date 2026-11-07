import { useApp } from '../../state';
import { Heading, Legend } from '../../ui';
import { ChartStrip } from './ChartStrip';
import { InstrumentPanel as Instrument } from './InstrumentPanel';
import { LoopControls } from './LoopControls';

type Item = [string, string, boolean?];

/** Het instrument met zijn legenda (blue note en pentatonisch alleen als ze aan staan). */
export function InstrumentPanel() {
  const { state, t } = useApp();
  const items: Item[] = [['var(--dia)', t.lgScale, true], ['var(--brass)', t.lgChord], ['var(--bor)', t.lgChar, true]];
  if (state.showBlue) items.push(['var(--blue)', t.blue, true]);
  if (state.showPenta) items.push(['ring', t.lgPenta, true]);
  return (
    <>
      <Instrument />
      <Legend items={items} />
    </>
  );
}

/** Scherm Spelen: de loop met het grote "nu", het schema als meelopende strook, en het instrument groot. */
export function SpelenScreen() {
  const { t } = useApp();
  return (
    <div className="screen-grid spelen">
      <section className="panel wide"><LoopControls /></section>
      <section className="panel wide"><Heading title={t.chartTitle} /><ChartStrip /></section>
      <section className="panel wide kb"><InstrumentPanel /></section>
    </div>
  );
}
