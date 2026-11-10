import { useState } from 'react';
import { useApp, useLoop } from '../../state';
import { Heading, Legend } from '../../ui';
import { ChartStrip } from './ChartStrip';
import { InstrumentPanel as Instrument } from './InstrumentPanel';
import { LoopControls } from './LoopControls';

type Item = [string, string, boolean?];

const FOLD_KEY = 'tln-instr';

/**
 * Het instrument met zijn legenda (blue note en pentatonisch alleen als ze aan staan).
 * In- en uitklapbaar, standaard open; de keuze wordt onthouden.
 */
function InstrumentPanel() {
  const { state, t } = useApp();
  const { running, practice } = useLoop();
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(FOLD_KEY) !== 'dicht'; } catch { return true; } });
  const toggle = () => {
    setOpen(!open);
    try { localStorage.setItem(FOLD_KEY, open ? 'dicht' : 'open'); } catch { /* geen opslag: dan maar niet onthouden */ }
  };
  const items: Item[] = [['var(--dia)', t.lgScale, true], ['var(--brass)', running && practice ? t.lgDrone : t.lgChord], ['var(--bor)', t.lgChar, true]];
  if (state.showBlue) items.push(['var(--blue)', t.blue, true]);
  if (state.showPenta) items.push(['ring', t.lgPenta, true]);
  if (running && practice) items.push(['var(--hot)', t.lgBridgeNote, true], ['ring', t.lgDropped, true]);
  return (
    <>
      <Instrument fold={{ open, toggle }} />
      {open && <Legend items={items} />}
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
