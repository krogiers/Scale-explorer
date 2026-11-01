import { fill } from './i18n';
import { AppProvider, useApp } from './state/store';
import { CircleOfFifths } from './views/CircleOfFifths';
import { ModeLadder, ScaleHeader } from './views/ScalePanel';
import { ChordRow, NextSteps } from './views/Chords';
import { ChordNetwork } from './views/ChordNetwork';
import { InstrumentPanel, ModalMap, Settings } from './views/Panels';
import { Chart } from './views/Chart';

function Legend({ items }: { items: [string, string, boolean?][] }) {
  return (
    <div className="legend">
      {items.map(([color, label, round]) => (
        <span key={label}><i style={{ background: color, borderColor: color, borderRadius: round ? '50%' : undefined }} /><span>{label}</span></span>
      ))}
    </div>
  );
}

function Layout() {
  const { state, t, names, scale, chords, scaleLabel } = useApp();
  return (
    <div className="wrap">
      <header className="top">
        <div className="intro">
          <h1>{t.title}</h1>
          <p className="muted">{t.tagline}</p>
        </div>
        <Settings />
      </header>
      <main className="grid">
        <section className="panel circle">
          <h2>{t.circleTitle}</h2>
          <CircleOfFifths />
          <p className="muted small">{t.circleHelp}</p>
        </section>
        <section className="panel">
          <ScaleHeader />
          <div className="stack" style={{ gap: 6 }}>
            <h2>{t.ladderTitle}</h2>
            <p className="muted small">{t.ladderHelp}</p>
          </div>
          <ModeLadder />
        </section>
        <section className="panel wide">
          <h2>{fill(t.chordsTitle, { scale: scaleLabel(scale) })}</h2>
          <ChordRow />
          <Legend items={[['var(--bor)', t.charLegend]]} />
          <h2 style={{ marginTop: 6 }}>{fill(t.nextTitle, { chord: names.chord(chords[state.degree]) })}</h2>
          <NextSteps />
        </section>
        <section className="panel wide net">
          <div className="stack" style={{ gap: 6 }}><h2>{t.netTitle}</h2><p className="muted small">{t.netHelp}</p></div>
          <ChordNetwork />
          <Legend items={[['var(--dia)', t.lgNetDiatonic], ['var(--bor)', t.lgNetBorrowed], ['var(--brass)', t.lgNetPivot]]} />
        </section>
        <section className="panel wide"><Chart /></section>
        <section className="panel wide kb">
          <InstrumentPanel />
          <Legend items={[['var(--dia)', t.lgScale, true], ['var(--brass)', t.lgChord], ['var(--bor)', t.lgChar, true], ...(state.showBlue ? [['var(--blue)', t.blue, true] as [string, string, boolean]] : [])]} />
        </section>
        <section className="panel wide mapsec">
          <h2>{t.mapTitle}</h2>
          <ModalMap />
          <Legend items={[['var(--brass)', t.lgNow], ['var(--brass-soft)', t.lgSame], ['var(--dia-soft)', t.lgOne]]} />
          <p className="muted small">{t.mapHelp}</p>
        </section>
      </main>
      <footer className="muted small credits">{t.credits}</footer>
    </div>
  );
}

export function App() {
  return <AppProvider><Layout /></AppProvider>;
}
