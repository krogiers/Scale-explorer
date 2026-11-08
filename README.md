# Scale Explorer

Een webtool om muziektheorie te leren door te navigeren tussen modi, toonladders en akkoorden.
Kies een grondtoon en een modus, klik op een akkoord en zie (en hoor) waar je naartoe kunt.

## Starten

Je hebt [Node.js](https://nodejs.org) 20 of nieuwer nodig.

```bash
npm install      # eenmalig: afhankelijkheden installeren
npm run dev      # ontwikkelserver op http://localhost:5173
npm test         # tests van de theoriekern en de navigatie
npm run build    # productieversie in de map dist/
```

## Opbouw

De app bestaat uit kleine pakketjes. Elk pakket is een map met een voordeur (`index.ts`). Van buitenaf importeer je alleen via die voordeur. Een pakket gebruikt alleen de pakketten die eronder liggen:

```
core  ←  i18n, naming, audio, instruments  ←  state  ←  ui  ←  screens/*  ←  App
```

De app heeft drie schermen: **Ladder** (waar ben ik? met de noten op je instrument), **Akkoorden** (welke akkoorden en waarheen, met het schema) en **Spelen** (de loop, het schema als strook en een groot instrument). De schermen importeren elkaar niet. `App.tsx` zet ze samen met:
- een bovenbalk met de tabs, de huidige ladder en het huidige akkoord, en ⚙ voor de instellingen;
- de navigatie via `#ladder`, `#akkoorden` en `#spelen`, zodat terug en vooruit in de browser werken, met de sneltoetsen 1, 2 en 3;
- een pilletje in de bovenbalk (■ en het akkoord dat speelt) als de loop speelt terwijl je op een ander scherm bent.

De loop zit in de gedeelde toestand (`state/loop.tsx`) en blijft lopen als je van scherm wisselt. De test `src/architecture.test.ts` bewaakt deze regels.

| Map | Wat erin zit | Iets toevoegen |
| --- | --- | --- |
| `src/core/` | Theoriekern, zonder React, namen of taal. Rekent alleen met toonklassen 0 tot 11. `pitch` (noten), `scale` (modi, spelling), `chords` (akkoorden, trapnummers, functies), `colour` (blue note, pentatonisch), `navigation` (volgende stappen) en `sequences` (jazzsequenties). | Nieuwe toonladderfamilies (harmonisch en melodisch mineur) |
| `src/naming/` | Interface `NoteNamer`: Engels, do re mi, Nederlands | Eén object aan `NOTE_NAMERS` toevoegen |
| `src/i18n/` | Interfacetaal: één woordenboek per taal (`nl.ts`, `en.ts`). TypeScript controleert dat elke taal alle sleutels heeft. | Een bestand `fr.ts` maken en in `index.ts` registreren |
| `src/audio/` | Interface `AudioEngine` (`types.ts`). `engine/` is de motor: opnames (`sampler`), klankinstellingen (`voices`), `synth` en `drums`. `loop/` is de meespeelloop: `plan` (wat er per tel klinkt), `grooves` (ritmepatronen), `tones` (bastonen) en `player` (de klok). `events` bepaalt wat een akkoord, ladder of progressie speelt, `voicing` de stemvoering. De opnames staan in `samples/`. | Een klank: een bestand in `samples/` en een regel in `voices.ts`. Een groove: een patroon in `grooves.ts` |
| `src/instruments/` | Interface `InstrumentView` (`types.ts`) en het register (`index.ts`). Klavier, gitaar, en in `wind/` de blazers (sax, trompet, klarinet, dwarsfluit) met gedeelde greepkaarten. | Een component schrijven en in `INSTRUMENTS` zetten |
| `src/state/` | `model` (toestand en acties), `reducer` (pure overgangen, ongedaan maken, klank volgt instrument), `persist` (bewaren in de browser), `store` (provider, speelt het geluid bij een klik, `usePlaying`) en `loop` (de gedeelde meespeelloop) | Een actie in `model.ts` en een geval in `reducer.ts` |
| `src/ui/` | Gedeelde onderdelen voor de schermen: `Legend`, `Heading` (paneelkop met de uitleg achter ⓘ), `PlayButton` (▶ of ■ per naam), `Toast` (melding met Ongedaan maken), `chartLayout` (maten) en opmaak van teksten | |
| `src/screens/` | Eén map per scherm, elk met zijn eigen componenten en CSS. `ladder/` (kwintencirkel, modus met de chips blue note en pentatonisch, modusladder, modale kaart), `akkoorden/` (akkoordenrij, volgende stap als Lijst, Netwerk of Sequenties, `chart/` het schema), `spelen/` (meespeelloop, schema als strook en het instrument, dat App ook op Ladder toont), `settings/` (dialoog met taal, nootnamen, geluid en thema) | Een paneel in de map van zijn scherm, en exporteren via `index.ts` |
| `src/styles/` | `base.css` (kleuren, layout, knoppen), `overlays.css` (blue note, pentatonisch) en `index.css`, dat alle CSS in een vaste volgorde laadt | |

Taal en nootnamen staan los van elkaar: de interface kan in het Nederlands staan met do re mi, of in het Engels met Nederlandse nootnamen.

## Het wiskundig model

De hele theorie in de app volgt uit een paar eenvoudige rekenregels. Ze staan in `src/core/` (`scale.ts`, `chords.ts`, `navigation.ts`). Hieronder stap voor stap, telkens met een voorbeeld.

### 1. Noten als getallen modulo 12

Een octaaf heeft 12 halve tonen. Omdat C en de C een octaaf hoger voor de harmonie dezelfde functie hebben, rekenen we met **toonklassen**: de getallen 0 tot en met 11.

```
C=0  C♯/D♭=1  D=2  D♯/E♭=3  E=4  F=5  F♯/G♭=6  G=7  G♯/A♭=8  A=9  A♯/B♭=10  B=11
```

Alles wordt gerekend **modulo 12** (`mod12` in de code): na 11 komt weer 0. Transponeren is dan gewoon optellen. Een kwint is 7 halve tonen, dus de kwint boven A (9) is 9 + 7 = 16 ≡ 4, de E.

Een interval is een verschil: van D (2) naar B♭ (10) is 10 − 2 = 8 halve tonen, een kleine sext.

### 2. Toonladders en modi als rotaties

De majeurladder is de verzameling stappen vanaf de grondtoon:

```
M = [0, 2, 4, 5, 7, 9, 11]      (hele, hele, halve, hele, hele, hele, halve toon)
```

Een **modus** is dezelfde ladder vanaf een andere trap. Begint een modus op trap o van de majeurladder, dan zijn zijn intervallen:

```
interval_i = (M[(o + i) mod 7] − M[o]) mod 12      voor i = 0 … 6
```

Voorbeeld, Dorisch (o = 1, begint op de tweede trap):

```
M[1], …, M[6], M[0]+12 = 2, 4, 5, 7, 9, 11, 12   min 2  →  [0, 2, 3, 5, 7, 9, 10]   = 1 2 ♭3 4 5 6 ♭7
```

De noten van een toonladder met grondtoon r zijn dan (r + interval_i) mod 12. D Dorisch: 2 + [0, 2, 3, 5, 7, 9, 10] = D E F G A B C.

De app ordent de modi niet in de klassieke volgorde (Ionisch, Dorisch, …) maar **van helder naar donker**. Die index b loopt van 0 tot 6:

| b | Modus | Begint op trap o | Formule |
| --- | --- | --- | --- |
| 0 | Lydisch | 3 | 1 2 3 ♯4 5 6 7 |
| 1 | Ionisch | 0 | 1 2 3 4 5 6 7 |
| 2 | Mixolydisch | 4 | 1 2 3 4 5 6 ♭7 |
| 3 | Dorisch | 1 | 1 2 ♭3 4 5 6 ♭7 |
| 4 | Aeolisch | 5 | 1 2 ♭3 4 5 ♭6 ♭7 |
| 5 | Frygisch | 2 | 1 ♭2 ♭3 4 5 ♭6 ♭7 |
| 6 | Locrisch | 6 | 1 ♭2 ♭3 4 ♭5 ♭6 ♭7 |

Waarom deze volgorde? Dat volgt uit de kwintencirkel.

### 3. De kwintencirkel: vermenigvuldigen met 7

Zet je de 12 toonklassen in kwinten (C G D A E B F♯ D♭ A♭ E♭ B♭ F), dan is de positie op de cirkel:

```
kwintpositie(pc) = 7 · pc mod 12          en terug:   pc = 7 · positie mod 12
```

Dat werkt in beide richtingen omdat 7 · 7 = 49 ≡ 1 (mod 12): vermenigvuldigen met 7 is zijn eigen omgekeerde. In de code heten deze functies `fifthsIndex` en `pcFromFifths`.

Het belangrijke feit: **de zeven noten van een majeurladder (en dus van elke modus) liggen naast elkaar op de kwintencirkel**. C majeur is F C G D A E B, zeven opeenvolgende posities (11, 0, 1, 2, 3, 4, 5). Op die boog liggen de modi precies in de volgorde van helder naar donker:

```
positie op de boog:   0     1     2     3     4     5     6
noot (C majeur):      F     C     G     D     A     E     B
modus vanaf die noot: Lyd   Ion   Mix   Dor   Aeo   Fry   Loc
```

Staat de grondtoon r op kwintpositie f(r) en is de modus b, dan begint de boog dus op

```
start = f(r) − b        en loopt tot f(r) − b + 6
```

Dat is precies wat de gekleurde boog in de kwintencirkel van de app tekent.

**Gevolgen die de app gebruikt:**

- **Relatieve modi** (zelfde noten, ander middelpunt) zijn andere noten op dezelfde boog. Klik je in de binnenring op de positie j, dan wordt de nieuwe grondtoon pcFromFifths(start + j) en de nieuwe modus b = j.
- **Een kwint transponeren** schuift de boog één positie op. Er valt aan één kant één noot af en er komt er aan de andere kant één bij: **precies één noot verschilt**.
- **Een stap donkerder** (b + 1, zelfde grondtoon) schuift de boog ook één positie, maar de andere kant op. Ook dan verandert precies één noot: de bovenste noot van de boog gaat eruit en een noot een kwint onder het begin komt erbij, wat neerkomt op één noot die een halve toon zakt.
- Twee **parallelle modi** b en b′ op dezelfde grondtoon verschillen daardoor in precies |b − b′| noten. Lydisch en Locrisch verschillen in 6 noten, alleen de grondtoon is gelijk.
- **Voortekens**: elke positie naar rechts op de cirkel voegt een kruis toe, elke positie naar links een mol. Voor een grondtoon met kwintpositie s(r) (getekend: F = −1, B♭ = −2, G = +1) is het aantal voortekens

```
voortekens = s(r) + 1 − b        (positief = kruizen, negatief = mollen)
```

  Voorbeeld: D Dorisch → s(D) = 2, b = 3 → 2 + 1 − 3 = 0, geen voortekens. G Mixolydisch → 1 + 1 − 2 = 0. C Aeolisch → 0 + 1 − 4 = −3, drie mollen.

**De modale kaart** is dit model als raster: kolommen zijn grondtonen in kwintvolgorde, rijen zijn modi van helder naar donker. Elke stap horizontaal of verticaal verandert precies één noot, en vakjes op dezelfde diagonaal hebben dezelfde voortekens en dus dezelfde noten.

### 4. Spelling: de juiste nootnaam kiezen

Getallen alleen zeggen niet of 6 een F♯ of een G♭ is. Daarvoor krijgt elke noot ook een **letter** ℓ (0 = C, 1 = D, …, 6 = B) en een **verhoging** a (−2 … +2). De letters hebben als toonklassen

```
LETTER_PC = [0, 2, 4, 5, 7, 9, 11]
```

De regel van een gewone toonladder: **elke letter komt precies één keer voor**. Kies je voor de grondtoon letter L, dan krijgt trap i letter (L + i) mod 7, en de verhoging is wat nodig is om op de juiste toonklasse te komen:

```
a = (pc − LETTER_PC[ℓ]) mod 12,   teruggebracht naar het bereik −5 … +6
```

Voor een grondtoon zijn er meestal twee kandidaat-letters (bijvoorbeeld F♯ of G♭). De app spelt de ladder met beide en kiest de spelling met de **kleinste som van |a|**. Een dubbele verhoging (𝄪 of 𝄫) krijgt een strafpunt van 10, zodat ze praktisch nooit gekozen wordt. Bij een gelijke stand wint de spelling met mollen: G♭ majeur (6 mollen) boven F♯ majeur (6 kruizen), wat blazers meestal prettiger lezen.

Voorbeeld, toonklasse 1 in Dorisch: als D♭ Dorisch zou je D♭ E♭ F♭ G♭ A♭ B♭ C♭ krijgen (som 7), als C♯ Dorisch C♯ D♯ E F♯ G♯ A♯ B (som 5). De app kiest C♯ Dorisch.

De nootnaam zelf (C♯, Do♯ of Cis) komt pas daarna, in de interface `NoteNamer`. Die krijgt alleen (ℓ, a) en weet niets van theorie.

### 5. Akkoorden: stapelen in tertsen

Een akkoord op trap i neemt elke tweede noot van de toonladder:

```
drieklank:  trappen i, i+2, i+4           (mod 7)
vierklank:  trappen i, i+2, i+4, i+6      (mod 7)
```

De **kwaliteit** volgt uit de afstanden van elke akkoordnoot tot de grondtoon van het akkoord:

| Afstanden (halve tonen) | Kwaliteit | Voorbeeld op C |
| --- | --- | --- |
| 4, 7 | majeur | C |
| 3, 7 | mineur | Cm |
| 3, 6 | verminderd | C° |
| 4, 8 | overmatig | C+ |
| 4, 7, 11 | grote septiem | Cmaj7 |
| 4, 7, 10 | dominant septiem | C7 |
| 3, 7, 10 | mineur septiem | Cm7 |
| 3, 6, 10 | halfverminderd | Cm7♭5 |
| 3, 6, 9 | verminderd septiem | C°7 |

Twee akkoorden zijn "hetzelfde akkoord" als ze dezelfde grondtoon (als toonklasse) en dezelfde kwaliteit hebben. Die sleutel (`key` in de code, bijvoorbeeld `10:maj` voor B♭) wordt gebruikt om akkoorden tussen toonladders te vergelijken, los van de spelling.

**Trapnummers** (I, ii, ♭VII …) worden altijd gemeten ten opzichte van de majeurladder op dezelfde grondtoon:

```
verschuiving = (pc_akkoord − grondtoon) mod 12 − M[i]
```

Is die −1, dan komt er ♭ voor, bij +1 een ♯. Hoofdletter bij majeur en dominant, kleine letter bij mineur en verminderd. In C Mixolydisch staat B♭ op trap 7: (10 − 0) − 11 = −1, dus ♭VII.

**Kenmerkende noot**: per modus is dat de trap die hem van zijn buurmodus onderscheidt: ♯4 (Lydisch), 7 (Ionisch), ♭7 (Mixolydisch), 6 (Dorisch), ♭6 (Aeolisch), ♭2 (Frygisch) en ♭5 (Locrisch). Akkoorden die deze noot bevatten krijgen in de app een paarse stip.

**Functies** (tonica, subdominant, dominant) toont de app alleen in Ionisch en Aeolisch, met de vaste indeling T = trap 1, 3, 6 · S = trap 2, 4 · D = trap 5, 7. In de andere modi zou die indeling misleiden.

### 6. Navigatie: drie soorten stappen

Vanuit het gekozen akkoord A (trap i) berekent `computeTargets` drie lijsten.

**a. Binnen de modus.** Voor elk ander akkoord B op trap j kijken we naar de afstand d = (j − i) mod 7 in trappen:

| d | Beweging van de grondtoon | Sterkte (0 = sterkst) |
| --- | --- | --- |
| 3 | kwartsprong omhoog = kwintval (bv. G → C) | 0 |
| 2 of 5 | terts omhoog of omlaag | 1 |
| 1 of 6 | stap omhoog of omlaag | 2 |
| 4 | kwint omhoog (bv. C → G) | 3 |

Daarnaast telt de app de **gedeelde noten** |A ∩ B|: het aantal toonklassen die beide akkoorden hebben. Akkoorden op een terts afstand delen 2 noten en klinken daardoor vloeiend. De lijst is gesorteerd op sterkte en daarna op gedeelde noten. In het akkoordennetwerk bepaalt de sterkte de dikte van de pijl.

**b. Leenakkoorden.** De app bouwt de akkoorden van alle zes parallelle modi (zelfde grondtoon, andere b′). Een akkoord telt als leenakkoord als zijn sleutel niet in de huidige toonladder zit. Komt hetzelfde akkoord in meerdere modi voor, dan wint de modus die het dichtst bij ligt. De afstand |b − b′| is, zoals in stap 3 bewezen, precies het aantal noten dat verschilt. Sortering: eerst op afstand, dan op gedeelde noten met A. De "nieuwe noot" in de uitleg is de akkoordnoot die niet in de huidige toonladder zit.

Voorbeeld vanuit C Ionisch: B♭ komt uit C Mixolydisch (afstand 1), Fm en A♭ uit C Aeolisch (afstand 3).

**c. Moduleren via een spilakkoord.** De buurtoonladders zijn dezelfde modus een kwint hoger en een kwint lager: grondtoon (r + 7) mod 12 en (r + 5) mod 12. Volgens stap 3 delen ze 6 van de 7 noten met de huidige toonladder. Voor elke buur kijkt de app of A er ook in zit:

- **Ja**: A is een spilakkoord. De doelen zijn de akkoorden van de buur die niet in de huidige toonladder zitten. Dat zijn precies de akkoorden die de nieuwe noot bevatten, en zij maken de modulatie hoorbaar.
- **Nee**: de app toont de akkoorden die in beide toonladders zitten, zodat je eerst naar een spil kunt gaan.

Voorbeeld: Am staat in C Ionisch (vi) en in G Ionisch (ii). Via Am kun je naar D (V in G), dat de nieuwe noot F♯ bevat.

### 7. Van getallen naar instrument en geluid

- **Klavier**: twee octaven; een toets met toonklasse pc licht op als pc in de toonladder zit.
- **Gitaar**: snaar s in standaardstemming heeft losse toonklasse [4, 11, 7, 2, 9, 4] (hoge E tot lage E). Op fret f klinkt (los + f) mod 12.
- **Saxofoon**: de grondtoon wordt in het register D4 tot C♯5 gelegd (MIDI 62 tot 73) en de ladder loopt van daar omhoog. Voor elke noot zoekt de app de greep van (midi mod 12) in een tabel; noten vanaf D5 (MIDI 74) krijgen daarbij de octaafklep.
- **Trompet, klarinet en dwarsfluit**: zelfde idee, met gedeelde greepkaarten (`src/instruments/wind/wind.tsx`). Trompet en klarinet staan in B♭: de app toont de geschreven noten, een grote secunde (2 halve tonen) boven de klinkende. De grondtoon ligt bij beide tussen B♭3 en A4 (MIDI 58 tot 69), de fluit tussen D4 en C♯5. De tabellen gaan per geschreven MIDI-noot en niet per toonklasse, omdat de grepen per register verschillen:
  - trompet: de gewone ventielcombinatie per noot;
  - klarinet: de registerklep geeft een duodecime (19 halve tonen) hoger, dus de greep van B4 is die van E3 met de registerklep erbij. De basisgrepen komen uit de Woodwind Fingering Guide;
  - dwarsfluit: het tweede octaaf gebruikt dezelfde grepen als het eerste (overblazen), behalve D5 en E♭5, waar de linkerwijsvinger open is.
- **Geluid**: een MIDI-noot m heeft frequentie

```
f = 440 · 2^((m − 69) / 12)   Hz          (MIDI 69 = A4 = 440 Hz)
```

  Elke halve toon vermenigvuldigt de frequentie met de twaalfdemachtswortel van 2 (ongeveer 1,0595). Een akkoord wordt gespeeld met de grondtoon een octaaf lager als bas, en daarboven de akkoordtonen oplopend.

### 7b. De blue note

De blue note is de verlaagde kwint van de grondtoon: `blue = (r + 6) mod 12`. Hij wordt gespeld op de letter van de kwint (letter van de grondtoon + 4), dus op D wordt het A♭ en niet G♯, en in B♭ majeur F♭. Zou dat een dubbel voorteken geven, dan wordt hij als ♯4 gespeld: op G♭ wordt het C (niet D𝄫), op D♭ wordt het G. Alleen Locrisch bevat hem al (de ♭5 is zijn kenmerkende noot). Je zet hem aan of uit in de instellingen; dan verschijnt hij gestippeld in de toonladder, in blauw op klavier en gitaar, en in het meespeelvak. Elk akkoord toont ook zijn eigen noten, zodat je weet welke tonen veilig zijn om op te landen.

### 7c. Pentatonisch

De pentatonische ladder houdt vijf trappen van de modus over. De heldere modi (Lydisch, Ionisch, Mixolydisch) geven majeur-pentatonisch, trappen `{1, 2, 3, 5, 6}`. De donkere modi geven mineur-pentatonisch, trappen `{1, ♭3, 4, 5, ♭7}`; in Locrisch wordt dat `1 ♭3 4 ♭5 ♭7`. Op Locrisch na valt telkens de kenmerkende noot weg: daarom past één pentatonische ladder over meerdere buurmodi. Zet je hem aan in de instellingen, dan worden de twee overige noten gedimd (niet verborgen) in de toonladder en op het instrument, en speelt "Speel toonladder" alleen de vijf noten. Mineur-pentatonisch met de blue note erbij is de bluesladder.

### 7d. Jazzsequenties

Een sequentie (`src/core/sequences.ts`) is een lijst van akkoorden, elk gegeven als (iv, modus, maten). Hier is iv het aantal halve tonen boven de tonica. Het akkoord is de eerste trap (vierklank) van die modus op grondtoon tonica + iv:

```
ii7   = I van Dorisch     op tonica + 2
V7    = I van Mixolydisch op tonica + 7
Imaj7 = I van Ionisch     op tonica + 0
♭II7  = I van Mixolydisch op tonica + 1     (tritonussubstitutie)
```

Zo hoort bij elk akkoord meteen de ladder die je erover speelt, en past elke sequentie zonder uitbreiding in het schema (`PathEntry` met trap 0). De tonica is de grondtoon van de huidige ladder. De duur is maten × maatsoort, minstens één tel. `numeralAt` geeft het trapnummer ten opzichte van de tonica (♭II, ♭III, ♭V, ♭VI, ♭VII voor de tussenliggende halve tonen).

Sommige akkoorden vragen een ladder die buiten de zeven modi valt: een V7 naar mineur (harmonisch mineur, alteratie) en een ♭II7 (lydisch dominant). Die zijn gemarkeerd als benadering (`approx`), en de app toont dan Mixolydisch.

Invoegen (`insertPath`) zet de hele reeks in één stap na het geselecteerde akkoord, of vervangt het schema. Eén keer ongedaan maken haalt de hele reeks weer weg.

### 7e. Modi en bruggen

De 84 modi (12 moederladders × 7 modi) vormen een rooster (`src/core/modes.ts`). De rijen zijn de moederladders in kwintvolgorde, de kolommen de modi van helder naar donker.

```
moederladder van (r, m):   k = kwintpositie(r − majeur[OFFSET[m]])
grondtoon van (k, m):      r = toon(k) + majeur[OFFSET[m]]
```

- **Een rij** heeft dezelfde noten (relatief).
- **Een diagonaal** heeft dezelfde grondtoon (parallel): elke stap donkerder is één mol meer, dus één rij lager.
- **Eén rij verder** is precies één noot anders. Het aantal verschillende noten groeit met de kwintafstand tot hoogstens 6.

**Brug** (`bridge(a, b)`): twee buurmodi delen 4 drieklanken of 3 vierklanken. De andere akkoorden van b bevatten de nieuwe noot. Dat is de **sprong**: die akkoorden maken de overgang hoorbaar. Bij een relatieve stap zijn alle akkoorden gedeeld, en alleen het thuis (de tonica) verschuift.

**Route** (`route(a, b)`): één noot per stap, dus zo veel stappen als de kwintafstand tussen de moederladders, plus eventueel een relatieve stap. Per stap kiest de app een brug- en een sprongakkoord:
- de sprong is bij voorkeur het **kenmerkende akkoord** van de nieuwe modus: Lyd II, Ion V, Mix ♭VII, Dor IV, Aeo ♭VI, Fry ♭II, Loc ♭V;
- de brug is het gedeelde akkoord dat er de meeste noten mee gemeen heeft.

**Brugmatrix** (`chordsOnRoot(r)`): op één grondtoon komen 25 drieklanken (31 vierklanken) voor. Elk zit in hoogstens 3 parallelle modi naast elkaar. Een balk over 2 of 3 modi is een brug, een balk over 1 modus is de eigen kleur van die modus.

In de app staat dit op het scherm Ladder, in het paneel "Modi en bruggen". Een klik kiest "naar" en toont de overgang. Pas "Ga naar" verplaatst je echt. "+ in schema" zet de overgang als akkoorden in het schema.

### 8. Uitbreiden

Omdat alles volgt uit "een verzameling toonklassen plus een spelling", passen nieuwe toonladders in hetzelfde model. Harmonisch mineur is bijvoorbeeld het patroon [0, 2, 3, 5, 7, 8, 11], met zijn eigen zeven rotaties. Het enige verschil: die noten liggen niet meer naast elkaar op de kwintencirkel, dus voor die families wordt de afstand tussen toonladders geteld als het aantal verschillende toonklassen in plaats van als stappen op de boog.

## Akkoordenschema en meespelen

Het schema (`src/screens/akkoorden/chart/Chart.tsx`) bewaart per akkoord zijn duur in tellen. `layoutBars` in `src/screens/akkoorden/chart/chartLayout.ts` verdeelt die tellen over maten van de gekozen maatsoort (4/4 of 3/4); een akkoord dat over een maatstreep loopt, wordt in de volgende maat voortgezet (getoond als % bij een volle maat). De meespeelloop (`src/audio/loop/`) zoekt bij elke tel met `locate` welk akkoord klinkt, en `planBeat` bepaalt wat de bas en het akkoord op die tel spelen.

**Ritmestijlen.** Naast *Recht* en *Aangehouden* zijn er vier grooves: *Swing*, *Shuffle*, *Bossa nova* en *Funk* (`GROOVES` in `src/audio/loop/grooves.ts`). Elke groove is een patroon van één of twee maten. Het bevat posities in tellen, met per positie een bastoon, een akkoordstoot of een drumslag. De planner neemt per tel de gebeurtenissen die in die tel vallen.
- **Swing**: in een geswingde stijl valt de "en" (positie x,5) niet halverwege de tel, maar op `swingRatio`. Dat is 2/3 van de tel (triolen) tot 140 BPM, en daarboven iets rechter, zoals echte spelers doen.
- **Walking bass** (Swing): grondtoon, terts, kwint en septiem, en op de laatste tel van het akkoord een halve toon naast de grondtoon van het volgende akkoord. Die naderingsnoot komt van onder of van boven, afhankelijk van waar de dichtstbijzijnde grondtoon ligt.
- **Boogie** (Shuffle): 1 3 5 6 ♭7 6 5 3 in geswingde achtsten. Bij een verminderde of overmatige kwint loopt hij de akkoordtonen.
- **Bossa**: grondtoon en kwint, met een aanloop naar het volgende akkoord op de "en" van 4. De akkoorden volgen de bossa-clave van twee maten.
- **Akkoordwissel midden in een patroon**: het nieuwe akkoord krijgt altijd meteen zijn grondtoon en een akkoordstoot.

De drums (`planDrums` in `loop/grooves.ts`, klanken in `engine/drums.ts`) worden opgewekt met oscillatoren en ruis, dus zonder opnames. Er zijn een kick, een snare, een hihat, een hihat met de voet, een ride en een rimshot. Akkoorden verslepen kan met de muis en met touch (lange druk, zodat gewoon scrollen blijft werken), of met Alt + ← en → op het toetsenbord. Met Alt of Option ingedrukt maak je een kopie. Een akkoord neemt zijn duur mee, en de maten worden opnieuw ingedeeld. Elke verplaatsing is één stap voor ongedaan maken (actie `movePath`, slepen in `useChartDrag.ts`). Het schema wordt in de browser bewaard (localStorage).

## Klank

De klank gebruikt echte opnames van piano, Rhodes, contrabas, strijkers, cello, orgel, vibrafoon, klarinet, trompet en dwarsfluit uit de FluidR3 GM-soundfont, via [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (licentie: Creative Commons Naamsvermelding 3.0). Er is één opname per kleine terts; noten ertussen worden met een kleine toonhoogteverschuiving gemaakt. De opnames staan als base64 in `src/audio/samples/`, zodat de app ook als één bestand werkt. Piano, Rhodes en contrabas zitten in de app zelf. De andere klanken staan elk in een eigen bestand in `src/audio/samples/` (mono, 48 kbps, ongeveer 340 KB). Vite bouwt die als aparte stukken, die pas geladen worden wanneer iemand die klank kiest. Tot ze geladen zijn, speelt de synthesizer.

**Er speelt altijd maar één ding.** De loop, een toonladder, een progressie, een sequentie of een akkoord: wie begint, neemt over (`audio/transport.ts`). Wat er speelde, stopt. Een lopende loop stopt dus, en de knop springt terug naar Start. Daarvoor lopen alle noten via een bus. `stopAll` laat die bus in 40 ms uitdoven en stopt daarna ook de bronnen die nog gepland stonden. Klik je op een akkoord terwijl de loop speelt, dan klinkt er geen los akkoord: het akkoord komt in het schema en de loop speelt het mee.

Elke klank heeft een eigen aanzet, uitklank en sterkte (`VOICES` in `src/audio/engine/voices.ts`). Strijkers zwellen aan in ongeveer 0,1 s, de vibrafoon klinkt lang na. De opnames duren maar 3 seconden. Voor de aangehouden klanken (strijkers, cello, orgel en de blazers) herhaalt een vast stuk van de opname zich daarom, met 0,1 s overvloeien, zolang het akkoord duurt.

Daarbovenop komen een galm (convolutie met een gegenereerde zaalrespons) en kleine willekeurige verschillen in timing en aanslag.

## Techniek

TypeScript, React 18 en Vite. Tests met Vitest. Geen server nodig: de gebouwde versie is een statische website.
