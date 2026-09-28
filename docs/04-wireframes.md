# 04 — Wireframes og sideanatomi

Status: forslag til godkjenning. Skissene viser **struktur, hierarki og innhold**. Det visuelle uttrykket ligger i designprototypen [`prototype/`](../prototype/) (fase 0b).

**Ikke en nettbutikk:** ingen handlekurv, kasse, konto, kjøpsknapper, prisfilter eller variantvelgere. Primær-CTA er «Be om tilbud», sekundær er «Snakk med rådgiver», og tertiær er «Legg til i prosjekt».

Felles for alle sider:
- **Header:** logo · Løsninger · Produkter · Prosjekter · Møbelscout · Om oss · [Start et prosjekt]. Mega-meny på desktop og fullskjermsmeny på mobil. Sticky og kompakt ved scroll.
- **Brødsmuler** under header på alle undersider (også som `BreadcrumbList`).
- **Footer:** kategorier, løsninger, merkevarer, brukt, inspirasjon, bærekraft, showroom og kontakt (fra `site_settings`), og juridiske sider.
- **Én H1 per side.** Seksjonsoverskrifter er H2. Ingen VERSALER i HTML (eventuell versal-stil gjøres med CSS på små etiketter).
- **Primær-CTA** er alltid oransje og vises bare én gang per skjermbilde. Sekundær-CTA er en konturknapp.
- `•` markerer «dot»-signaturen i seksjonsetiketter.

---

## 1. Forside `/`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ HERO (fullbredde prosjektbilde 21:9, mørk gradient i nedre venstre hjørne)    │
│                                                                              │
│   H1  Fra idé til ferdig arbeidsplass.                                       │
│   Vi planlegger, leverer og monterer kontorer folk trives i – siden 1981.    │
│   [Start et prosjekt]   [Se prosjekter]                                      │
│                                                     Bilde: Norwegian, Fornebu │
├──────────────────────────────────────────────────────────────────────────────┤
│ • Hva vi gjør                                                                │
│ H2 Én partner fra behov til ferdig møblerte lokaler                          │
│ Kort tekst (2–3 setninger)          │  1981      750         52              │
│                                     │  grunnlagt arbeidsplasser merker vi     │
│                                     │            (Norwegian)  leverer        │
├──────────────────────────────────────────────────────────────────────────────┤
│ • Løsninger                                                                  │
│ H2 Hva trenger dere hjelp med?                                               │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │Kontor- │ │Kontor- │ │Møterom │ │Akustikk│ │Ergonomi│ │Gjenbruk│  → /losn.  │
│ │innredn.│ │landskap│ │        │ │        │ │        │ │        │            │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘            │
├──────────────────────────────────────────────────────────────────────────────┤
│ • Utvalgte prosjekter                                                        │
│ ┌───────────────────────────────┐ ┌───────────────┐                         │
│ │ STORT BILDE                   │ │ BILDE         │                          │
│ │ Norwegian · Fornebu · 750 apl │ │ Yara · Skøyen │                          │
│ └───────────────────────────────┘ ├───────────────┤                          │
│                                   │ Ice · Nydalen │   [Alle prosjekter →]    │
├──────────────────────────────────────────────────────────────────────────────┤
│ SOCIAL PROOF: logovegg (6–8 kunder) + ett stort sitat med navn og tittel      │
├──────────────────────────────────────────────────────────────────────────────┤
│ MØBELSCOUT-BÅND (mørk seksjon)                                               │
│ H2 På jakt etter brukte kontormøbler?                                        │
│ Fortell Møbelscout hva dere trenger. Vi leter – og sier fra når vi finner    │
│ noe.  ┌─────────────────────────────────────────────┐ [Sett Møbelscout       │
│       │ «30 kontorstoler fra HÅG eller RH, Oslo…»    │  på saken]            │
│       └─────────────────────────────────────────────┘                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ • Produkter                                                                  │
│ H2 Kvalitetsmøbler fra merkene vi stoler på                                  │
│ Kategorirad: Kontorstoler · Skrivebord · Møtebord · Møteromsstoler ·         │
│              Sofa og lounge · Oppbevaring · Akustikk      [Alle produkter →] │
│ Merkestripe: HÅG · Vitra · Fora Form · Dencon · Sedus · RH · Muuto …         │
├──────────────────────────────────────────────────────────────────────────────┤
│ • Slik jobber vi                                                             │
│ ①Behov og analyse → ②Plan og tegning → ③Tilbud og finansiering →             │
│ ④Levering og montering → ⑤Oppfølging og service                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ BÆREKRAFT (kompakt): Miljøfyrtårn · EPD · ombruk   [Les om bærekraft →]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ KONTAKT-CTA: foto av rådgiver + navn                                         │
│ H2 Skal dere flytte, vokse eller fornye?                                     │
│ «Vi tar en uforpliktende prat – og kommer gjerne på befaring.»               │
│ [Start et prosjekt]  eller ring 32 88 20 20                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ FOOTER                                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```
Mobil: heroen beholder bildet (4:5), tallene legges i en horisontal rad, løsningskortene i et 2×3-grid og prosjektene i en vertikal stabel.
Schema: `WebSite`, `Organization`, `LocalBusiness`.

---

## 2. Løsningsside `/losninger/{slug}` (eksempel: akustikk)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Brødsmuler: Løsninger / Akustikk                                             │
│ H1 Akustikk som gjør kontorlandskapet til et sted man får jobbet             │
│ Ingress (2–3 setninger om problemet)          │ HERO-BILDE (prosjekt)        │
│ [Snakk med en rådgiver]                       │                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Sticky seksjonsnavigasjon: Utfordringen · Slik løser vi det · Prosjekter ·   │
│                             Produkter · Spørsmål                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Utfordringen          Tekst (reelt fagstoff, ikke fyllstoff)              │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Slik løser vi det     3–4 grep, hver med bilde + kort tekst               │
│                          (absorbenter · skjermer · stillerom · planløsning)  │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Prosjekter med akustikk   [ProjectCard] [ProjectCard] [ProjectCard]       │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Produkter og merker       [ProductCard ×4]                                │
│                              Merker vi leverer: Abstracta · Glimakra · Osnes │
│                              [Se alle akustikkprodukter →]                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Slik jobber vi (kompakt prosess, 5 steg)                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Ofte stilte spørsmål (bare hvis reelle; åpne <details>, ikke trekkspill-  │
│    kaos)                                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Relatert: Stillerom · Kontorlandskap · Artikkel: Støy og akustikk            │
│ CTA-bånd: rådgiver med foto  [Start et prosjekt]                             │
└──────────────────────────────────────────────────────────────────────────────┘
```
Schema: `Service` + `BreadcrumbList` (+ `FAQPage` bare med reell FAQ).

---

## 3. Kategoriside `/produkter/{kategori}`: rådgivningsside, ikke produktgrid

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Brødsmuler: Produkter / Kontorstoler                                         │
│ H1 Kontorstoler                                     │ STEMNINGSBILDE         │
│ Ingress: En god kontorstol er den som blir justert  │ (prosjekt)             │
│ riktig og brukt riktig. Vi hjelper dere velge.      │                        │
│ [Snakk med en rådgiver]  [Prøv i showroom]          │                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Hurtignavigasjon: Slik velger dere · Våre anbefalinger · Etter behov ·       │
│                   Merker · Prosjekter · Brukt · Spørsmål                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Slik velger dere kontorstol                                               │
│ 4 kort: Justerbarhet · Sittetid og arbeidsform · Kroppsstørrelser · Miljø    │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Våre anbefalte kontorstoler     (NYTT)                                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│ │  BILDE   │ │  BILDE   │ │  BILDE   │ │  BILDE   │   ProductCard (B2B):     │
│ │HÅG       │ │HÅG       │ │HÅG       │ │Vitra     │   merke · modell         │
│ │Capisco   │ │Futu Mesh │ │Tribute   │ │ID Trim   │   én linje «best til»    │
│ │Aktiv sit.│ │Hele dagen│ │Leder/lang│ │Fleksibel │   • miljømerke           │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   (ingen pris, ingen kurv)│
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Etter behov    Fokusarbeid → … · Aktiv sitting → … · Delte arbeidsplasser  │
│                   → … · Store/små brukere → …   (lenker til produkter)       │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Merker vi leverer   HÅG · RH · Sedus · Varier · Savo · RBM · NCP · BackApp │
│ «Ser dere etter en bestemt modell? Vi leverer hele sortimentet.»             │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Prosjekter          [ProjectCard ×3]                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ DELT BÅND:  NYTT                          │  BRUKT                            │
│ «Se våre anbefalte kontorstoler» ↑        │ «Vil dere heller kjøpe brukt?     │
│ [Be om tilbud]                            │  Sett Møbelscout på saken.»       │
│                                           │ [Start Møbelscout]                │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Spørsmål og svar (bare reelle spørsmål)                                   │
│ Rådgiver-CTA med foto                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```
Ingen prisfilter og ingen sortering på pris. Et enkelt filter på merke og bruksområde vises bare når kategorien har ≥ 12 produkter.
Schema: `CollectionPage` + `ItemList` + `BreadcrumbList` (+ `FAQPage` bare med reell FAQ).

---

## 4. Produktside `/produkt/{slug}`: B2B, ikke en nettbutikk uten kjøpsknapp

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Brødsmuler: Produkter / Kontorstoler / HÅG Capisco 8106                      │
├──────────────────────────────────────────────┬───────────────────────────────┤
│ STORT BILDE (redaksjonelt, 4:5)              │ HÅG → merkeside               │
│                                              │ H1 HÅG Capisco 8106           │
│                                              │ Tagline: Sadelstolen som får  │
│                                              │ deg til å bevege deg.         │
│                                              │                               │
│ [▢][▢][▢] + «I bruk»-bilde fra prosjekt       │ Passer til: Aktivt arbeid ·   │
│                                              │ Hev/senk-pulter · Kreative    │
│                                              │ miljøer                       │
│                                              │                               │
│                                              │ [Be om tilbud]                │
│                                              │ [Snakk med rådgiver]          │
│                                              │ + Legg til i prosjekt         │
│                                              │ ───────────────────────────── │
│                                              │ Garanti 10 år · Norsk design  │
│                                              │ • Møbelfakta • EPD            │
│                                              │ (pris vises bare hvis aktivt: │
│                                              │  «Fra 8 990 kr eks. mva.» –   │
│                                              │  liten og nedtonet)           │
├──────────────────────────────────────────────┴───────────────────────────────┤
│ H2 Om stolen             Kort, god tekst (≥ 80 ord)                          │
│ H2 Egenskaper            3–6 kort med ikon: Sadelsete · 360° rotasjon · …    │
│ H2 Ergonomi              Hvordan den brukes riktig + lenke til brukerguide   │
│ H2 Muligheter            Modeller · Understell · Tekstiler (VISER, ikke      │
│                          velger) → «Vi hjelper dere velge i tilbudet»         │
│ H2 Mål                   Kompakt spesifikasjonstabell                        │
│ H2 Miljø og dokumentasjon  Sertifiseringer · EPD (last ned) · garanti        │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 I prosjekter          [ProjectCard ×2] «Brukt i 2 av våre prosjekter»     │
│ H2 Løsninger             Ergonomi · Kontorlandskap                           │
│ H2 Mer fra HÅG           [ProductCard ×3]                                    │
│ H2 Alternativer          [ProductCard ×3] (andre merker, samme behov)         │
├──────────────────────────────────────────────────────────────────────────────┤
│ DELT BÅND: «Trenger dere mange?» → Rådgiver   │  «Brukt Capisco?» → Møbelscout│
└──────────────────────────────────────────────────────────────────────────────┘
```
«Be om tilbud» åpner en kort dialog med produktet forhåndsutfylt (bedrift, navn, e-post, telefon valgfritt, antall ca. og melding) og blir en lead med `product_id`.
«Legg til i prosjekt» legger produktet i en forespørselsliste uten pris (skuff nederst til høyre), som sendes som én prosjektforespørsel.
Mobil: bilde → navn → «passer til» → CTA-er. En sticky bunnlinje har [Be om tilbud] og [Rådgiver].
Schema: `Product` + `Brand` (uten `Offer` med mindre pris er aktiv og kontrollert) + `BreadcrumbList`.

---

## 5. Prosjektside `/prosjekter/{slug}` (eksempel: Norwegian, Fornebu)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HERO fullbredde bilde                                                        │
│ Brødsmuler: Prosjekter / Norwegian                                           │
│ H1 Norwegian: 750 arbeidsplasser på Fornebu                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ NØKKELTALL-STRIPE                                                            │
│ Kunde        Sted       År     Arbeidsplasser   Leveranse                    │
│ Norwegian    Fornebu    20xx   750              Kontor · konferanse · kantine│
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Utfordringen    │  Tekst                                                  │
│ H2 Løsningen       │  Tekst + bilder i asymmetrisk grid                      │
│ H2 Resultatet      │  Tekst + tall                                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ SITAT (stort)  «These people delivered …» – Jørgen Horlings, Facility Mgr    │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Bak kulissene   Video-grid (4 episoder, Vimeo med facade – lastes ved klikk)│
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Bildegalleri    masonry/grid → lightbox                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 I prosjektet                                                              │
│ Løsninger: [Kontorlandskap] [Møterom] [Kantine]                              │
│ Tjenester: [Prosjektledelse] [Levering og montering]                         │
│ Produkter: [ProductCard ×4]  Merker: HÅG · Fora Form · Dencon …              │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Flere prosjekter  [ProjectCard ×3]  (samme løsning/bransje)               │
│ CTA-bånd: «Planlegger dere noe lignende?»  [Start et prosjekt]               │
└──────────────────────────────────────────────────────────────────────────────┘
```
Prosjekthub `/prosjekter`: filter på type (kontorlandskap, møterom …), størrelse og område, med store kort i grid.
Schema: `Article`/`CreativeWork` + `VideoObject` + `BreadcrumbList`.

---

## 6. Merkeside `/merkevarer/{merke}` (eksempel: HÅG)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HERO: stemningsbilde · LOGO · H1 HÅG                                         │
│ Introduksjon (hvem, hva de er kjent for)                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Fakta-stripe: Norge · Del av Flokk · Opptil 10 års garanti · EPD · Møbelfakta │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Hvorfor vi bruker HÅG    (Kontorcompaniets egen stemme: erfaring,         │
│                              service, gjenbruksverdi)                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Produktfamilier          Capisco · Tribute · Futu · Sofi · Creed · Celi   │
│ H2 Utvalgte HÅG-produkter   [ProductCard ×4]                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 HÅG i våre prosjekter    [ProjectCard ×n]                                 │
│ H2 Ergonomi                 kort + lenke til /losninger/ergonomi og guider    │
│ H2 Miljø                    produksjon, materialer, EPD, sertifiseringer     │
├──────────────────────────────────────────────────────────────────────────────┤
│ DELT BÅND: [Be om tilbud på HÅG] / «Brukt HÅG?» → Møbelscout                 │
└──────────────────────────────────────────────────────────────────────────────┘
```
Merkehub `/merkevarer`: alle 52 merker gruppert per kategori. Merker uten egen side vises som tekst eller logo uten lenke.

---

## 7. Møbelscout — landingsside `/mobelscout` (SEO)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ HERO (lys, rolig; illustrerende bilde av lager/ombrukte møbler)              │
│ H1 Brukte kontormøbler – vi leter for dere                                   │
│ Fortell oss hva dere trenger én gang. Møbelscout følger markedet og sier fra │
│ når vi finner noe som passer.                                                │
│ ┌──────────────────────────────────────────────────────────────┐             │
│ │ Fortell oss hva dere trenger …                               │ [🎙 Snakk]  │
│ │                                                              │             │
│ └──────────────────────────────────────────────────────────────┘             │
│ [Sett Møbelscout på saken]     Gratis og uforpliktende.                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ • Slik fungerer det                                                          │
│ ① Beskriv behovet  ② Bekreft  ③ Vi leter  ④ Dere får treff  ⑤ Vi leverer     │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Eksempel på et treff   (statisk MatchCard: «RH Logic 400 · 24 stk ·       │
│    3 490 kr eks. mva. · Dekker 24 av 30 – vi kompletterer med 6 nye»)        │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Hva Møbelscout finner                                                     │
│ Brukte kontorstoler · skrivebord · møtebord · oppbevaring · lounge · akustikk│
│ Mest etterspurte merker: brukt HÅG, brukt RH, Sedus, Kinnarps, Vitra …       │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Mer enn brukt:  komplettering med nye møbler · frakt og innbæring ·       │
│    klargjøring · montering · ett kontaktpunkt                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Hva koster det?  Ærlig prisprinsipp (lavt påslag på bruktvaren; dere      │
│    betaler for logistikk og montering bare hvis dere ønsker det)             │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Brukt nå på lager → /brukt (3–4 kort)                                     │
│ H2 Ombruk og miljø → /losninger/gjenbruk                                     │
│ H2 Spørsmål og svar (reelle spørsmål: tilstand, garanti, hvor lenge leter    │
│    dere, må vi kjøpe)                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```
Schema: `Service` (+ `FAQPage` bare når FAQ-en er reell og synlig).

---

## 8. Møbelscout — input, bekreftelse og resultat

**Steg 1 — input** (`/mobelscout/start`, også som innebygd komponent)
```
│ H1 Hva trenger dere?                                                         │
│ ┌──────────────────────────────────────────────────────────────┐             │
│ │ «Vi trenger ca. 30 ergonomiske kontorstoler fra HÅG eller RH,│  [🎙 Snakk] │
│ │  maks 4–5 000 kr per stol. Oslo/Drammen. Før november.»      │             │
│ └──────────────────────────────────────────────────────────────┘             │
│ Forslag: [+ Antall] [+ Budsjett] [+ Sted] [+ Frist]   (hjelper, ikke skjema) │
│ [Fortsett]                                                                   │
```
Tale: knappen vises bare når mikrofon støttes. Opptaket går til server-transkripsjon, og teksten havner i feltet slik at kunden kan redigere den. Tekst fungerer alltid uten tale.

**Steg 2 — «Slik forstår Møbelscout behovet deres»**
```
│ H1 Slik forstår vi behovet                                                   │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ 30 ergonomiske kontorstoler               (minst 20)          [Endre]    │ │
│ │ HÅG, RH eller tilsvarende                                     [Endre]    │ │
│ │ Maks 5 000 kr/stk eks. mva.                                   [Endre]    │ │
│ │ Oslo / Drammen                                                [Endre]    │ │
│ │ Før 1. november                                               [Endre]    │ │
│ │ Brukt eller refurbished                                       [Endre]    │ │
│ │ MÅ: ergonomisk, hev/senk sete     KAN: sort tekstil                      │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ (hvis kritisk info mangler: maks 3 korte spørsmål inline, f.eks.             │
│  «Hvor skal møblene leveres?» [Oslo] [Drammen] [Annet: ___])                 │
│ [Start Møbelscout]   [Endre beskrivelsen]                                    │
```

**Steg 3 — kontakt** (samme side, åpnes under)
```
│ H2 Hvem skal vi si fra til?                                                  │
│ Bedrift*  Kontaktperson*  E-post*  Telefon (valgfritt)                       │
│ ☐ Samtykke til å bli kontaktet om treff (lenke personvern)                   │
│ [Start Møbelscout]                                                           │
│ → Kvittering: «Møbelscout er i gang. Vi sier fra når vi finner noe.          │
│    Følg med her: [lenke til resultatsiden]»                                  │
```

**Resultat** `/mobelscout/resultat/{token}` (noindex)
```
│ H1 Møbelscout: 30 kontorstoler                        Status: ● Leter aktivt │
│ Behov: 30 stk · HÅG/RH · maks 5 000 kr · Oslo/Drammen · før 1. nov  [Endre]  │
├──────────────────────────────────────────────────────────────────────────────┤
│ H2 Funn (2)                                                                  │
│ ┌────────────┬─────────────────────────────────────────────────────────────┐ │
│ │ BILDE      │ RH Logic 400                                 92 % match     │ │
│ │ (godkjent) │ 24 stk tilgjengelig · Sort tekstil · Brukt – god stand      │ │
│ │            │ Oslo-området                                                │ │
│ │            │ 3 490 kr/stk eks. mva.                                      │ │
│ │            │ «Dette partiet dekker 24 av 30 stoler. Vi kan komplettere   │ │
│ │            │  de resterende seks med nye RH Logic.»                      │ │
│ │            │ [Dette er interessant]   [Ikke aktuelt ▾ (hvorfor?)]        │ │
│ └────────────┴─────────────────────────────────────────────────────────────┘ │
│ (ingen kildenavn, kilde-URL, kildepris eller margin, noensinne)              │
├──────────────────────────────────────────────────────────────────────────────┤
│ «Interessant» → «Takk! [Rådgiver-navn] kontakter dere innen én arbeidsdag    │
│  for å bekrefte tilgjengelighet, stand og levering.» (ingen løfter om        │
│  tilgjengelighet før intern verifisering)                                    │
│ [Pause Møbelscout]  [Avslutt]                                                │
```

---

## 9. Admin (skisse, for helhetens skyld)

```
/admin
├── Oversikt: nye leads · Scout-treff til godkjenning · 404-logg · sider som feiler kvalitetsport
├── Møbelscout
│   ├── Aktive Scouts   (kunde · behov · dato · status · siste søk · treff · beste match)
│   ├── Treff           (produkt · kunde · score · kilde · kildepris · kundepris · antall · margin · URL · bilder)
│   │                    Handlinger: Godkjenn · Avvis · Endre pris · Pause Scout · Lukk · Vunnet · Tapt
│   ├── Kilder          (status, juridisk vurdering, frekvens, siste kjøring)
│   └── Prisregler
├── Innhold: Produkter · Merker · Kategorier · Prosjekter · Løsninger · Artikler · Folk · Sitater
├── SEO: Redirects · 404-logg · Kvalitetsport-status · Metadata
├── Salg: Leads · Salgsmuligheter (med omsetning per inntektstype)
└── Innstillinger: Firma/kontakt · Integrasjoner
```
