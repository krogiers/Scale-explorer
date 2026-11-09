/** Bewaren in de browser (localStorage) en de begintoestand daaruit opbouwen. Onleesbare gegevens worden genegeerd. */
import type { ChordSize } from '../core';
import { TIMBRES, validMix } from '../audio';
import { MESSAGES } from '../i18n';
import { SAX_KEYS } from '../instruments';
import { clampBpm, type PathEntry, type State } from './model';

const PREFS_KEY = 'tln-prefs';
function loadPrefs(): Partial<State> {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}'); } catch { return {}; }
}

const CHART_KEY = 'tln-chart';
const inRange = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
/** Een opgeslagen schema alleen overnemen als elke waarde geldig is; anders zou de app bij het starten crashen. */
/** Oudere schema's hebben geen grootte per akkoord: die krijgen de grootte uit de voorkeuren. */
export function validChart(c: unknown, defaultSize: ChordSize = 3): PathEntry[] | null {
  if (!Array.isArray(c) || c.length === 0) return null;
  const ok = c.every((e) => e && inRange(e.root, 0, 11) && inRange(e.mode, 0, 6) && inRange(e.degree, 0, 6) && inRange(e.beats, 1, 16)
    && (e.size === undefined || e.size === 3 || e.size === 4));
  return ok ? c.map(({ root, mode, degree, beats, size }) => ({ root, mode, degree, beats, size: size ?? defaultSize })) : null;
}

function loadChart(defaultSize: ChordSize): PathEntry[] | null {
  try { return validChart(JSON.parse(localStorage.getItem(CHART_KEY) ?? 'null'), defaultSize); } catch { return null; }
}

/** Vroeger bewaarde de loop het tempo zelf; neem dat over zodat niemand zijn tempo kwijt is. */
function legacyLoopBpm(): unknown {
  try { return JSON.parse(localStorage.getItem('tln-loop') ?? '{}').bpm; } catch { return undefined; }
}

export function initial(): State {
  const p = loadPrefs();
  const size: ChordSize = p.size === 4 ? 4 : 3;
  const saved = loadChart(size);
  const start: PathEntry = saved?.[saved.length - 1] ?? { root: 2, mode: 3, degree: 0, beats: 4, size }; // D Dorisch
  return {
    root: start.root, mode: start.mode, degree: start.degree,
    timbre: p.timbre && TIMBRES.includes(p.timbre) ? p.timbre : 'piano',
    meter: p.meter === 3 ? 3 : 4,
    bpm: clampBpm(p.bpm ?? legacyLoopBpm()),
    showBlue: p.showBlue !== false,
    showPenta: p.showPenta === true,
    focus: (saved?.length ?? 1) - 1,
    size,
    history: [],
    lang: p.lang && p.lang in MESSAGES ? p.lang : 'nl',
    namer: typeof p.namer === 'string' ? p.namer : 'en',
    instrument: typeof p.instrument === 'string' ? p.instrument : 'piano',
    saxKey: p.saxKey && SAX_KEYS.includes(p.saxKey) ? p.saxKey : 'Eb',
    sound: p.sound !== false,
    timbreFollows: p.timbreFollows !== false,
    theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : 'auto',
    mix: validMix(p.mix),
    path: saved ?? [start],
  };
}

/** Voorkeuren bewaren (alles behalve het schema en de huidige positie). */
export function savePrefs(s: State) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: s.lang, namer: s.namer, size: s.size, sound: s.sound, instrument: s.instrument, timbre: s.timbre, meter: s.meter, showBlue: s.showBlue, showPenta: s.showPenta, bpm: s.bpm, saxKey: s.saxKey, timbreFollows: s.timbreFollows, theme: s.theme, mix: s.mix }));
  } catch { /* opslag niet beschikbaar: geen probleem */ }
}

export function saveChart(path: PathEntry[]) {
  try { localStorage.setItem(CHART_KEY, JSON.stringify(path)); } catch { /* niet erg */ }
}
