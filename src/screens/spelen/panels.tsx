import { useApp } from '../../state';
import { Legend } from '../../ui';
import { InstrumentPanel as Instrument } from './InstrumentPanel';

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
