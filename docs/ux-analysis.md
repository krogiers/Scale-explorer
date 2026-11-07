# UI/UX-analyse Scale Explorer

_UX designer, 2026-11-02. Screenshots: [docs/ux/](ux/), gemaakt op 1440, 768 en 390 px, in licht en donker._

## Samenvatting
De app ziet er verzorgd uit: rustige kleuren, sterke typografie (Bodoni en Plex) en een donkere modus die werkt. Hij gedraagt zich echter als een lang naslagdocument en niet als een app. De pagina is 3846 px hoog op desktop en 5311 px op een telefoon. Wat je het meest gebruikt (akkoord kiezen, meespelen, het instrument) ligt verspreid over die hele lengte. Voor een PWA ontbreken nog alle onderdelen: manifest, iconen, service worker en lokale fonts.

## Wat werkt
- De visuele identiteit is consistent, met kleurtokens op `:root` en een goede donkere variant ([desktop-dark.png](ux/desktop-dark.png)).
- De kwintencirkel met de boog en de modusladder met "anders: F♯" zijn sterk en meteen te begrijpen.
- De kleurcodes zijn overal dezelfde: groen is diatonisch, paars is leen of kenmerkend, goud is spil of keuze.
- Er is al aandacht voor toegankelijkheid: `role="button"` met toetsenbord op SVG, `aria-pressed`, `aria-live` voor de loop en `prefers-reduced-motion`.
- Er is geen horizontale scroll op 390 px.

## Problemen
| Ernst | Waar | Probleem |
| --- | --- | --- |
| hoog | hele pagina | Er is geen duidelijke hoofdtaak of navigatie. Acht panelen staan onder elkaar. Meespelen begint pas rond 2400 px (desktop) en het instrument staat daaronder, dus tijdens de loop zie je je klavier niet. |
| hoog | telefoon ([phone-light.png](ux/phone-light.png)) | 121 van de 135 bedieningselementen zijn kleiner dan 44 px. Het akkoordennetwerk is op 390 px onleesbaar (de tekst wordt zo'n 4 px), net als het klavier (labels van 9 px, [piano.css:8](../src/instruments/piano.css#L8)). |
| hoog | [piano.css:8](../src/instruments/piano.css#L8) | In donkere modus zijn de labels op witte toetsen onzichtbaar: `.k-lbl` gebruikt `--ink`, dat licht wordt, op witte toetsen ([desktop-dark.png](ux/desktop-dark.png): alleen D, F en A zijn zichtbaar). |
| midden | "Waar kun je naartoe" + netwerk | Dezelfde informatie staat twee keer op het scherm (een lijst en een netwerk), wat ongeveer 1000 px kost. |
| midden | header | Vijf instellingen staan prominent bovenaan. De meeste zet je één keer en daarna nooit meer, terwijl ze het eerste scherm vullen. |
| midden | kwintencirkel ([desktop-fold.png](ux/desktop-fold.png)) | Onder de cirkel blijft veel lege ruimte omdat het rechterpaneel langer is. Uitleg staat altijd zichtbaar onder elk paneel. |
| midden | schema | Met één akkoord ziet het schema er leeg en onaf uit. Er is geen lege toestand die uitlegt wat je moet doen. "Wis" werkt zonder bevestiging of ongedaan maken. |
| laag | thema | De CSS ondersteunt `data-theme`, maar er is geen schakelaar om het thema te kiezen. |
| laag | `index.html` | `theme-color`, `description`, favicon en `apple-touch-icon` ontbreken. |
| laag | bundel | Er is één chunk van 1,2 MB omdat de samples in de JS zitten. Het eerste scherm wacht dus op het geluid. |

## Voorstellen
1. **App-structuur met drie werkplekken**, als tabs bovenaan op desktop en als tabbalk onderaan op mobiel:
   - **Verkennen**: cirkel, modusladder en modale kaart.
   - **Akkoorden**: akkoordenrij en volgende stappen. Het netwerk wordt hier een schakelaar "lijst / netwerk" in plaats van een tweede blok.
   - **Spelen**: schema, loop en instrument samen op één scherm.
2. **Vaste "now playing"-balk** onderaan, altijd zichtbaar: huidige toonladder en akkoord, ▶/■, tempo en het volgende akkoord. Zo zijn klikken en horen overal binnen bereik.
3. **Instrument koppelen aan de loop**: in Spelen staat het instrument meteen onder het schema, met een groot huidig akkoord. Op een telefoon in landschapsmodus vult het klavier of de gitaarhals de breedte.
4. **Instellingen in een paneel** (⚙ opent een sheet of drawer): taal, nootnamen, geluid, blue note, thema en klank. In de werkplek blijft alleen de schakelaar drieklanken/vierklanken staan.
5. **Uitleg inklapbaar** met een ⓘ-knop per paneel, plus een korte rondleiding bij het eerste bezoek (3 stappen: cirkel → akkoord → speel mee).
6. **Mobiel**: knoppen minimaal 44 px en akkoorden als grote kaarten in een horizontale scrollrij. Het netwerk wordt op een smal scherm vervangen door de lijst. Het klavier toont 1 octaaf op een telefoon en 2 vanaf 600 px. Labels krijgen minimaal 12 px.
7. **Lege toestanden en feedback**: in een leeg schema een uitnodiging "Klik akkoorden om een progressie te bouwen", of een preset kiezen (zie het analistenrapport). Een toast met "Ongedaan maken" na Wis of Verwijder. Een korte puls op een akkoord als het klinkt.
8. **Kleine fixes**: `.k-lbl` op witte toetsen een vaste donkere kleur geven, een themaschakelaar, en de witruimte onder de cirkel gebruiken (de cirkel sticky op desktop).

## PWA-plan
| Stap | Wat | Werk |
| --- | --- | --- |
| 1 | `vite-plugin-pwa` (Workbox, `registerType: 'prompt'`). Manifest: `name` "Scale Explorer", `short_name` "Scales", `display: standalone`, `start_url: './'`, `scope: './'` (past bij `base: './'` op GitHub Pages), `theme_color` en `background_color` uit de tokens, en `orientation: any` | S |
| 2 | Iconen: 192, 512 en maskable 512 (bijvoorbeeld de boog op de kwintencirkel), `apple-touch-icon` 180 en favicon SVG, plus `theme-color` voor licht en donker in `index.html` | S |
| 3 | Fonts lokaal hosten (`@fontsource/bodoni-moda` en `@fontsource/ibm-plex-*`) in plaats van Google Fonts. Dat is nodig voor offline gebruik en beter voor privacy | S |
| 4 | Samples uit de JS-bundel halen: als `.mp3` in `public/samples/`, precachen (~1 MB) en lazy laden. Het eerste scherm wordt dan direct getoond en het geluid wordt in de achtergrond geladen | M |
| 5 | Updateflow: een toast "Nieuwe versie beschikbaar, herladen" via `useRegisterSW`, nooit stilzwijgend tijdens een loop | S |
| 6 | iOS: de AudioContext pas starten bij de eerste tik (gebeurt al) en opnieuw `resume()` na `visibilitychange`. Verder `viewport-fit=cover` (staat er al) met `env(safe-area-inset-*)` voor de tabbalk en `apple-mobile-web-app-status-bar-style` | S |
| 7 | De loop in de achtergrond ondersteunen: `navigator.wakeLock` tijdens de loop (scherm blijft aan) en Media Session-knoppen (▶/■ op het lockscreen) | M |
| 8 | Een installatieknop (`beforeinstallprompt`) in het instellingenpaneel, en op iOS een korte uitleg "Deel → Zet op beginscherm" | S |
| 9 | Lighthouse in CI (`@lhci/cli`) met als doel PWA geslaagd en scores ≥ 90 voor Performance en Accessibility | S |

Branch-aandachtspunt: de deploy luistert naar `main` (zie [analysis.md](analysis.md)).

## Aanbevolen volgorde (top 5)
1. Snelle fixes: labels in donkere modus, knoppen van 44 px, `theme-color` en favicon (S).
2. PWA-basis, stappen 1–3 en 5: installeerbaar, offline en met lokale fonts (S–M).
3. App-structuur met werkplekken en de vaste "now playing"-balk (L). Dit is de grootste winst voor gebruiksgemak.
4. Mobiele weergave: lijst in plaats van netwerk, 1 octaaf en landschapsmodus voor het instrument (M).
5. Samples als aparte bestanden met lazy laden, plus wake lock en Media Session (M).
