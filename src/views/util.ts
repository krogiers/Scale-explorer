import type { KeyboardEvent } from 'react';
import type { Scale } from '../core/theory';
import { fill, type Messages } from '../i18n';

export function signatureLabel(s: Scale, t: Messages): string {
  if (s.signature === 0) return t.noAcc;
  return Math.abs(s.signature) + (s.signature > 0 ? '♯' : '♭');
}
export const signatureShort = (s: Scale) => (s.signature === 0 ? '0' : Math.abs(s.signature) + (s.signature > 0 ? '♯' : '♭'));

export const sharedText = (n: number, t: Messages) => (n === 0 ? t.shared0 : n === 1 ? t.shared1 : fill(t.sharedN, { n }));

/** Enter of spatie activeert een SVG-element met role="button". */
export const onKeyActivate = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
};
