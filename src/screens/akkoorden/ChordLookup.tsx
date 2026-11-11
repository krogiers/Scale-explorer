import { useState } from 'react';
import { chordHomes, LETTER_PC, mod12, rootAt, romanNumeral, sameSpot, scaleOf, type ModeIndex, type Quality } from '../../core';
import { fill } from '../../i18n';
import { chordSuffix, parseChord } from '../../naming';
import { useApp } from '../../state';
import { Heading, signatureLabel } from '../../ui';

/** Grondtonen om te kiezen, zoals je ze leest: C, D♭, D, E♭, E, F, F♯, G, A♭, A, B♭, B (letter, voorteken). */
const ROOTS: [number, number][] = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
const QUALITIES: Quality[] = ['maj', 'min', 'dim', 'aug', 'maj7', '7', 'm7', 'm7b5', 'dim7', 'mM7'];

/**
 * Akkoord opzoeken: typ of kies een akkoord (in de toonaard van je instrument) en zie in welke moederladders en modi
 * het voorkomt, met zijn rol daar. Modi op dezelfde grondtoon als het akkoord (daar is het de tonica) en de modus waar
 * je nu bent, springen eruit. Een klik brengt je naar die modus, met het akkoord gekozen.
 */
export function ChordLookup() {
  const { state, dispatch, t, names, concertNames, shift, chords, scaleLabel } = useApp();
  const current = names.chord(chords[state.degree]);
  const [text, setText] = useState(current);
  const parsed = parseChord(text);
  // wat je typt is geschreven (zoals je leest); de app rekent in concert
  const writtenPc = parsed ? mod12(LETTER_PC[parsed.letter] + parsed.acc) : 0;
  const rootPc = mod12(writtenPc - shift);
  const homes = parsed ? chordHomes(rootPc, parsed.quality) : [];
  const total = homes.reduce((n, h) => n + h.modes.length, 0);
  const label = parsed ? concertNames.note({ pc: writtenPc, letter: parsed.letter, acc: parsed.acc }) + chordSuffix(parsed.quality) : '';
  const onRoot = homes.flatMap((h) => h.modes).filter((m) => m.spot.root === rootPc);
  const here = { root: state.root, mode: state.mode };
  const qLabel = (q: Quality) => (q === 'maj' ? t.lkMaj : chordSuffix(q));
  // knoppen bouwen de tekst op: grondtoon behouden en soort wisselen, of omgekeerd
  const setRoot = ([l, a]: [number, number]) => setText(concertNames.note({ pc: mod12(LETTER_PC[l] + a), letter: l, acc: a }) + chordSuffix(parsed?.quality ?? 'maj'));
  const setQuality = (q: Quality) => setText((parsed ? concertNames.note({ pc: writtenPc, letter: parsed.letter, acc: parsed.acc }) : concertNames.note({ pc: 0, letter: 0, acc: 0 })) + chordSuffix(q));

  return (
    <div className="lookup">
      <Heading title={t.lkTitle} help={t.lkHelp} />
      <div className="row lk-input">
        <label className="grow"><span className="sr-only">{t.lkLabel}</span>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Cm7, F♯m7♭5, B♭maj7…" spellCheck={false} autoComplete="off"
            aria-invalid={text.trim() !== '' && !parsed} aria-describedby="lk-result" />
        </label>
        <button type="button" className="ghost" onClick={() => setText(current)}>{fill(t.lkUseCurrent, { chord: current })}</button>
      </div>
      <div className="lk-pick">
        <div className="choices lk-roots" role="group" aria-label={t.lkRoot}>
          {ROOTS.map(([l, a]) => {
            const pc = mod12(LETTER_PC[l] + a);
            return <button key={pc} type="button" aria-pressed={!!parsed && writtenPc === pc} onClick={() => setRoot([l, a])}>{concertNames.note({ pc, letter: l, acc: a })}</button>;
          })}
        </div>
        <div className="choices lk-kinds" role="group" aria-label={t.lkKind}>
          {QUALITIES.map((q) => <button key={q} type="button" aria-pressed={parsed?.quality === q} onClick={() => setQuality(q)}>{qLabel(q)}</button>)}
        </div>
      </div>
      <div id="lk-result" aria-live="polite">
        {!parsed ? (
          text.trim() && <p className="muted">{t.lkUnknown}</p>
        ) : homes.length === 0 ? (
          <p>{fill(t.lkNone, { chord: label })}</p>
        ) : (
          <>
            <p>{fill(t.lkFound, { chord: label, n: homes.length, m: total })}{' '}
              {onRoot.length > 0 && fill(t.lkHome, { root: concertNames.note({ pc: writtenPc, letter: parsed.letter, acc: parsed.acc }), list: onRoot.map((m) => scaleLabel(scaleOf(m.spot.root, m.spot.mode))).join(', ') })}</p>
            <div className="lk-homes">
              {homes.map((h) => {
                const parent = scaleOf(rootAt(h.parent, 1 as ModeIndex), 1);
                return (
                  <div key={h.parent} className="lk-home">
                    <div className="lk-head"><b>{fill(t.lkFamily, { key: names.note(parent.notes[0]) })}</b> <span className="muted small">{signatureLabel(names.signature(parent), t)}</span></div>
                    <div className="lk-modes">
                      {h.modes.map(({ spot, chord }) => {
                        const s = scaleOf(spot.root, spot.mode);
                        const cls = `lk-mode${spot.root === rootPc ? ' on-root' : ''}${sameSpot(spot, here) ? ' here' : ''}`;
                        return (
                          <button key={spot.mode} type="button" className={cls} style={{ ['--mc' as string]: `var(--m${spot.mode})` }}
                            title={fill(t.lkGo, { scale: scaleLabel(s), chord: names.chord(chord) })}
                            onClick={() => dispatch({ type: 'go', to: { root: spot.root, mode: spot.mode, degree: chord.degree } })}>
                            <span className="lk-sc">{scaleLabel(s)}</span>
                            <span className="lk-rn">{romanNumeral(s, chord)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="muted small lk-legend"><span className="lk-key on-root" /> {t.lkLgRoot} <span className="lk-key here" /> {t.lkLgHere}</p>
          </>
        )}
      </div>
    </div>
  );
}
