# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static React 18 + TS + Vite app for exploring modes, scales and chords. No backend, no linter.

## Commands
- `npm run dev` · `npm test` · `npm run typecheck` · `npm run build`
- Single test: `npx vitest run src/core/theory.test.ts` or `-t "name"`
- Push to `main` deploys to GitHub Pages (CI runs test + build). Keep `base: './'` in `vite.config.ts`.

## Architecture
- `core/`: pure theory on pitch classes 0–11 (`theory.ts`), next-step logic `computeTargets` (`navigation.ts`). No names, i18n or React.
- Pluggable registries: `naming/` (`NOTE_NAMERS`), `i18n/` (`nl.ts` is the source of truth via `Messages = typeof nl`), `instruments/` (`INSTRUMENTS`), `audio/` (`AudioEngine`; `loop.ts` schedules on the AudioContext clock).
- `state/store.tsx`: one reducer + context. Persists `tln-prefs` and `tln-chart` to localStorage and triggers audio.
- `ModeIndex` 0–6 runs bright→dark (Lyd, Ion, Mix, Dor, Aeo, Phr, Loc), not the classical order. Chords are compared by `key` (`"10:maj"`), independent of spelling.
- README (Dutch) has the full math model. Read it before changing theory or navigation.

## Notes
- `audio/samples.ts` is ~1 MB of base64. Never read it or edit it.
- Comments and the README are in Dutch. Match that.
- When editing this file, keep it as compact as possible: terse bullets, nothing discoverable from the code.

## Git
Never run any git command (not even read-only) unless the user explicitly allows it for that action.

## Prompt Feedback
Before non-trivial tasks: restate the task in 1–2 sentences, flag any ambiguities, and ask for confirmation. Skip this for simple requests.

## Claude maintenance
When editing this file, keep it as compact as possible: terse bullets, nothing discoverable from the code.
