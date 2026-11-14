import { CHAR_DEGREE, blueNote, pentatonic, scaleOf } from '../../core';
import { fill } from '../../i18n';
import { instrumentById, INSTRUMENTS } from '../../instruments';
import { writtenScale } from '../../naming';
import { practiceAt, useApp, useLoop } from '../../state';
import { Heading } from '../../ui';

/**
 * De grepen op een instrument naar keuze, in de stemming waarin je leest (⚙ Instellingen → Stemming).
 * Het instrument kies je hier; het verandert de stemming niet. Staat dat instrument meestal in een andere stemming,
 * dan zegt een hint dat, met een knop om over te schakelen.
 * fold: optioneel inklapbaar; dicht = alleen de titel.
 * Tijdens een oefening toont het instrument de modus die nu geldt, met de drone (grondtoon en kwint) als akkoord,
 * de brugnoten gemarkeerd en de noten van de andere modus gestreept.
 */
export function InstrumentPanel({ fold }: { fold?: { open: boolean; toggle: () => void } }) {
  const { state, dispatch, t, names, concertNames, shift, scale: chosen, chords, scaleLabel, concertLabel } = useApp();
  const { running, info, practice } = useLoop();
  const instrument = instrumentById(state.instrument);
  const Instrument = instrument.component;
  const usual = instrument.transpose ?? 0;
  const name = t.instruments[state.instrument] ?? '';
  // blazers lezen geschreven noten: dezelfde modus, getransponeerd en gespeld zoals overal in de app
  const at = running && practice ? practiceAt(practice, info) : null;
  const scale = at ? scaleOf(at.now.root, at.now.mode) : chosen;
  const shown = writtenScale(scale, names.reading);
  const other = at ? writtenScale(scaleOf(at.other.root, at.other.mode), names.reading) : null;
  const bridge = other ? new Set(shown.notes.filter((n) => !other.pcs.has(n.pc)).map((n) => n.pc)) : undefined;
  const dropped = other ? other.notes.filter((n) => !shown.pcs.has(n.pc)) : undefined;
  const chordPcs = at ? [scale.root, (scale.root + 7) % 12] : [...chords[state.degree].pcs];
  const chord = new Set(chordPcs.map((pc) => (pc + shift) % 12));
  const outside = new Set(state.showPenta ? pentatonic(shown).dropped.map((n) => n.pc) : []);
  const title = `${t.instrTitle} · ${name} · ${t.readingKeys[shift] ?? ''}`;
  return (
    <>
      <Heading help={t.instrumentHelp[instrument.help ?? state.instrument]} title={fold
        ? <button type="button" className="fold" aria-expanded={fold.open} title={fold.open ? t.foldClose : t.foldOpen} onClick={fold.toggle}>{title}</button>
        : title}>
        <label><span className="sr-only">{t.instrPick}</span>
          <select value={state.instrument} onChange={(e) => dispatch({ type: 'settings', patch: { instrument: e.target.value } })}>
            {INSTRUMENTS.map((i) => <option key={i.id} value={i.id}>{t.instruments[i.id]}</option>)}
          </select>
        </label>
      </Heading>
      {fold && !fold.open ? null : <>
      {usual !== shift && (
        <p className="small instr-hint">{fill(t.tuningHint, { instr: name.toLowerCase(), key: t.readingKeys[usual] ?? '', now: t.readingKeys[shift] ?? '' })}{' '}
          <button type="button" className="ghost" onClick={() => dispatch({ type: 'settings', patch: { reading: usual } })}>{fill(t.tuningUse, { key: t.readingKeys[usual] ?? '' })}</button></p>
      )}
      <Instrument scaleNotes={shown.notes} scale={shown.pcs} chord={chord} root={shown.root}
        characteristic={shown.notes[CHAR_DEGREE[shown.mode]].pc} blue={state.showBlue ? blueNote(shown).note : null} outside={outside} bridge={bridge} dropped={dropped} names={concertNames} label={name} />
      {shift > 0 && <p className="small">{fill(t.saxWritten, { scale: scaleLabel(scale), concert: concertLabel(scale) })}</p>}
      </>}
    </>
  );
}
