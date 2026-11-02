# Analyse Scale Explorer

_Senior analyst, 2026-11-02. Tests: 26/26 groen. Typecheck: geen fouten._

## Samenvatting
De architectuur is degelijk: een pure theoriekern, verwisselbare onderdelen met een registry en een planner die vooruit plant op de klok van de geluidskaart. De grootste zwakte is muzikaal. Elk akkoord moet diatonisch zijn in één van de 84 modi, en dat sluit de meeste standards uit (dim7, V7 in mineur, alterations). De begeleiding heeft ook twee hoorbare fouten.

## Bugs
_Status 2026-11-02: pakket 1 is opgelost (alle bugs behalve de sax, plus de dode i18n-sleutels en de labels in donkere modus). De sax volgt in pakket 2._

| Ernst | Waar | Probleem |
| --- | --- | --- |
| hoog | [loop.ts:50](../src/audio/loop.ts#L50) | De bas speelt op tel 3 altijd een reine kwint (`bass + 7`). Bij m7♭5, ° en + klinkt dat vals: bij Bm7♭5 in C speelt de bas F♯ in plaats van F. |
| midden | [loop.ts:49-53](../src/audio/loop.ts#L49-L53) | In de ritmische stijl hoor je een akkoord van 1 tel nooit (alleen de bas). Het patroon telt bovendien vanaf het begin van het akkoord en niet vanaf de maat: na een akkoord van 3 tellen in 4/4 valt de stoot op de 1. |
| midden | [Sax.tsx:9-22](../src/instruments/Sax.tsx#L9-L22) | De grepen staan in concert pitch. Een altsax (E♭) of tenorsax (B♭) leest getransponeerd, dus elke greep is fout voor een echte saxofonist. |
| midden | [audio/index.ts:238](../src/audio/index.ts#L238) | "Speel progressie" speelt altijd aan 0,3 s per tel (200 BPM) en negeert de tempo-schuif. |
| laag | [store.tsx:53](../src/state/store.tsx#L53) | `loadChart` controleert alleen of de waarden gehele getallen zijn, niet hun bereik. Met `mode: 9` in localStorage crasht de app bij het opstarten (`MODE_OFFSET[9]`). `beats` wordt ook niet begrensd. |
| laag | [Loop.tsx:13](../src/views/Loop.tsx#L13) | `bpm` uit localStorage wordt niet gevalideerd. Bij NaN valt de loop stil zonder foutmelding. |
| laag | [store.tsx:152-156](../src/state/store.tsx#L152-L156) | `dispatch` rekent de volgende toestand uit met de `state` van de laatste render. Twee dispatches in dezelfde tick spelen daardoor het verkeerde akkoord. |
| laag | [theory.ts:160-163](../src/core/theory.ts#L160-L163) | De blue note van G♭ wordt D𝄫 en die van D♭ wordt A𝄫. Dat is formeel juist, maar lezers verwachten C of G. |

## Tekorten
- **Akkoordmodel**: `PathEntry` verwijst altijd naar (grondtoon, modus, trap). Secundaire dominanten, dim7, sus, 9/11/13, tritonussubstitutie en alterations zijn niet mogelijk. `dim7`, `aug` en `mM7` staan wel in `QUALITY`, maar worden nooit gemaakt.
- **Grootte is globaal**: `state.size` geldt voor het hele schema ([store.tsx:162](../src/state/store.tsx#L162)). Drieklanken en vierklanken mengen kan dus niet.
- **Ligging**: `voicing()` ([audio/index.ts:204](../src/audio/index.ts#L204)) speelt altijd in grondligging en sluit niet aan op het vorige akkoord. Bij snelle wissels klinkt dat springerig.
- **Schema bewerken**: na `focusPath` voegt een klik het akkoord achteraan toe en niet na het geselecteerde akkoord. Invoegen, vervangen, verplaatsen en ongedaan maken ontbreken. Boven de 64 akkoorden verdwijnen de oudste zonder melding ([store.tsx:82](../src/state/store.tsx#L82)).
- **Achtergrondtabblad**: `setInterval` wordt daar tot 1 s vertraagd, waardoor de loop hapert ([loop.ts:79](../src/audio/loop.ts#L79)).
- **Deploy**: de workflow luistert naar `main`, maar de standaardbranch op GitHub is `master`, en `origin/master` heeft een nieuwere `pages.yml` (Node 22, v5-acties) die lokaal ontbreekt. Kies één branch.
- **Dode i18n-sleutels**: `pathTitle`, `pathHelp` en `beatsPerChord` worden nergens gebruikt.
- **Tests ontbreken** voor: Nederlandse nootnamen (dubbele verlagingen), `voicing`, saxgrepen, `removeAt`/`focus`-randgevallen en de validatie van localStorage.

## Sterke punten
- De theorie volgt uit één model (boog op de kwintencirkel), met een sterke README die het wiskundig uitlegt.
- Spilakkoorden en leenakkoorden worden telkens verklaard met de "nieuwe noot". Dat is didactisch sterk en zie je zelden.
- De modale kaart en de modusladder maken "één noot verschil" zichtbaar.
- De planner met lookahead (in de stijl van Chris Wilson) houdt de timing strak, en de humanize-variatie klinkt natuurlijk.
- De build is één statisch bestand met ingebakken samples en werkt offline.
- TypeScript dwingt af dat elke taal alle sleutels heeft.

## Muzikale uitbreidingen
| Uitbreiding | Waar | Datavorm | Werk |
| --- | --- | --- | --- |
| **Standards en progressies als presets**: ii–V–I, 12-bar blues (I7 IV7 V7 via Mixolydisch), jazzblues, I–vi–ii–V, rhythm changes (A-deel), modale vamps (So What- of Impressions-vorm: 16 maten Dorisch, 8 maten een halve toon hoger), 50s-progressie, Andalusische cadens | nieuw `src/presets/` met een registry | `{id, meter, items: {offset, mode, degree, beats}[]}` relatief aan een gekozen toonsoort | S |
| **Mineur-familie**: harmonisch en melodisch mineur, met hun 7 rotaties (Frygisch dominant, alt, Lydisch dominant…). Dat ontsluit V7 in mineur, dim7 en mM7 en maakt Autumn Leaves en minor ii–V correct | `core/theory.ts` (pattern per familie), `navigation.ts` (afstand = aantal verschillende toonklassen) | `Scale.family`, `ModeIndex` per familie | L |
| **Overlayladders**: pentatonisch, blues, bebop (8 noten), symmetrisch verminderd en heletoon. Net als de blue note getoond als laag op het instrument, niet als modus | `core/` + `InstrumentView.overlay` | `{id, intervals[]}` | M |
| **Licks en patronen**: arpeggio 1-3-5-7, Coltrane 1-2-3-5, bebop-omspeling (enclosure), guidetone-lijn 3→7 over ii–V–I, blueslick met ♭3→3 en ♭5 | nieuw `src/licks/` + een melodiepartij in `loop.ts` | `{id, quality[], steps: {degree: '♭3', beat}[]}`, relatief aan het akkoord en dus transponeerbaar | M–L |
| **Betere begeleiding**: stemvoering (guide tones, rootless A/B-liggingen, drop-2), walking bass met chromatische naderingsnoten, bossa- en wals-patronen | `audio/index.ts` `voicing`, `loop.ts` `planBeat` | `LoopStyle` uitbreiden | M |
| **Oortraining**: welke modus is deze vamp? Welke trap is dit akkoord? Herken de kenmerkende noot of het interval. Scores bijhouden | nieuwe view + i18n | `{question, options, answer}` gegenereerd uit de theorie | M |
| **Transpositie voor sax en trompet**: E♭/B♭-keuze | `InstrumentView.transpose` | getal in halve tonen | S |

Let op auteursrecht: akkoordenschema's en korte idiomatische patronen zijn veilig. Melodieën van standards neem je niet op.

## Aanbevolen volgorde (top 5)
1. De begeleiding repareren: de kwint volgt het akkoord, een akkoord van 1 tel klinkt ook, en het patroon telt vanaf de maat (S).
2. Saxtranspositie en de tempo-bug bij "Speel progressie" oplossen, plus de localStorage-validatie (S).
3. Presets voor standards en progressies met de bestaande modi (S–M). Dat geeft direct veel muzikale waarde.
4. Stemvoering en guide tones in `voicing` (M).
5. De familie harmonisch en melodisch mineur (L). Dat is de basis voor echte jazzstandards, licks op V7alt en dim7.
