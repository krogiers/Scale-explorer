import { CHAR_DEGREE, blueNote, pentatonic, transposed } from '../../core';
import { fill } from '../../i18n';
import { INSTRUMENTS, SAX_KEYS, SAX_TRANSPOSE, instrumentById, type SaxKey } from '../../instruments';
import { useApp } from '../../state';
import { Heading } from '../../ui';

/** fold: optioneel inklapbaar (op Ladder); dicht = alleen de titel. */
export function InstrumentPanel({ fold }: { fold?: { open: boolean; toggle: () => void } }) {
  const { state, dispatch, t, names, scale, chords, scaleLabel } = useApp();
  const instrument = instrumentById(state.instrument);
  const Instrument = instrument.component;
  // blazers lezen geschreven noten: dezelfde modus, getransponeerd naar hun stemming
  const shift = state.instrument === 'sax' ? SAX_TRANSPOSE[state.saxKey] : instrument.transpose ?? 0;
  const shown = shift ? transposed(scale, shift) : scale;
  const chord = new Set([...chords[state.degree].pcs].map((pc) => (pc + shift) % 12));
  const outside = new Set(state.showPenta ? pentatonic(shown).dropped.map((n) => n.pc) : []);
  return (
    <>
      <Heading help={t.instrumentHelp[state.instrument]} title={fold
        ? <button type="button" className="fold" aria-expanded={fold.open} title={fold.open ? t.foldClose : t.foldOpen} onClick={fold.toggle}>{t.instrTitle}</button>
        : t.instrTitle}>
        {(!fold || fold.open) && <div className="row instrtools">
          {state.instrument === 'sax' && (
            <div className="field"><label htmlFor="saxkey">{t.saxKey}</label>
              <select id="saxkey" value={state.saxKey} onChange={(e) => dispatch({ type: 'settings', patch: { saxKey: e.target.value as SaxKey } })}>
                {SAX_KEYS.map((k) => <option key={k} value={k}>{t.saxKeys[k]}</option>)}
              </select>
            </div>
          )}
          <div className="field"><label htmlFor="instr">{t.instrument}</label>
            <select id="instr" value={state.instrument} onChange={(e) => dispatch({ type: 'settings', patch: { instrument: e.target.value } })}>
              {INSTRUMENTS.map((i) => <option key={i.id} value={i.id}>{t.instruments[i.id] ?? i.id}</option>)}
            </select>
          </div>
        </div>}
      </Heading>
      {fold && !fold.open ? null : <>
      <Instrument scaleNotes={shown.notes} scale={shown.pcs} chord={chord} root={shown.root}
        characteristic={shown.notes[CHAR_DEGREE[shown.mode]].pc} blue={state.showBlue ? blueNote(shown).note : null} outside={outside} names={names} label={t.instruments[state.instrument] ?? ''} />
      {shift > 0 && <p className="small">{fill(t.saxWritten, { scale: scaleLabel(shown), concert: scaleLabel(scale) })}</p>}
      </>}
    </>
  );
}
