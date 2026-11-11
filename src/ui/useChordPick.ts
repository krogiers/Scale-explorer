import type { MouseEvent } from 'react';
import { fill } from '../i18n';
import { MAX_CHORDS, useApp } from '../state';
import { showToast } from './Toast';

/**
 * Eén regel voor elk akkoord dat je aanklikt (kwintencirkel, akkoordenrij, netwerk, volgende stappen):
 * klik = kiezen en horen; dubbelklik = ook in het schema zetten, op de cursor. De "+" in de bovenbalk doet hetzelfde.
 * Kiezen verandert het schema nooit; toevoegen toont een melding die je kunt terugdraaien.
 */
export function useChordPick() {
  const { state, dispatch, t, names, chords } = useApp();
  /** Het gekozen akkoord in het schema zetten, met een melding. */
  const add = () => {
    if (state.path.length >= MAX_CHORDS) { showToast({ text: fill(t.chartFull, { n: MAX_CHORDS }) }); return; }
    dispatch({ type: 'add' });
    showToast({ text: fill(t.toastAdded, { chord: names.chord(chords[state.degree]) }), action: { label: t.undo, run: () => dispatch({ type: 'undo' }) } });
  };
  /** Handlers voor een akkoord: choose kiest het (en laat het horen). */
  const handlers = (choose: () => void) => ({
    // bij een dubbelklik is dit de tweede klik: niet nog eens kiezen (en horen), de dubbelklik voegt toe
    onClick: (e: MouseEvent) => { if (e.detail < 2) choose(); },
    onDoubleClick: add,
  });
  return { add, handlers };
}
