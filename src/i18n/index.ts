/**
 * Interface: taal van de interface. Elke taal is één woordenboek met dezelfde sleutels
 * (TypeScript dwingt dat af via het type Messages). Een taal toevoegen = één bestand plus één regel hier.
 */
import { nl } from './nl';
import { en } from './en';

export type Messages = typeof nl;
export const MESSAGES = { nl, en: en satisfies Messages };
export type Lang = keyof typeof MESSAGES;
export const LANGS: Lang[] = ['nl', 'en'];

/** Vul {naam}-plaatshouders in. */
export function fill(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] != null ? String(vars[k]) : ''));
}
