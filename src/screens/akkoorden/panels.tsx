import { useEffect, useState } from 'react';
import { fill } from '../../i18n';
import { useApp } from '../../state';
import { Heading, Legend } from '../../ui';
import { Chart } from './chart/Chart';
import { ChordNetwork } from './ChordNetwork';
import { ChordRow } from './ChordRow';
import { NextSteps } from './NextSteps';
import { Sequences } from './Sequences';

/** De akkoorden van de ladder, met de keuze drie- of vierklanken. */
export function ChordsPanel() {
  const { state, dispatch, t, scale, scaleLabel } = useApp();
  return (
    <>
      <Heading title={fill(t.chordsTitle, { scale: scaleLabel(scale) })}>
        <div className="seg" role="group" aria-label={t.chords}>
          {([3, 4] as const).map((n) => (
            <button key={n} type="button" aria-pressed={state.size === n} onClick={() => dispatch({ type: 'settings', patch: { size: n } })}>{n === 3 ? t.triads : t.sevenths}</button>
          ))}
        </div>
      </Heading>
      <ChordRow />
      <Legend items={[['var(--bor)', t.charLegend]]} />
    </>
  );
}

const VIEWS = ['list', 'network', 'sequences'] as const;
export type NextView = (typeof VIEWS)[number];
const VIEW_KEY = 'tln-next';
const loadView = (): NextView => {
  try { const v = localStorage.getItem(VIEW_KEY); return (VIEWS as readonly string[]).includes(v ?? '') ? (v as NextView) : 'list'; } catch { return 'list'; }
};

/** Volgende stap: dezelfde vraag ("waarheen?") als lijst, als netwerk, of als hele sequentie. */
function NextPanel({ view, setView }: { view: NextView; setView: (v: NextView) => void }) {
  const { state, t, names, scale, chords } = useApp();
  const help = view === 'network' ? t.netHelp : view === 'sequences' ? fill(t.seqHelp, { tonic: names.note(scale.notes[0]) }) : undefined;
  return (
    <>
      <Heading title={fill(t.nextTitle, { chord: names.chord(chords[state.degree]) })} help={help}>
        <div className="seg" role="tablist" aria-label={t.nextTitle.replace(' {chord}', '')}>
          {VIEWS.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} aria-pressed={view === v} onClick={() => setView(v)}>{t.nextView[v]}</button>
          ))}
        </div>
      </Heading>
      {view === 'list' && <NextSteps />}
      {view === 'network' && (
        <>
          <ChordNetwork />
          <Legend items={[['var(--dia)', t.lgNetDiatonic], ['var(--bor)', t.lgNetBorrowed], ['var(--brass)', t.lgNetPivot]]} />
        </>
      )}
      {view === 'sequences' && <Sequences />}
    </>
  );
}

/** Scherm Akkoorden: links kiezen en verder gaan, rechts het schema waar je keuzes terechtkomen. */
export function AkkoordenScreen() {
  const [view, setView] = useState<NextView>(loadView);
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* niet erg */ } }, [view]);
  return (
    <div className="screen-grid akkoorden">
      <div className="col">
        <section className="panel"><ChordsPanel /></section>
        <section className="panel" id="volgende-stap"><NextPanel view={view} setView={setView} /></section>
      </div>
      <section className="panel chartpanel">
        <Chart onShowSequences={() => { setView('sequences'); document.getElementById('volgende-stap')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
      </section>
    </div>
  );
}
