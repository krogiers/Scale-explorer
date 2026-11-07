# UI/UX-analyse Scale Explorer

_UX designer, 2026-11-08. Vervangt de versie van 2026-11-02. Screenshots: [docs/ux/](ux/), gemaakt op 1440, 768 en 390 px, in licht en donker, plus details (`desktop-playing`, `phone-*`, `desktop-dark-*`). Bouwt verder op [indeling-analyse.md](indeling-analyse.md), [schermen-analyse.md](schermen-analyse.md) en [modi-analyse.md](modi-analyse.md)._

## Samenvatting
De app is inhoudelijk sterk gegroeid. Er kwamen pentatonisch, tien klanken, vier blazers, vier ritmestijlen met drums, jazzsequenties en verslepen bij. Elke uitbreiding kreeg haar eigen plek op dezelfde lange pagina.

| | 2 nov | nu |
| --- | --- | --- |
| Hoogte desktop (1440 × 900) | 3846 px, 4,3 schermen | **5300 px, 5,9 schermen** |
| Hoogte telefoon (390 × 844) | 5311 px | **9043 px, 10,7 schermen** |

Het grootste nieuwe blok is **Jazzsequenties**: 1417 px op desktop en 3479 px op een telefoon. Het staat tussen het netwerk en het schema. Daardoor begint het schema nu op y = 3763 en het instrument op y = 4281.

De visuele stijl is nog altijd verzorgd en consistent. De donkere modus werkt, en het probleem van vorige keer met de klavierlabels is opgelost. Het kernprobleem blijft wel: **de app gedraagt zich als een naslagdocument, niet als een oefeninstrument**. De schermindeling uit [schermen-analyse.md](schermen-analyse.md) is daarom urgenter dan ooit. Daarnaast zijn er een paar snelle fixes.

## Wat werkt
- **Een consistente identiteit.** De kleurtokens, Bodoni met Plex en de kleurcode (groen = diatonisch, paars = leen of kenmerkend, goud = keuze of spil) lopen nu ook door in de sequenties, de schemacellen en de blazerskaarten ([desktop-light.png](ux/desktop-light.png)).
- **De donkere modus is in orde.** De klavierlabels zijn nu leesbaar ([desktop-dark-instrument.png](ux/desktop-dark-instrument.png), [piano.css:8](../src/instruments/piano.css#L8)), en de gewone tekst haalt overal AA. Uitzondering is goud op lichtgoud (zie Problemen #11).
- **De greepkaarten** van sax, trompet, klarinet en fluit hebben één vormtaal. De transpositie wordt duidelijk vermeld ("Geschreven: E Dorisch … klinkt als D Dorisch").
- **Het schema** toont tijdens de loop goed wat er speelt: de cel kleurt goud ([desktop-playing.png](ux/desktop-playing.png)). Verslepen geeft duidelijke feedback: het akkoord wordt half doorzichtig en een lijn toont de nieuwe plaats. Er is ook een variant voor toetsenbord en voor touch.
- **Er speelt altijd maar één ding.** De loopknop springt terug wanneer iets anders begint.
- Er is **geen horizontale scroll** op 1440, 768 en 390 px, en er zijn **geen consolefouten**.
- `aria-live` op "nu speelt", `aria-pressed` op de segmentknoppen, `prefers-reduced-motion` en een zichtbare focusring.

## Problemen
| # | Ernst | Waar | Probleem |
| --- | --- | --- | --- |
| 1 | hoog | hele pagina ([desktop-light.png](ux/desktop-light.png), [phone-light.png](ux/phone-light.png)) | **De pagina is te lang en heeft geen hoofdtaak**: 5,9 schermen op desktop en 10,7 op een telefoon. Er zijn acht panelen zonder navigatie, en elk nieuw onderdeel komt er gewoon onder. |
| 2 | hoog | Jazzsequenties | **Het grootste blok staat op de verkeerde plek.** Het zijn tien kaarten met alle akkoorden uitgeschreven: 1417 px op desktop en 3479 px op een telefoon. Ze staan tussen de keuze van een akkoord en het schema waar die keuze terechtkomt. Het blues- en het rhythm-kaartje zijn 3 à 4 keer zo hoog als de rest, waardoor het raster ongelijk wordt. |
| 3 | hoog | Meespelen ([desktop-playing.png](ux/desktop-playing.png)) | **Tijdens de loop zie je nooit tegelijk** het huidige akkoord, de toonladder en je instrument. Op desktop staat het instrument 263 px onder de loopknop, en het "nu"-blok en het klavier van 470 px passen samen niet in 900 px. Op een telefoon staat het instrument op y = 8174. |
| 4 | hoog | telefoon ([phone-network.png](ux/phone-network.png), [phone-chart.png](ux/phone-chart.png)) | **De bediening is te klein voor touch**: 157 van de 171 bedieningselementen zijn kleiner dan 44 px. De SVG-tekst wordt onleesbaar klein: netwerklabels zijn 4,8 à 5,9 px, klavierlabels 6,1 à 6,9 px en de akkoorden in de cirkel 9,6 px. |
| 5 | hoog | [Sequences.tsx:68-70](../src/screens/akkoorden/Sequences.tsx#L68-L70) ([desktop-dark-seq.png](ux/desktop-dark-seq.png)) | **De knoppen ▶ Speel, ＋ Invoegen en Vervang schema hebben geen stijl.** Ze tonen de grijze standaardknop van de browser. In donkere modus zijn het lichtgrijze blokken die niet bij de rest passen. |
| 6 | midden | header ([phone-fold.png](ux/phone-fold.png)) | **Instellingen vullen het eerste scherm**: 6 groepen, op een telefoon ongeveer 330 px voor de cirkel begint. Blue note en pentatonisch zijn weergave-opties die bij de notenrij horen, niet bij de app-instellingen. |
| 7 | midden | Akkoorden en Netwerk | **Dezelfde stappen staan er twee keer**, als lijst en als netwerk (samen ±1300 px). Het netwerk is op een telefoon niet leesbaar (#4). |
| 8 | midden | [nl.ts:42](../src/i18n/nl.ts#L42), [phone-chart.png](ux/phone-chart.png) | **De uitleg staat altijd open en wordt lang.** De helptekst van het schema is 8 regels op een telefoon. Meespelen heeft er twee (de lege toestand en loopHelp), en elk paneel heeft een vaste alinea. |
| 9 | midden | [chart.css](../src/screens/akkoorden/chart/chart.css) | **Je ziet niet dat je kunt slepen**: er is geen grip en geen `cursor: grab`, het staat alleen in de helptekst. Een schema met één akkoord (de begintoestand) verwijst niet naar de sequenties of naar "klik een akkoord". |
| 10 | midden | Speel toonladder, Speel progressie en ▶ Speel | **Afspelen heeft geen toestand.** Alleen de loop heeft ■. De andere knoppen tonen niet dat ze spelen, en je kunt ze niet stoppen, behalve door iets anders te starten. |
| 11 | midden | [base.css:6](../src/styles/base.css#L6) | **Het contrast van de randen is te laag.** `--line` op `--surface` haalt maar 1,36:1, terwijl randen van invoervelden, segmenten en kaarten 3:1 nodig hebben (WCAG 1.4.11). Daarnaast staat goud op `--brass-soft` op 3,79:1 voor kleine tekst ("nu" in de modusladder, de toonsoortlabels van 10 px in het schema). |
| 12 | midden | Op het instrument ([desktop-dark-instrument.png](ux/desktop-dark-instrument.png)) | **Instrument en klank staan los van elkaar.** De weergave (Trompet) kies je bij het instrument, de klank (Trompet) bij Meespelen. Twee keer "instrument" verwart. De kop "Op het instrument" staat op de onderrand van de keuzelijst, niet ernaast. |
| 13 | laag | tablet ([tablet-fold.png](ux/tablet-fold.png)) | Op 768 px staat alles in één kolom en vult de cirkel 563 px. Twee kolommen passen hier. |
| 14 | laag | `index.html` | `theme-color`, `description`, favicon en `apple-touch-icon` ontbreken. De fonts komen van Google. |
| 15 | laag | bundel | `index.js` is 1,26 MB, omdat de basisopnames (piano, Rhodes, bas) in de hoofdbundel zitten. De eerste weergave wacht dus op het geluid. De extra klanken laden al apart. |
| 16 | laag | thema | De CSS ondersteunt `data-theme`, maar er is nog altijd geen schakelaar. |

## Voorstellen

**A · Drie schermen met een dock** (lost #1, #3 en #7 op). Dit is de uitwerking uit [schermen-analyse.md](schermen-analyse.md), met de nieuwe onderdelen op hun plaats:
```
┌ Scale Explorer   [1 Ladder] [2 Akkoorden] [3 Spelen]        D Dorisch · Dm · ▶   ⚙ ┐
│ Ladder:    cirkel │ D Dorisch, notenrij [blue][penta] ▶ │ modusladder              │
│ Akkoorden: akkoordenrij │ [Lijst|Netwerk|Modi & bruggen|Sequenties] │ schema (rechts) │
│ Spelen:    transport · schema als strook · NU Dm → G (groot) · instrument (groot)    │
└ dock: ▶/■ · 90 BPM · Swing · nu Dm → G · instrument uitklappen ─────────────────────┘
```
Op een telefoon worden de tabs een tabbalk onderaan, met `safe-area-inset-bottom`. De verplichte eerste stap is de loop naar de store te verhuizen.

**B · Sequenties compact** (#2, #9). Elke sequentie wordt één rij: mini-cirkel, naam, trapnummers (*ii7 – V7 – Imaj7*) en de knoppen ▶ en ＋. Met ▸ klap je de akkoorden met hun modi uit. Zo krimpt het blok van 1417 naar ongeveer 450 px. Als vierde weergave naast Lijst, Netwerk en Modi & bruggen past het op het scherm Akkoorden. Een schema met één akkoord toont "Start met een sequentie →".

**C · Eén afspeelknop voor alles** (#10). Een gedeelde `PlayButton` die zich abonneert op `audio/transport` en ▶ of ■ toont. "Speel toonladder", "Speel progressie" en de ▶ bij een sequentie tonen dan ook dat ze spelen, en je kunt ze stoppen. Op Spelen komt een groot "NU Dm → daarna G7", met de noten om te spelen (penta of blue gemarkeerd).

**D · Schema** (#8, #9).
- Een grip (⠿) op elke cel bij hover, met `cursor: grab`. Op touch een korte trilling (`navigator.vibrate(10)`) als het akkoord opgetild wordt.
- De uitleg achter een ⓘ.
- Na Wis of Verwijder een toast "Ongedaan maken".

**E · Instellingen achter ⚙** (#6, #16). Een sheet met taal, nootnamen, geluid, thema (Auto, Licht, Donker) en "Installeer app". Blue note en pentatonisch worden chips bij de notenrij. Drieklanken of vierklanken blijft bij de akkoordenrij.

**F · Mobiel** (#4, #13).
- Met `@media (pointer: coarse)`: `.seg button`, `.ghost`, `.tgt` en de schemacellen minstens 44 px hoog.
- Onder 600 px vervangt de lijst het netwerk.
- Het klavier toont 1 octaaf in staande en 2 octaven in liggende stand ([phone-landscape-instrument.png](ux/phone-landscape-instrument.png) laat zien dat 2 octaven liggend goed werken).
- SVG-labels krijgen een minimum, door de viewBox te verkleinen in plaats van te schalen.
- Vanaf 700 px twee kolommen.

**G · Tokens** (#11). Een nieuwe `--line-strong` (licht `#8C95A5`, ongeveer 3:1) voor de randen van invoervelden, segmenten en cellen. `--line` blijft voor decoratieve scheidingen. Voor tekst op `--brass-soft` komt `--brass-ink` (licht `#7A520E`, ≥ 4,5:1).

**H · Klank volgt het instrument** (#12). Een vinkje "klank volgt instrument": kies je Trompet, dan speelt de trompetklank. Het instrumentpaneel krijgt een kop met de titel en de keuzelijst op één lijn, met de stemming ernaast.

**I · De sequentieknoppen stylen** (#5): `className="ghost"` op de drie knoppen, en een extra stijl `.ghost.play` voor ▶.

## PWA-plan
| Stap | Wat | Werk |
| --- | --- | --- |
| 1 | `vite-plugin-pwa` (Workbox, `registerType: 'prompt'`). Manifest: `name` "Scale Explorer", `short_name` "Scales", `display: standalone`, `start_url` en `scope` `'./'` (past bij `base: './'` op GitHub Pages), `theme_color` en `background_color` uit `--bg`/`--ink`, `orientation: any` | S |
| 2 | Iconen: 192, 512 en een maskable 512 (de goudboog op de kwintencirkel), `apple-touch-icon` 180 en een SVG-favicon, plus `theme-color` voor licht en donker in `index.html` | S |
| 3 | Fonts lokaal hosten met `@fontsource/bodoni-moda`, `@fontsource/ibm-plex-sans` en `ibm-plex-mono` in plaats van Google Fonts. Nodig voor offline gebruik en beter voor privacy | S |
| 4 | Opnames: de app-shell en `samples/base` (±1 MB) precachen. De 7 extra klanken (elk ±340 KB, aparte chunks) niet precachen, maar met `CacheFirst` cachen bij het eerste gebruik. Het beste is `base` ook als lazy chunk te laden, zodat de eerste weergave niet op het geluid wacht (#15) | M |
| 5 | Updateflow: een toast "Nieuwe versie, herladen" via `useRegisterSW`, nooit terwijl er iets speelt (`audio/transport`) | S |
| 6 | iOS: `resume()` van de AudioContext bij `touchend` en bij `visibilitychange`, `apple-mobile-web-app-capable`, `env(safe-area-inset-*)` voor het dock en de tabbalk | S |
| 7 | Tijdens de loop: `navigator.wakeLock` (het scherm blijft aan), en Media Session met ▶/■ en het huidige akkoord als titel op het lockscreen | M |
| 8 | Installatieknop (`beforeinstallprompt`) in ⚙, en op iOS een korte uitleg "Deel → Zet op beginscherm" | S |
| 9 | Lighthouse CI (`@lhci/cli`) in `pages.yml`: PWA geslaagd en ≥ 90 voor Performance en Accessibility | S |

## Aanbevolen volgorde (top 5)
1. **Snelle fixes (S, ½ dag).** Sequentieknoppen stylen (I), `--line-strong` en `--brass-ink` (G), knoppen van 44 px op touch (F, deel), een grip en een lege toestand voor het schema (D), en `theme-color` en favicon.
2. **Sequenties compact (S–M)** (B), als vierde weergave bij "volgende stap". Dat haalt 1000 px van desktop en ruim 2500 px van een telefoon.
3. **Eén afspeelknop (M)** (C), de basis voor het dock en de "nu"-weergave.
4. **Drie schermen met een dock (L, ±2 dagen)** (A), met instellingen achter ⚙ (E). De grootste winst voor oefenen en voor de telefoon.
5. **PWA-basis (S–M)**: stappen 1–3 en 5, daarna 4 en 7.
