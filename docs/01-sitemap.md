# 01 — Foreslått sitemap

Status: forslag til godkjenning (2026-09-28). Bygger på crawl, søkeintensjon og innholdet vi faktisk har.

## Prinsipper

1. **Én side per søkeintensjon.** Ingen konkurrerende sider om samme søk.
2. **Indekseres bare med reell verdi.** Hver sidetype har en kvalitetsport. Sider som ikke består, får `noindex, follow` og holdes ute av sitemap til de er gode nok.
3. **Prosjekter er navet.** Prosjekt ↔ løsning ↔ produkt ↔ merke ↔ tjeneste lenker begge veier.
4. **Rene URL-er:** små bokstaver, bindestrek, uten æøå (`moterom`, ikke `møterom`), uten avsluttende `/`, uten parametere i indekserte URL-er.
5. **Filtre** (merke, farge, pris, miljømerke) er URL-parametere med `noindex` og canonical til den ufiltrerte siden.

## Struktur

```
/                                   Forside
│
├── /losninger                      Hub: rom, behov og tjenester
│   ├── Rom og behov
│   │   /losninger/kontorinnredning      P1  «kontorinnredning», «innrede kontor»
│   │   /losninger/kontorlandskap        P1  «kontorlandskap», «åpent landskap møbler»
│   │   /losninger/moterom               P1  «møterom møbler», «innrede møterom»
│   │   /losninger/kantine               P1  «kantinemøbler»
│   │   /losninger/akustikk              P1  «akustikk kontor», «støy i kontorlandskap»
│   │   /losninger/ergonomi              P1  «ergonomisk arbeidsplass»
│   │   /losninger/stillerom             P2  «stillerom kontor», «telefonboks kontor»
│   └── Tjenester
│       /losninger/gjenbruk              P1  «ombruk kontormøbler», «gjenbruk kontorinnredning»
│       /losninger/leasing               P1  «leasing kontormøbler»
│       /losninger/prosjektledelse       P2  planlegging, prosjektering, prosjektledelse
│       /losninger/levering-og-montering P2
│       /losninger/service               P2  service, reparasjon, omtrekk
│
├── /produkter                      Hub: kategorier, utvalgte produkter og merker
│   /produkter/kontorstoler          10 produkter · 9 merker på leverandørlisten
│   /produkter/moteromsstoler         3 · konferanse-merker
│   /produkter/kantinestoler          5 · (i dag «Stoler»)
│   /produkter/skrivebord             5 · 6 merker
│   /produkter/motebord               2 · 11 merker (Konferanse)
│   /produkter/oppbevaring            2 · 10 merker
│   /produkter/sofa-og-lounge         4 · 10 merker
│   /produkter/akustikk               1 · 4 merker (+ bordskjermer, tavler)
│   /produkter/tilbehor               8 · Evoline (strøm/kabel)
│
├── /produkt/{slug}                 41 produktsider (etter sammenslåing av varianter)
│
├── /merkevarer                     Hub: alle 52 merker gruppert per kategori
│   /merkevarer/{merke}              Egen side ved lansering: hag, vitra, dencon, fora-form, evoline,
│                                    muuto, abstracta, horreds, sedus, rh (se kvalitetsport)
│
├── /prosjekter                     Hub med filter (type, størrelse, område, år). Samme URL som i dag
│   /prosjekter/{slug}               Ved lansering: norwegian-fornebu + mål om ≥ 5 til
│
├── /mobelscout                     Tjenesteside (SEO) + inngang til Scout
│   /mobelscout/start                Input → tolkning → bekreftelse → kontakt   (noindex)
│   /mobelscout/resultat/{token}     Kundens treff, hemmelig lenke              (noindex, ikke i sitemap)
│
├── /brukt                          Egne bruktvarer og utstillingsmodeller
│   /brukt/{slug}                    Mens varen er tilgjengelig; ved salg 301 → modell- eller kategoriside
│
├── /inspirasjon                    Artikler og guider
│   /inspirasjon/ergonomi-pa-arbeidsplassen      (migrert og oppdatert)
│   /inspirasjon/stoy-og-akustikk-pa-kontoret    (migrert og oppdatert)
│
├── /baerekraft                     Miljøfyrtårn, Grønt Punkt, EPD, FSC, Greenguard, Møbelfakta
├── /om-oss                         Historie siden 1981, folk, verdier, showroom
├── /kontakt                        Kontaktskjema, personer, showroom, kart (LocalBusiness)
├── /salgsbetingelser · /personvern · /informasjonskapsler      (indekseres, ikke i hovednav)
│
└── /admin/…                        Intern (noindex, auth, blokkert i robots.txt)
```

**Hovednavigasjon:** Løsninger · Produkter · Prosjekter · Møbelscout · Om oss, med CTA-en **Start et prosjekt**.
**Footer:** kategorier, løsninger, merkevarer, brukt, inspirasjon, bærekraft, kontakt/showroom og juridiske sider.

## Kvalitetsport per sidetype (indekserbar når alle krav er oppfylt)

| Sidetype | Krav for `index` + sitemap |
|---|---|
| Løsning | ≥ 400 ord eget innhold · ≥ 1 prosjekt · ≥ 3 relevante produkter eller merker · unik title og description |
| Kategori | Redaksjonell intro (≥ 150 ord, ikke mal) **og** (≥ 4 produkter **eller** ≥ 3 merker vi leverer i kategorien) · unik title og description |
| Produkt | Beskrivelse ≥ 80 ord · ≥ 1 rettighetsavklart bilde med alt-tekst · merke · kategori · spesifikasjoner |
| Merke | Redaksjonell tekst (≥ 150 ord) **og** (≥ 3 produkter **eller** ≥ 1 prosjekt) |
| Prosjekt | Kunde (eller anonymisert bransje) · ≥ 4 bilder · utfordring, løsning og resultat · ≥ 1 koblet løsning |
| Artikkel | ≥ 600 ord · forfatter · publisert/oppdatert-dato · ≥ 1 lenke til løsning eller produkt |
| Bruktvare | Tilgjengelig · bilde · tilstand · pris eller «be om pris» |

Kvalitetsporten beregnes i databasen (`seo_status`-view) og testes i CI, så en side som ikke består, havner verken i sitemap eller i indeks.

## Internlenking (automatisk fra data)

| Fra | Til |
|---|---|
| Prosjekt | Løsningene, produktene og merkene i prosjektet, pluss relaterte prosjekter |
| Løsning | Prosjekter med løsningen, relevante kategorier og produkter, og tjenester |
| Kategori | Produkter, merker vi leverer i kategorien, prosjekter med produkter herfra, og relevant løsning |
| Produkt | Merke, kategori, prosjekter der produktet er brukt, relaterte produkter i samme familie, og Møbelscout («Ser du etter brukt?») |
| Merke | Produkter, kategorier og prosjekter |
| Møbelscout | `/brukt`, `/losninger/gjenbruk`, kategoriene og de mest etterspurte merkene |

Relaterte produkter er **alltid kontorprodukter**. Firmagaver finnes ikke i datamodellen.

## Møbelscout og bruktintensjon — hvem eier hvilket søk

| Side | Primær søkeintensjon | Innhold |
|---|---|---|
| **/mobelscout** | «brukte kontormøbler», «brukte kontorstoler», «brukt kontorinnredning», «brukte kontormøbler bedrift», «brukt HÅG», «brukt RH stol», «brukte skrivebord kontor» | Hvordan tjenesten virker, hva vi finner (kategorier og merker vi jobber med), eksempel på treff, «24 brukt + 6 nye», logistikk og montasje, prisprinsipp, FAQ (når spørsmålene er reelle), CTA til input |
| **/brukt** | «brukte kontormøbler på lager», «utstillingsmodeller kontormøbler» | Det vi faktisk har nå, med tydelig vei videre til Møbelscout |
| **/losninger/gjenbruk** | «ombruk kontormøbler», «gjenbruk kontorinnredning», «sirkulær kontorinnredning» | Ombruk i prosjekter, innbytte, omtrekk, klargjøring, miljøeffekt og prosjekter med ombruk |

Merkespesifikke bruktsøk («brukt HÅG Capisco») besvares på `/mobelscout` med en seksjon for de mest etterspurte merkene. Merkesidene lenker også til Møbelscout. **Ingen genererte sider per merke eller modell i v1.**

## Lokal SEO

Ingen stedssider ved lansering. Drammen dekkes av `/kontakt` (showroom og LocalBusiness-schema) og `/om-oss`.
Prosjektsidene har sted (Fornebu, Skøyen, Nydalen …) og bygger lokal relevans naturlig. En stedsside (`/omrader/{sted}`) vurderes først når vi har ≥ 3 prosjekter og egen lokal tekst for stedet.

## Strukturerte data per sidetype

| Side | Schema |
|---|---|
| Alle | `WebSite`, `Organization` (logo, sameAs), `BreadcrumbList` |
| Forside, kontakt | `LocalBusiness` / `FurnitureStore` (adresse, åpningstider, geo) |
| Løsning | `Service` (provider = Organization, areaServed) |
| Produkt | `Product` + `Brand` + `Offer` (kun når pris vises; ellers uten Offer) · `additionalProperty` for miljømerking |
| Prosjekt | `Article`/`CreativeWork` med `about`, `mentions` (produkter og merker), bilder og video (`VideoObject` for Vimeo) |
| Artikkel | `Article` (forfatter, datoer) |
| Møbelscout | `Service` · `FAQPage` bare hvis FAQ-innholdet er reelt og synlig |
| Merke/kategori | `CollectionPage` + `ItemList` |
