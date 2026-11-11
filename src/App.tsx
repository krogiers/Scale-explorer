import { useEffect, useState } from 'react';
import { scaleOf } from './core';
import { AppProvider, chordOf, LoopProvider, practiceAt, useApp, useLoop } from './state';
import { fill } from './i18n';
import { PlayButton, Toaster, useChordPick } from './ui';
import { LadderScreen } from './screens/ladder';
import { AkkoordenScreen } from './screens/akkoorden';
import { SpelenScreen } from './screens/spelen';
import { Settings } from './screens/settings';

/** De drie schermen; de naam staat in de URL (#ladder, #akkoorden, #spelen) zodat terug en vooruit werken. */
const SCREENS = ['ladder', 'akkoorden', 'spelen'] as const;
type Screen = (typeof SCREENS)[number];
const isScreen = (s: string): s is Screen => (SCREENS as readonly string[]).includes(s);
const SCREEN_KEY = 'tln-screen';

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

/**
 * Speelt de loop terwijl je op een ander scherm bent, dan toont de bovenbalk dat, met ■ om te stoppen.
 * Een tik op de tekst brengt je naar Spelen.
 */
function LoopPill({ onOpen }: { onOpen: () => void }) {
  const { state, t, names, scaleLabel } = useApp();
  const { running, info, toggle, practice } = useLoop();
  if (!running) return null;
  const n = state.path.length;
  const drill = practice && info && info.chord >= 0 ? practiceAt(practice, info).now : null;
  const text = !info ? t.loopTitle : info.chord < 0 ? `${t.countingIn} ${info.beat + 1}`
    : drill ? scaleLabel(scaleOf(drill.root, drill.mode))
    : n === 0 ? t.loopTitle
    : `${names.chord(chordOf(state.path[info.chord % n]))}${n > 1 ? ` → ${names.chord(chordOf(state.path[(info.chord + 1) % n]))}` : ''}`;
  return (
    <div className="loop-pill">
      <button type="button" className="lp-stop iconbtn" onClick={toggle} aria-label={t.loopStop} title={t.loopStop}>■</button>
      <button type="button" className="lp-now" onClick={onOpen} aria-live="polite">{text}</button>
    </div>
  );
}

/** Bovenbalk met de schermen, de huidige ladder en het akkoord (overal zichtbaar), en ⚙. */
function Layout() {
  const { state, t, names, concertNames, shift, scale, chords, scaleLabel, playChord, instrumentLabel } = useApp();
  const { add } = useChordPick();
  // concert C en hoe jij die leest, voor de uitleg bij het label
  const C = { pc: 0, letter: 0, acc: 0 };
  const [screen, go] = useScreen();
  const [settings, setSettings] = useState(false);

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
          <span className="brand" title={t.title}>
            {/* hetzelfde beeld als public/favicon.svg: loep met de kwintencirkel als lens, de gouden boog = zeven noten */}
            <svg className="logo" viewBox="0 0 64 64" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="#172033" />
              <line x1="40.5" y1="40.5" x2="52" y2="52" stroke="#E0AE52" strokeWidth="7" strokeLinecap="round" />
              <circle cx="27" cy="27" r="17" fill="#172033" stroke="#5B6577" strokeWidth="3" />
              <path d="M 12.3 18.5 A 17 17 0 0 1 39 39" fill="none" stroke="#E0AE52" strokeWidth="6.5" strokeLinecap="round" />
              <circle cx="27" cy="27" r="3.2" fill="#E0AE52" />
            </svg>
            <span className="brand-name">{t.title.replace(/\s+\S+$/, '')} <i>{t.title.split(/\s+/).pop()}</i></span>
          </span>
          <nav className="tabs" aria-label={t.title}>
            {SCREENS.map((s, i) => (
              <button key={s} type="button" className="tab" aria-current={screen === s ? 'page' : undefined} onClick={() => go(s)} title={`${t.screens[s]} (${i + 1})`}>
                <span className="tab-n" aria-hidden="true">{i + 1}</span>{t.screens[s]}
              </button>
            ))}
          </nav>
          {screen !== 'spelen' && <LoopPill onOpen={() => go('spelen')} />}
          <div className="ctx">
            {/* je instrument en de toonaard waarin je leest; een klik opent de instellingen om het te wijzigen */}
            <button type="button" className="reading" onClick={() => setSettings(true)}
              title={shift ? fill(t.readingTip, { key: t.readingKeys[shift] ?? '', w: names.note(C), c: concertNames.note(C) }) : t.myInstrumentHelp}>{instrumentLabel}</button>
            <button type="button" className="ctx-scale" onClick={() => go('ladder')}>{scaleLabel(scale)}</button>
            <span aria-hidden="true">·</span>
            <b>{names.chord(chords[state.degree])}</b>
            <PlayButton id="chord" label={t.playChord} onPlay={playChord} compact className="ghost iconbtn" />
            {/* het gekozen akkoord in het schema zetten, op de cursor (werkt op elk scherm, ook met touch en toetsenbord) */}
            <button type="button" className="ghost iconbtn" onClick={add} title={fill(t.addTip, { chord: names.chord(chords[state.degree]) })}
              aria-label={fill(t.addTip, { chord: names.chord(chords[state.degree]) })}>+</button>
            <button type="button" className="ghost iconbtn" aria-label={t.settingsTitle} title={t.settingsTitle} onClick={() => setSettings(true)}>⚙</button>
          </div>
        </div>
      </header>
      <main className="wrap">
        {screen === 'ladder' && <LadderScreen />}
        {screen === 'akkoorden' && <AkkoordenScreen />}
        {screen === 'spelen' && <SpelenScreen />}
        <footer className="muted small credits">{t.credits}</footer>
      </main>
      <Settings open={settings} onClose={() => setSettings(false)} />
      <Toaster />
    </div>
  );
}

export function App() {
  return <AppProvider><LoopProvider><Layout /></LoopProvider></AppProvider>;
}
