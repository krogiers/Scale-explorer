# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static React 18 + TS + Vite app for exploring modes, scales and chords. No backend, no linter.

## Commands
- `npm run dev` · `npm test` · `npm run typecheck` · `npm run build`
- Single test: `npx vitest run src/core/theory.test.ts` or `-t "name"`
- Push to `main` deploys to GitHub Pages (CI runs test + build). Keep `base: './'` in `vite.config.ts`.

## Architecture
- Packages = folders with an `index.ts` front door; import other packages only through it. Layers: `core` ← `i18n`, `naming`, `audio`, `instruments` ← `state` ← `ui` ← `screens/*` ← `App`. Screens never import each other; `App.tsx` holds the app bar, hash navigation (`#ladder|#akkoorden|#spelen`, keys 1–3) and a loop pill (■ + now playing) when the loop runs off the Spelen screen. `src/architecture.test.ts` enforces this.
- `core/`: pure theory on pitch classes 0–11 (`pitch`, `scale`, `chords`, `colour`, `navigation`, `sequences`, `modes` = 84-mode grid, bridge, route). No names, i18n or React.
- Registries: `naming/` (`NOTE_NAMERS`), `i18n/` (`nl.ts` is the source of truth via `Messages = typeof nl`), `instruments/` (`INSTRUMENTS`; winds in `wind/`), `audio/` (`engine/` sound with a channel strip per part, `mix` mixer model, `loop/` scheduler + grooves on the AudioContext clock).
- `state/`: `model`, pure `reducer`, `persist` (`tln-prefs`, `tln-chart`), `store` (provider, plays audio on dispatch), `loop` (one shared LoopPlayer, survives screen switches).
- Only one thing plays at a time: `audio/transport` (`takeOver(id, stop)`); `usePlaying()` + `ui/PlayButton` show ▶/■ per id.
- CSS lives next to its screen/instrument; `styles/index.css` imports all in the original cascade order. Don't reorder.
- `ModeIndex` 0–6 runs bright→dark (Lyd, Ion, Mix, Dor, Aeo, Phr, Loc), not the classical order. Chords are compared by `key` (`"10:maj"`), independent of spelling.
- README (Dutch) has the full math model. Read it before changing theory or navigation.

## Notes
- `audio/samples/*.ts` are base64 recordings (~1 MB / ~340 KB each). Never read or edit them.
- Comments and the README are in Dutch. Match that.
- When editing this file, keep it as compact as possible: terse bullets, nothing discoverable from the code.

## Git
Never run any git command (not even read-only) unless the user explicitly allows it for that action.

## Prompt Feedback
Before non-trivial tasks: restate the task in 1–2 sentences, flag any ambiguities, and ask for confirmation. Skip this for simple requests.

## Claude maintenance
When editing this file, keep it as compact as possible: terse bullets, nothing discoverable from the code.
