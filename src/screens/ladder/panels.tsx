import { useEffect, useState, type ReactNode } from 'react';
import { chordsOnRoot, sameSpot, scaleOf, type Spot } from '../../core';
import { fill } from '../../i18n';
import { useApp } from '../../state';
import { Heading, Legend } from '../../ui';
import { CircleOfFifths } from './CircleOfFifths';
import { BridgeMatrix } from './BridgeMatrix';
import { JumpCard } from './JumpCard';
import { ModeGrid } from './ModeGrid';
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

/**
 * Modi en bruggen: het rooster van alle modi (overzicht en kiezen), de sprongkaart (hoe kom je daar)
 * en de brugmatrix (welke akkoorden in welke modus op die grondtoon). "Naar" is lokaal: pas "Ga naar" verplaatst je.
 */
export function ModesPanel() {
  const { state, dispatch, t, names } = useApp();
  const cur: Spot = { root: state.root, mode: state.mode };
  const [naar, setNaar] = useState<Spot | null>(null);
  const [all, setAll] = useState(false);
  // verplaats je je ergens anders (cirkel, ladder), dan is "naar" misschien waar je nu bent
  useEffect(() => { setNaar((n) => (sameSpot(n, cur) ? null : n)); }, [state.root, state.mode]);
  const pick = (s: Spot) => setNaar(sameSpot(s, cur) || sameSpot(s, naar) ? null : s);
  const go = () => { if (naar) dispatch({ type: 'setScale', root: naar.root, mode: naar.mode }); setNaar(null); };
  // de matrix toont de grondtoon van "naar" als dat een andere is, anders die van waar je bent
  const R = naar && naar.root !== cur.root ? naar.root : cur.root;
  const from = R === cur.root ? cur.mode : naar!.mode;
  const to = naar && naar.root === R && naar.mode !== from ? naar.mode : null;
  const total = chordsOnRoot(R, state.size).length;
  return (
    <>
      <Heading title={t.modesTitle} help={t.modesHelp} />
      <div className="modi">
        <div className="stack" style={{ gap: 10 }}>
          <ModeGrid cur={cur} naar={naar} onPick={pick} />
          <Legend items={[['var(--brass)', t.lgNow], ['var(--brass-soft)', t.lgSame], ['var(--dia-soft)', t.lgOne], ['dash', t.lgSameRoot]]} />
        </div>
        <div className="stack" style={{ gap: 12 }}>
          <JumpCard cur={cur} naar={naar} onGo={go} />
          <Heading title={fill(t.mxTitle, { root: names.note(scaleOf(R, from).notes[0]) })}>
            <button type="button" className="ghost" aria-pressed={all} onClick={() => setAll(!all)}>{all ? t.mxFew : fill(t.mxAll, { n: total })}</button>
          </Heading>
          <BridgeMatrix root={R} from={from} to={to} all={all} onPick={pick} />
          <Legend items={[['var(--brass-soft)', t.lgIn3], ['var(--dia-soft)', t.lgIn2], ['var(--bor-soft)', t.lgIn1]]} />
          <p className="muted small">★ {t.lgStar}</p>
        </div>
      </div>
    </>
  );
}

/**
 * Scherm Ladder: waar ben ik? Links de cirkel, rechts de modus, daaronder de noten op je instrument
 * (komt van het scherm Spelen; App geeft het mee) en de modi met hun bruggen.
 */
export function LadderScreen({ instrument }: { instrument: ReactNode }) {
  return (
    <div className="screen-grid">
      <section className="panel circle"><CirclePanel /></section>
      <section className="panel"><ScalePanel /></section>
      <section className="panel wide kb">{instrument}</section>
      <section className="panel wide modes"><ModesPanel /></section>
    </div>
  );
}
