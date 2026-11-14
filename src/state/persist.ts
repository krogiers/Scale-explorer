/** Bewaren in de browser (localStorage) en de begintoestand daaruit opbouwen. Onleesbare gegevens worden genegeerd. */
import type { ChordSize } from '../core';
import { isCompTimbre, TIMBRES, validMix, type CompTimbre, type Timbre } from '../audio';
import { MESSAGES } from '../i18n';
import { INSTRUMENTS, writtenShift } from '../instruments';
import { isReading } from '../naming';
import { clampBpm, type PathEntry, type State } from './model';
import { validMarks } from './repeats';

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
  return ok ? c.map((e) => ({ root: e.root, mode: e.mode, degree: e.degree, beats: e.beats, size: e.size ?? defaultSize, ...validMarks(e) })) : null;
}

function loadChart(defaultSize: ChordSize): PathEntry[] | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHART_KEY) ?? 'null');
    // een bewust leeggemaakt schema blijft leeg
    return Array.isArray(c) && c.length === 0 ? [] : validChart(c, defaultSize);
  } catch { return null; }
}

/** Vroeger bewaarde de loop het tempo zelf; neem dat over zodat niemand zijn tempo kwijt is. */
function legacyLoopBpm(): unknown {
  try { return JSON.parse(localStorage.getItem('tln-loop') ?? '{}').bpm; } catch { return undefined; }
}

/** Het bewaarde instrument; vroeger was er één sax met een aparte stemming (B♭ = tenor, anders alt). */
export function instrumentFrom(p: { instrument?: unknown; saxKey?: unknown }): string {
  if (p.instrument === 'sax') return p.saxKey === 'Bb' ? 'tenorsax' : 'altsax';
  return INSTRUMENTS.some((i) => i.id === p.instrument) ? (p.instrument as string) : 'piano';
}

/** De stemming; vroeger volgde ze uit het instrument (tenorsax = B♭): neem die dan over. */
export function readingFrom(p: { reading?: unknown; instrument?: unknown; saxKey?: unknown }): number {
  return isReading(p.reading) ? p.reading : writtenShift(instrumentFrom(p));
}

const isTimbre = (t: unknown): t is Timbre => (TIMBRES as readonly unknown[]).includes(t);

/**
 * Akkoord- en melodieklank uit de voorkeuren. Vroeger was er één klank ('timbre', met 'sax' = tenorsax): een
 * akkoordinstrument blijft de akkoordklank, een blazer wordt de melodieklank. Zonder keuze klinkt de melodie als je
 * eigen instrument (alle instrumenten hebben een eigen klank), de akkoorden als piano.
 */
export function timbresFrom(p: Record<string, unknown>, instrument: string): { compTimbre: CompTimbre; leadTimbre: Timbre } {
  const old = p.timbre === 'sax' ? 'tenorsax' : p.timbre;
  const own: Timbre = isTimbre(instrument) ? instrument : 'piano';
  return {
    compTimbre: isCompTimbre(p.compTimbre) ? p.compTimbre : isCompTimbre(old) ? old : 'piano',
    leadTimbre: isTimbre(p.leadTimbre) ? p.leadTimbre : isTimbre(old) && !isCompTimbre(old) ? old : own,
  };
}

export function initial(): State {
  const p = loadPrefs();
  const size: ChordSize = p.size === 4 ? 4 : 3;
  const saved = loadChart(size);
  const start: PathEntry = saved?.[saved.length - 1] ?? { root: 2, mode: 3, degree: 0, beats: 4, size }; // D Dorisch
  return {
    root: start.root, mode: start.mode, degree: start.degree,
    ...timbresFrom(p as Record<string, unknown>, instrumentFrom(p)),
    meter: p.meter === 3 ? 3 : 4,
    bpm: clampBpm(p.bpm ?? legacyLoopBpm()),
    showBlue: p.showBlue !== false,
    showPenta: p.showPenta === true,
    focus: (saved?.length ?? 1) - 1,
    cursor: saved?.length ?? 1, // achteraan
    size,
    history: [],
    lang: p.lang && p.lang in MESSAGES ? p.lang : 'nl',
    namer: typeof p.namer === 'string' ? p.namer : 'en',
    reading: readingFrom(p),
    instrument: instrumentFrom(p),
    sound: p.sound !== false,
    theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : 'auto',
    mix: validMix(p.mix),
    path: saved ?? [start],
  };
}

/** Voorkeuren bewaren (alles behalve het schema en de huidige positie). */
export function savePrefs(s: State) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ lang: s.lang, namer: s.namer, size: s.size, sound: s.sound, reading: s.reading, instrument: s.instrument, compTimbre: s.compTimbre, leadTimbre: s.leadTimbre, meter: s.meter, showBlue: s.showBlue, showPenta: s.showPenta, bpm: s.bpm, theme: s.theme, mix: s.mix }));
  } catch { /* opslag niet beschikbaar: geen probleem */ }
}

export function saveChart(path: PathEntry[]) {
  try { localStorage.setItem(CHART_KEY, JSON.stringify(path)); } catch { /* niet erg */ }
}
