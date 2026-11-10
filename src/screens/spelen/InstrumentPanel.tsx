import { CHAR_DEGREE, blueNote, pentatonic, scaleOf } from '../../core';
import { fill } from '../../i18n';
import { instrumentById } from '../../instruments';
import { writtenScale } from '../../naming';
import { practiceAt, useApp, useLoop } from '../../state';
import { Heading } from '../../ui';

/**
 * De grepen van jouw instrument (⚙ Instellingen → Mijn instrument), in de toonaard waarin je leest.
 * Hier kies je niets: het paneel toont alleen hoe je speelt wat er klinkt.
 * fold: optioneel inklapbaar (op Ladder); dicht = alleen de titel.
 * Tijdens een oefening toont het instrument de modus die nu geldt, met de drone (grondtoon en kwint) als akkoord,
 * de brugnoten gemarkeerd en de noten van de andere modus gestreept.
 */
export function InstrumentPanel({ fold }: { fold?: { open: boolean; toggle: () => void } }) {
  const { state, t, names, concertNames, shift, scale: chosen, chords, scaleLabel, concertLabel, instrumentLabel } = useApp();
  const { running, info, practice } = useLoop();
  const instrument = instrumentById(state.instrument);
  const Instrument = instrument.component;
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
  return (
    <>
      <Heading help={t.instrumentHelp[instrument.help ?? state.instrument]} title={fold
        ? <button type="button" className="fold" aria-expanded={fold.open} title={fold.open ? t.foldClose : t.foldOpen} onClick={fold.toggle}>{t.instrTitle} · {instrumentLabel}</button>
        : `${t.instrTitle} · ${instrumentLabel}`} />
      {fold && !fold.open ? null : <>
      <Instrument scaleNotes={shown.notes} scale={shown.pcs} chord={chord} root={shown.root}
        characteristic={shown.notes[CHAR_DEGREE[shown.mode]].pc} blue={state.showBlue ? blueNote(shown).note : null} outside={outside} bridge={bridge} dropped={dropped} names={concertNames} label={t.instruments[state.instrument] ?? ''} />
      {shift > 0 && <p className="small">{fill(t.saxWritten, { scale: scaleLabel(scale), concert: concertLabel(scale) })}</p>}
      </>}
    </>
  );
}
