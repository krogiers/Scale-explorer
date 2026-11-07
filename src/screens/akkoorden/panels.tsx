import { fill } from '../../i18n';
import { useApp } from '../../state';
import { Legend } from '../../ui';
import { ChordNetwork } from './ChordNetwork';
import { ChordRow } from './ChordRow';
import { NextSteps } from './NextSteps';

/** De akkoorden van de ladder en waar je vanaf het gekozen akkoord naartoe kunt. */
export function ChordsPanel() {
  const { state, t, names, scale, chords, scaleLabel } = useApp();
  return (
    <>
      <h2>{fill(t.chordsTitle, { scale: scaleLabel(scale) })}</h2>
      <ChordRow />
      <Legend items={[['var(--bor)', t.charLegend]]} />
      <h2 style={{ marginTop: 6 }}>{fill(t.nextTitle, { chord: names.chord(chords[state.degree]) })}</h2>
      <NextSteps />
    </>
  );
}

/** Dezelfde stappen als netwerk. */
export function NetworkPanel() {
  const { t } = useApp();
  return (
    <>
      <div className="stack" style={{ gap: 6 }}><h2>{t.netTitle}</h2><p className="muted small">{t.netHelp}</p></div>
      <ChordNetwork />
      <Legend items={[['var(--dia)', t.lgNetDiatonic], ['var(--bor)', t.lgNetBorrowed], ['var(--brass)', t.lgNetPivot]]} />
    </>
  );
}
