/**
 * Bewaakt de indeling in pakketjes. Elke map in src/ is een pakket met een voordeur (index.ts);
 * een pakket mag alleen de pakketten gebruiken die eronder liggen, en alleen via hun voordeur.
 *
 *   core  ←  i18n, naming, audio, instruments  ←  state  ←  ui  ←  screens/*  ←  App
 */
import { describe, expect, it } from 'vitest';

/** Alle broncode als tekst, sleutel = pad vanaf src/ (zonder './'). Vite leest ze in; geen Node-API nodig. */
const SOURCES = Object.fromEntries(
  Object.entries(import.meta.glob(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./audio/samples/**'], { query: '?raw', import: 'default', eager: true }))
    .map(([p, text]) => [p.slice(2), text as string]),
);
/** Welke pakketten elk pakket mag importeren (naast zichzelf). */
const ALLOWED: Record<string, string[]> = {
  core: [],
  i18n: [],
  naming: ['core', 'i18n'],
  audio: ['core'],
  instruments: ['core', 'naming'],
  state: ['core', 'i18n', 'naming', 'audio', 'instruments'],
  ui: ['core', 'i18n', 'state'],
  screens: ['core', 'i18n', 'naming', 'audio', 'instruments', 'state', 'ui'],
};
/** Pakketten die niets van React of de browser-UI mogen weten. */
const NO_REACT = ['core', 'audio', 'i18n', 'naming'];

const imports = (file: string) => [...SOURCES[file].matchAll(/^import [^;]*?from '([^']+)'|^import '([^']+)'/gm)].map((m) => m[1] ?? m[2]);
/** Pad relatief aan src/, met ./ en ../ opgelost. */
function resolve(fromFile: string, spec: string): string {
  const parts = fromFile.split('/').slice(0, -1);
  for (const seg of spec.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}
const isDirWithIndex = (p: string) => `${p}/index.ts` in SOURCES;
/** Pakket van een pad: de eerste map onder src/, en voor screens ook het scherm (screens/ladder). */
function pkg(path: string): string {
  const [top, sub] = path.split('/');
  return top === 'screens' ? `screens/${sub}` : top;
}

const all = Object.keys(SOURCES).filter((f) => f.includes('/'));

describe('architectuur', () => {
  it('elk pakket gebruikt alleen de pakketten eronder', () => {
    const wrong: string[] = [];
    for (const f of all) {
      const from = pkg(f);
      const allowed = ALLOWED[from.split('/')[0]];
      for (const spec of imports(f).filter((s) => s.startsWith('.'))) {
        const to = pkg(resolve(f, spec));
        if (to === from) continue;
        if (from.startsWith('screens/') && to.startsWith('screens/')) wrong.push(`${f}: ander scherm ${to}`);
        else if (!allowed.includes(to.split('/')[0])) wrong.push(`${f} → ${to}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('van buitenaf alleen via de voordeur (een map met index.ts)', () => {
    const wrong: string[] = [];
    for (const f of [...all, 'App.tsx']) {
      for (const spec of imports(f).filter((s) => s.startsWith('.') && !s.endsWith('.css'))) {
        const target = resolve(f, spec);
        if (f.includes('/') && pkg(target) === pkg(f)) continue;
        if (!isDirWithIndex(target)) wrong.push(`${f} → ${spec}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('theorie, geluid, taal en nootnamen kennen React niet', () => {
    const wrong = all.filter((f) => NO_REACT.includes(pkg(f)) && imports(f).some((s) => s === 'react' || s.startsWith('react-dom')));
    expect(wrong).toEqual([]);
  });

  it('elk pakket en elk scherm heeft een voordeur', () => {
    expect(all.length).toBeGreaterThan(50); // de glob vond de bronbestanden echt
    const screens = new Set(all.filter((f) => f.startsWith('screens/')).map(pkg));
    const dirs = [...Object.keys(ALLOWED).filter((d) => d !== 'screens'), ...screens];
    expect(dirs.filter((d) => !isDirWithIndex(d))).toEqual([]);
  });
});
