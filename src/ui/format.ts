import type { KeyboardEvent } from 'react';
import { fill, type Messages } from '../i18n';

/** Voortekening als tekst; sig = aantal voortekens zoals je leest (names.signature), positief = kruizen. */
export function signatureLabel(sig: number, t: Messages): string {
  if (sig === 0) return t.noAcc;
  return Math.abs(sig) + (sig > 0 ? '♯' : '♭');
}
export const signatureShort = (sig: number) => (sig === 0 ? '0' : Math.abs(sig) + (sig > 0 ? '♯' : '♭'));

export const sharedText = (n: number, t: Messages) => (n === 0 ? t.shared0 : n === 1 ? t.shared1 : fill(t.sharedN, { n }));

/** Enter of spatie activeert een SVG-element met role="button". */
export const onKeyActivate = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
};
