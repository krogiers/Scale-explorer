import { AppProvider, useApp } from './state';
import { CirclePanel, MapPanel, ScalePanel } from './screens/ladder';
import { ChartPanel, ChordsPanel, NetworkPanel, SequencesPanel } from './screens/akkoorden';
import { InstrumentPanel, LoopControls } from './screens/spelen';
import { Settings } from './screens/settings';

/** Zet de panelen van de schermen op één werkblad. De schermen zelf importeren elkaar niet. */
function Layout() {
  const { t } = useApp();
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
        <section className="panel circle"><CirclePanel /></section>
        <section className="panel"><ScalePanel /></section>
        <section className="panel wide"><ChordsPanel /></section>
        <section className="panel wide net"><NetworkPanel /></section>
        <section className="panel wide" id="sequenties"><SequencesPanel /></section>
        <section className="panel wide"><ChartPanel player={(onBeat) => <LoopControls onBeat={onBeat} />} /></section>
        <section className="panel wide kb"><InstrumentPanel /></section>
        <section className="panel wide mapsec"><MapPanel /></section>
      </main>
      <footer className="muted small credits">{t.credits}</footer>
    </div>
  );
}

export function App() {
  return <AppProvider><Layout /></AppProvider>;
}
