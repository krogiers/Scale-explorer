import { useEffect, useState } from 'react';
import { AppProvider, LoopProvider, useApp } from './state';
import { PlayButton, Toaster } from './ui';
import { LadderScreen } from './screens/ladder';
import { AkkoordenScreen } from './screens/akkoorden';
import { Dock, SpelenScreen } from './screens/spelen';
import { Settings } from './screens/settings';

/** De drie schermen; de naam staat in de URL (#ladder, #akkoorden, #spelen) zodat terug en vooruit werken. */
const SCREENS = ['ladder', 'akkoorden', 'spelen'] as const;
type Screen = (typeof SCREENS)[number];
const isScreen = (s: string): s is Screen => (SCREENS as readonly string[]).includes(s);
const SCREEN_KEY = 'tln-screen';
const DOCK_KEY = 'tln-dock';

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* niet erg */ }
}

/** Het scherm uit de URL, anders het laatst gebruikte; wisselen komt in de geschiedenis van de browser. */
function useScreen(): [Screen, (s: Screen) => void] {
  const fromHash = () => { const h = location.hash.slice(1); return isScreen(h) ? h : null; };
  const [screen, setScreen] = useState<Screen>(() => {
    const s = fromHash() ?? load<string>(SCREEN_KEY, 'ladder');
    return isScreen(s) ? s : 'ladder';
  });
  useEffect(() => {
    const onHash = () => { const s = fromHash(); if (s) setScreen(s); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    save(SCREEN_KEY, screen);
    if (location.hash.slice(1) !== screen) history.replaceState(null, '', `#${screen}`);
    window.scrollTo(0, 0);
  }, [screen]);
  const go = (s: Screen) => { if (s !== screen) location.hash = s; };
  return [screen, go];
}

/** Bovenbalk met de schermen, de huidige ladder en het akkoord (overal zichtbaar), en ⚙; onderaan het dock. */
function Layout() {
  const { state, t, names, scale, chords, scaleLabel, playChord } = useApp();
  const [screen, go] = useScreen();
  const [settings, setSettings] = useState(false);
  // het dock: standaard open op Ladder (noten op je instrument), dicht op Akkoorden (ruimte voor het schema);
  // op een telefoon staat het dock standaard dicht: het instrument zou het halve scherm innemen
  const [dock, setDock] = useState<Record<string, boolean>>(() => load(DOCK_KEY, { ladder: !matchMedia('(max-width: 640px)').matches, akkoorden: false }));
  useEffect(() => save(DOCK_KEY, dock), [dock]);

  // sneltoetsen 1, 2, 3 voor de schermen (niet tijdens typen, niet in een dialoog, niet met een modifier)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, select, textarea, dialog');
      const i = ['1', '2', '3'].indexOf(e.key);
      if (i >= 0 && !typing && !e.altKey && !e.ctrlKey && !e.metaKey) go(SCREENS[i]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="app">
      <header className="appbar">
        <div className="appbar-in">
          <span className="brand">{t.title}</span>
          <nav className="tabs" aria-label={t.title}>
            {SCREENS.map((s, i) => (
              <button key={s} type="button" className="tab" aria-current={screen === s ? 'page' : undefined} onClick={() => go(s)} title={`${t.screens[s]} (${i + 1})`}>
                <span className="tab-n" aria-hidden="true">{i + 1}</span>{t.screens[s]}
              </button>
            ))}
          </nav>
          <div className="ctx">
            <button type="button" className="ctx-scale" onClick={() => go('ladder')}>{scaleLabel(scale)}</button>
            <span aria-hidden="true">·</span>
            <b>{names.chord(chords[state.degree])}</b>
            <PlayButton id="chord" label={t.playChord} onPlay={playChord} compact className="ghost ctx-play" />
          </div>
          <button type="button" className="ghost gear" aria-label={t.settingsTitle} title={t.settingsTitle} onClick={() => setSettings(true)}>⚙</button>
        </div>
      </header>
      <main className="wrap">
        {screen === 'ladder' && <LadderScreen />}
        {screen === 'akkoorden' && <AkkoordenScreen />}
        {screen === 'spelen' && <SpelenScreen />}
        <footer className="muted small credits">{t.credits}</footer>
      </main>
      {screen !== 'spelen' && <Dock open={!!dock[screen]} onToggle={() => setDock({ ...dock, [screen]: !dock[screen] })} />}
      <Settings open={settings} onClose={() => setSettings(false)} />
      <Toaster />
    </div>
  );
}

export function App() {
  return <AppProvider><LoopProvider><Layout /></LoopProvider></AppProvider>;
}
