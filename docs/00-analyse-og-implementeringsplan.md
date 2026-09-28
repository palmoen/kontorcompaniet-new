# Nye Kontorcompaniet.no + Møbelscout — Analyse og implementeringsplan

**Status:** Fase 0 levert (v3, 2026-09-28), med presiseringen *«ikke en nettbutikk»* innarbeidet. Designprototype 0b ligger i [`prototype/`](../prototype/). **Produktsider er utsatt** (beslutning 16). Ingen applikasjonskode er skrevet.
**Grunnlag:** full crawl av kontorcompaniet.no 2026-09-28 + offentlige WordPress/WooCommerce-API-er.

| Dokument | Innhold |
|---|---|
| **00 – dette dokumentet** | Audit (A–E), beslutningslogg, arkitektur, Møbelscout, migrering, faser |
| [01 – Sitemap](01-sitemap.md) | Foreslått sitemap med sidetyper, indekseringsregler og innhold ved lansering |
| [02 – Redirect-kart](02-redirect-kart.md) | Prinsipper, statistikk og åpne punkter for `OLD → NEW → ACTION` |
| [03 – Datamodell](03-datamodell.md) | Supabase-skjema: innhold, SEO, leads/sporing, Møbelscout, integrasjoner |
| [04 – Wireframes](04-wireframes.md) | Sideanatomi for forside, løsning, kategori, produkt, prosjekt, merke og Møbelscout |
| [`migration/redirect-map.csv`](migration/redirect-map.csv) | Komplett redirect-kart, én rad per URL |
| [`migration/crawl-2026-09-28/url-inventar.csv`](migration/crawl-2026-09-28/url-inventar.csv) | Alle 234 crawlede URL-er med status, metadata og avvik |
| [`migration/produktkatalog-vurdering.csv`](migration/produktkatalog-vurdering.csv) | KEEP/MERGE/REDIRECT/ARCHIVE per WooCommerce-produkt |
| [`prototype/`](../prototype/) | Designprototype 0b (statisk HTML): forside, produkt, kategori, merke, prosjekt og Møbelscout |
| [`migration/crawl-2026-09-28/produkter.csv`](migration/crawl-2026-09-28/produkter.csv) | Alle 109 produkter med data, kvalitet og status |
| [`migration/firmagaver-inventar.csv`](migration/firmagaver-inventar.csv) | 41 firmagave-URL-er med A/B/C-forslag |
| [`migration/merkevarer-inventar.csv`](migration/merkevarer-inventar.csv) | 52 merker: kategori, produkter og om de står på leverandørsiden |
| [`tools/audit/`](../tools/audit/) | Crawler og analyse. Kjøres på nytt før lansering og etter at GSC-data er koblet inn |

---

## Beslutningslogg (godkjent 2026-09-28)

| # | Tema | Beslutning |
|---|---|---|
| 1 | Data | Full crawl først (gjort). Search Console og GA4 kobles inn senere for å prioritere etter trafikk. |
| 2 | Produkt-URL-er | `/produkt/{slug}` er hovedregelen. Duplikater (-2/-3, «-kopi»), feil slug og størrelsesvarianter får ny kanonisk URL med 301. Svake produkter arkiveres med 301. |
| 3 | Firmagaver | Tas ut av kjernen. Inventar med A (samme produkt i MerchMaker) / B (MerchMaker-kategori) / C (410). **Ikke 410 som standard, og aldri til MerchMaker-forsiden.** Implementeres når MerchMaker-strukturen er klar. |
| 4 | CMS | Supabase + eget adminpanel + MDX i v1. Produkter, merker, prosjekter, redirects og SEO-data administreres uten deploy. Redaksjonelt innhold går via et repository-lag, slik at MDX kan flyttes til databasen uten omskriving. |
| 5 | Database | Eget Supabase-prosjekt. Ingen deling med Workshop Studio, MerchMaker eller Donna. Integrasjoner går via API og hendelser. |
| 6 | Cron | Supabase `pg_cron`. Frekvens per kilde lagres som data, ikke i kode. Ett søk per kilde og kategori, aldri ett per Scout. |
| 7 | AI | OpenAI som standard, bak et leverandørnøytralt lag. Billigste modell som løser oppgaven, og vanlig kode der det holder. Tale-til-tekst via OpenAI i samme lag, og tekst fungerer alltid uten tale. |
| 8 | E-post | Offentlig domene er `@kontorcompaniet.no`. Kontaktdata ligger i én sentral konfigurasjon, og `@kcdrammen.no` hardkodes ikke. |
| 9 | Design | Designmanualen er et utgangspunkt. Målet er en tydelig modernisering: premium skandinavisk B2B/interiør. |
| 10 | SEO-prioritet | Søkeintensjon → nyttig innhold → internlenking → prosjekter → produkter → merker → løsninger → teknisk SEO → strukturerte data → konvertering. |
| 11 | Møbelscout | Strategisk leadgenerator. Hele trakten måles fra start, og omsetning deles opp per inntektstype. |
| 12 | Møbelscout-SEO | Offentlig, SEO-optimalisert `/mobelscout`. Ingen tynne programmatiske sider i v1. |
| 13 | **Ikke nettbutikk** | WooCommerce gjenskapes ikke. Produktene brukes til SEO, inspirasjon og leads. CTA-ene er «Be om tilbud», «Snakk med rådgiver» og «Legg til i prosjekt», og aldri «Kjøp» eller «Legg i handlekurv». Pris er et valgfritt felt. Ingen varianter som SKU-er. |
| 14 | Kuratert katalog | Hvert WooCommerce-produkt vurderes som KEEP, MERGE, REDIRECT eller ARCHIVE. Målet er ~50 svært gode produktsider, ikke flest mulig. |
| 15 | Kjernen | Koblingen **produkt ↕ prosjekt ↕ løsning ↕ merkevare ↕ rådgivning ↕ Møbelscout** styrer datamodell, internlenking og design. |
| 16 | **Produktsider utsatt** | Første versjon har ingen `/produkt/`-sider. Produktsidene bygges i sin helhet i en egen, senere fase. Til da vises produktene som kort (med «Be om tilbud») på kategori-, merke- og prosjektsider, og gamle produkt-URL-er går midlertidig med 301 til merke- eller kategorisiden. **Prioritet i v1: de nye sidene og Møbelscout.** |

## Hva vi ikke bygger

| Bygges ikke | Erstattes av |
|---|---|
| Handlekurv, checkout, betaling, nettordre | «Be om tilbud» → lead → tilbud i Workshop Studio |
| Kundekonto for netthandel | Hemmelig lenke for Møbelscout-resultater (ingen innlogging i v1) |
| Lagerstyring for ordinære produkter | Valgfri leveringstid som tekst |
| Pris- og variantmotor (SKU per størrelse, farge og understell) | `product_options` som *viser mulighetene*. Konfigurasjon skjer i tilbudet |
| Løpende vedlikehold av utsalgspriser | Valgfritt «Fra x kr eks. mva.» med kontrolldato, ellers ingen pris |
| «Legg i handlekurv» | «Legg til i prosjekt»: en forespørselsliste uten pris som sendes som én prosjektforespørsel |
| Produktsider i v1 | Produktkort med «Be om tilbud» på kategori-, merke- og prosjektsider. Produktsidene kommer i egen fase |
| Checkout på Scout-treff | «Dette er interessant» → Kontorcompaniet verifiserer → tilbud |

## Kjernen: koblingsmodellen

```
                  ┌──────────────┐
                  │  RÅDGIVNING  │  ← CTA på alle sider: navngitt rådgiver, «Be om tilbud»
                  └──────┬───────┘
   ┌──────────┐   ┌──────┴──────┐   ┌───────────┐
   │ LØSNING  │◄─►│  PROSJEKT   │◄─►│ MERKEVARE │
   └────┬─────┘   └──────┬──────┘   └─────┬─────┘
        │                │                │
        └──────────►┌────┴─────┐◄─────────┘
                    │ PRODUKT* │
                    └────┬─────┘
                         │  «Vil dere heller ha brukt?»
                    ┌────┴──────┐
                    │MØBELSCOUT │ → treff → «Interessant» → rådgiver → tilbud
                    └───────────┘
```

\* I v1 er produktet et kort (data, uten egen side) som vises på merke-, kategori- og prosjektsider og brukes av Møbelscout til komplettering. Når produktsidene kommer, får koblingen også en egen side.

Hver kobling er en tabell i datamodellen (`project_products`, `project_solutions`, `project_brands`, `product_solutions`, `brand_categories`) og vises som en seksjon på begge sider av koblingen. Én redigering i admin, for eksempel «RH Logic ble brukt i prosjekt X», gir lenker på prosjekt-, produkt-, merke- og løsningssiden samtidig.

---

## ⚠️ Haster på dagens nettside (uavhengig av ny plattform)

Disse feilene koster SEO-verdi **nå**, før migreringen er ferdig:

1. **11 produktsider svarer HTTP 500.** Siden vises for brukeren, men serveren melder feil etter ca. 5 sekunder: HÅG Tribute 9031/9021, HÅG Creed 6006, HÅG Celi 9100, Vitra Eames Lounge Chair, Vitra Eames Plastic Side Chair DSR, Profim Noor 6050, Fora Form Bud Unite, Fora Form Senso 2/3-seter og Evoline Circle80 DisQ. Google tolker 500 som en serverfeil og vil gradvis ta sidene ut av indeksen. Dette er flere av de mest verdifulle produktsidene. Årsaken ligger trolig i en PHP-feil eller et timeout i en plugin (Elementor/JetWoo/variant-swatches). Sjekk PHP-loggen hos hosting.
2. **Forsiden bruker 6,3 sekunder før første byte** (andre sider ca. 0,5 s). Hurtigbufferen treffer trolig ikke.
3. **18 URL-er i sitemap svarer ikke 200.** Sitemapet inneholder også 13 indekserbare systemsider (RentMy, customer-login, registrering, ønskeliste).

---

## A. Hva fungerer på dagens side

**Plattform:** WordPress + WooCommerce + Elementor Pro (Hello-tema), JetWooBuilder, JetSmartFilters, Yoast SEO, Google Site Kit, GTM (`GTM-WZJJX5P`), Mailchimp og Smush.

**Styrker vi tar med videre:**
- **Posisjonering:** «Vi hjelper dere hele veien fra idé til ferdig møblerte lokaler», og «rådgivende partner, ikke pågående selger».
- **Tillit:** siden 1981, familieeid, Drammen, én kontaktperson fra tilbud til ferdig leveranse, egen montør. Kontorcompaniet er Miljøfyrtårn-sertifisert og medlem av Grønt Punkt.
- **Tre sterke kundesitater:** Norwegian ASA (Jørgen Horlings), Ice Communication (Hilde Høivik) og Yara International (Iris Sigurdardottir).
- **Prosjekter:** Norwegian har levert 750 arbeidsplasser på Fornebu, dokumentert i fire filmer. I tillegg finnes filmer fra Ice.net, Kontorhuset og Yara (Vimeo).
- **Tjenestemodell:** tre faser (analyse og finansiering → planlegging/prosjektering → gjennomføring), leasing, befaring og showroom i Tollbugata 115.
- **Leverandørbredde:** 52 merker fordelt på 16 kategorier. Dette er langt mer enn nettbutikken viser.
- **Produktdata med verdi:** leveringstid, miljømerking (FSC, Greenguard, Møbelfakta), EPD (22 produkter), garanti, designer og opprinnelsesland.

**Svakheter:**
- **Nettbutikken dominerer:** «Nettbutikk», handlekurv, kasse og «Min konto» står i hovedmenyen.
- **Prosjekter er underkommunisert:** `/prosjekter/` inneholder fire videoer uten tekst eller bilder. Norwegian-caset ligger gjemt som et blogginnlegg fra 2020.
- **Firmagaver er blandet inn:** 36 av 109 produkter er påskegaver eller Rituals, og hver av dem får rundt 70 interne lenker fra produktlister.
- **Ingen tjenestesider:** alt ligger på én side, `/produkterogtjenester/`.
- **Avsender:** kontakt-e-post på `@kcdrammen.no`.

## B. SEO-audit — resultat av full crawl

| Måling | Resultat |
|---|---|
| URL-er i sitemap (15 del-sitemaps) | 212 |
| URL-er funnet totalt (sitemap + lenker + tidligere indeks) | 234 |
| Status | 204 × 200 · 13 × 301 · 1 × 302 · **11 × 500** · 5 × 404 |
| Indekserbare (200, ingen noindex, canonical til seg selv) | 194. Anslagsvis ~60 har reell søkeverdi; resten er arkiver, systemsider og firmagaver |
| Parameter-URL-er (`?add-to-cart=`) lenket internt | 3 656 |
| Meta description | **Mangler på forside, alle innholdssider, alle kategorier og alle merker** (Yoast-feltet er ikke fylt ut). Produktene har bare en autogenerert spesifikasjonsstreng («Velg variant \| Dim: 140x80 \| Faset klant») |
| Title over 65 tegn | 206. Malen «… - Kontorinnredning til din bedrift \| Kontorcompaniet AS» legger 50 tegn til hver tittel |
| Duplikate titler | 13 URL-er (Muuto Outline ×3, Horreds Mute ×2, kategoriduplikater) |
| H1 | 7 sider mangler H1, 11 har H1 i VERSALER, og forsiden har skrivefeil («IDÈ») |
| Identisk innhold | 3 kategoripar (`/produktkategori/x/` = `/produktkategori/arbeidsplassen/x/`). Canonical er riktig satt |
| Tynt innhold (<150 ord, indekserbar) | 56 sider (attributtarkiver, systemsider, kategorier) |
| Foreldreløse sider (ingen interne lenker inn) | 48. **Nesten alle kategorisidene** nås bare via sitemap, fordi `/butikk/` filtrerer med JS |
| Redirect-kjeder | `http://www.` → `https://www.` → `https://` (2 hopp) |
| Strukturerte data (Yoast) | WebSite, Organization og BreadcrumbList overalt. **Product-schema finnes bare på 34 sider, og alle er firmagaver.** Ingen møbelprodukter har Product-schema |
| Bilder | 422 unike, alle 200. 94 % av img-tagger mangler alt (logoer i lister gjentas tusenvis av ganger). Flere PNG-er er over 700 kB |
| Sitemap-rot | `?jet-woo-builder=…`, `elementor-hf/header`, `author/heiadseo-no`, `?page_id=46` og RentMy-sider |

**Må bevares:** produktsidene for modellene (HÅG, Vitra, Fora Form, Dencon m.fl.), kategorisidene, merkesidene, `/prosjekter/` (samme URL), Norwegian-caset, artiklene om ergonomi og akustikk, `/om-oss/` og kontaktsiden. Detaljene står i [02 – Redirect-kart](02-redirect-kart.md).

## C. Innholdsaudit

| Innhold | Kilde i dag | Beslutning |
|---|---|---|
| Historikk, verdier, «små nok til å bry oss» | `/om-oss/` (364 ord) | Migreres og skrives om. Vi dropper «A-laget i interiørbransjen» (skryt) og beholder «rådgiver, ikke pågående selger» |
| Tre faser (analyse/finansiering → prosjektering → gjennomføring) | `/produkterogtjenester/` (557 ord) | Blir prosess-komponenten og grunnlaget for løsningssidene |
| Kundesitater (Norwegian, Ice, Yara) | Forsiden, om oss | Migreres. Må bekreftes med kunden. Knyttes til prosjektsidene |
| Norwegian: 750 arbeidsplasser, Fornebu, 4 filmer | `/prosjekt-norwegian/` | **Blir første fullverdige prosjektside** |
| Ice.net, Kontorhuset, Yara (filmer) | `/prosjekter/` | Prosjektsider, der data som kunde, år, antall arbeidsplasser og bilder må samles inn |
| Miljøfyrtårn, Grønt Punkt, miljømerking | `/miljo-baerekraft/` (430 ord) | Egen `/baerekraft`-side som også forklarer EPD, FSC, Greenguard og Møbelfakta |
| Ergonomi, støy/akustikk (2020) | Innlegg | Oppdateres og flyttes til `/inspirasjon`, med lenker fra løsningssidene |
| Framery-kampanje (2020) | Innlegg | Utløpt. 301 til `/losninger/stillerom` |
| Ansatte med telefon og e-post | `/om-oss/kontakt/` | Flyttes til databasen (`people`) med `@kontorcompaniet.no`. Duplikat oppføring av Eva Moen fjernes |
| Showroom-åpningstider, adresse | Footer/kontakt | Legges i sentral konfigurasjon og LocalBusiness-schema |
| Leverandøroversikt (52 merker × 16 kategorier) | `/leverandorer/` | Blir data (`brands` + `brand_categories`) og driver merke- og kategorisidene |
| Nyhetsbrev (Mailchimp) | Forsiden | Vurderes. Ikke i v1 med mindre det er aktivt i bruk |
| Sponsorater (footer) | Alle sider | Vurderes. Flyttes eventuelt til `/om-oss` |

## D. URL-audit — hva har verdi

Alle URL-er er klassifisert i `url-inventar.csv`:

| Type | Antall | Verdi | Behandling |
|---|---|---|---|
| Produkt (kontor/brukt) | 75 | **Høy** for kjente modeller | **v1:** 301 midlertidig til merke- eller kategorisiden. **Senere:** 26 kuraterte produktsider (se E) |
| Kategori | 19 | **Høy** (hovedsøkeord) | 301/MERGE til 8 nye kategorier |
| Merke (produktkategori/brands) | 13 | Middels–høy | 301 til `/merkevarer/{merke}` |
| Innholdssider | 20 | Høy for om oss, kontakt, prosjekter og leverandører | KEEP/301 |
| Firmagave | 41 | Ikke kjerne | AVVENTER A/B/C |
| Attributtarkiv (designer, leveringstid, land, miljø, EPD) | 31 | Lav | 301 til relevant produkt/merke/bærekraft, ellers 410 |
| System/plugin | 24 | Ingen | 410 |
| Dato-/kategoriarkiv | 5 | Ingen | 301 til `/inspirasjon` |

Search Console-data vil **justere prioriteten**, ikke ta prinsippene: URL-er med klikk eller backlinks verifiseres manuelt før lansering.

## E. Produktaudit og kuratert katalog

> **Utsatt til fasen med produktsider.** Vurderingen under brukes da. I v1 brukes produktdataene bare til kort og til Møbelscout-komplettering, og gamle produkt-URL-er går midlertidig til merke- eller kategorisiden ([02 – Redirect-kart](02-redirect-kart.md)).

**109 produkter i dag:** 69 kontorprodukter, 4 brukt/utstilling og 36 firmagaver. Den nye katalogen **importerer ikke alt automatisk**. Hvert produkt er vurdert i [`produktkatalog-vurdering.csv`](migration/produktkatalog-vurdering.csv):

| Beslutning | Antall URL-er | Hva det betyr |
|---|---|---|
| **KEEP** | 16 | Egen produktside (samme URL, bortsett fra én foreslått slug-retting) |
| **MERGE** | 35 | Slås sammen til produktfamilier (Dencon skrivebord, Delta, Tribute, Kvart, Soft Pad …) |
| **REDIRECT** | 2 | Duplikat eller feil slug (`-2`, `-kopi`) → kanonisk side |
| **ARCHIVE** | 16 | Publiseres ikke: kabler, komponenter og tilbehør (14), Fora Form kabelluke og Dauphin ToSync. 301 til mest relevante produkt eller kategori |
| → **Produktsider fra dagens data** | **26** | P1: 16 · P2: 10 |

**Vurderingskriterier:** vil Kontorcompaniet selge produktet · SEO-verdi (kjent modell eller designikon) · viktig produsent (leverandørlisten) · brukt i prosjekter · dokumentasjon og bilder (EPD, miljømerke, antall bilder) · dekker det en viktig kategori.

**Fra 26 til ~50:** de resterende sidene bør være **modeller Kontorcompaniet faktisk ønsker å selge** fra merkene på leverandørlisten, og som i dag mangler helt. Forslag som må bekreftes av dere:

| Kategori | Kandidater (forslag) |
|---|---|
| Kontorstoler | RH Logic · RH Activ · HÅG Capisco Puls · Sedus se:motion · Varier Move · Varier Variable |
| Møterom/konferanse | Fora Form (flere modeller) · Lammhults · Randers+Radius · Montana |
| Skrivebord | Ole Lium · Horreds · Cube Design hev/senk |
| Akustikk og stillerom | Abstracta Domo · Glimakra · Framery · Fantoni |
| Lounge | Fora Form · Hay · Fredericia · Magis |
| Oppbevaring | Montana Free · Sarpsborg Metall · Eskoleia |

**Datakvalitet som må løftes før indeksering:** 89 av 109 produkter har under 50 ord beskrivelse, og flere slugs og titler er feil (`…-140x80-cm-2` er 160×80, `…-240x120` er 200×120). Attributter er inkonsistente. Produktene skrives redaksjonelt, prioritert P1 → P2.

**Pris:** vises ikke som standard. Dagens WooCommerce-priser (inkl. mva., B2C-logikk) migreres ikke automatisk. Et produkt *kan* vise «Fra x kr eks. mva.» når dere ønsker det, med en kontrolldato som skjuler prisen hvis den ikke er sjekket på X måneder.

**Import:** WooCommerce-rådata → `migration.*` (uendret) → bare KEEP/MERGE hentes inn som utkast (merke, kategori, bilder med rettighetsflagg, spesifikasjoner og miljødata) → redaksjonell bearbeiding → kvalitetsport → publisering.

## F. Informasjonsarkitektur

Se **[01 – Sitemap](01-sitemap.md)**. Viktigste endringer fra v1-forslaget:
- `/prosjekter` beholder dagens URL og blir et fullverdig prosjektunivers med krysslenker til løsninger, produkter og merker.
- `/baerekraft`, `/salgsbetingelser`, `/personvern` og `/informasjonskapsler` er lagt til.
- Kategorier: `kontorstoler`, `moteromsstoler`, `kantinestoler`, `skrivebord`, `motebord`, `oppbevaring`, `sofa-og-lounge`, `akustikk` og `tilbehor`. Flere kategorier kommer når vi har innhold som forsvarer dem.
- `/mobelscout` er en offentlig SEO-side, mens `/brukt` viser egne bruktvarer. Begge lenker til hverandre.

## G. Designretning

Se **[04 – Wireframes](04-wireframes.md)** for sideanatomi. Visuelt konsept:

**«Rolig presisjon»:** interiørarkitektens blikk kombinert med en B2B-partners tydelighet. Store bilder bærer følelsen, mens typografi, grid og luft bærer kvaliteten. Designmanualen er utgangspunktet, og vi moderniserer der den begrenser.

| Område | Endring fra dagens side |
|---|---|
| **Typografi** | Overskrifter i VERSALER erstattes av setningsbokstaver. Display: en moderne grotesk med karakter (kandidater: *Archivo* i normal bredde eller *Inter Display*). Brødtekst: *Source Sans 3* eller *Inter*. Tall og spesifikasjoner: tabulære tall, eventuelt *IBM Plex Mono*. Maks to familier og selvhostet |
| **Farge** | Varm, lys base (`#FAF9F6` / hvit), mørk varm tekst (`#2A2620`). Gull `#91762A` brukes som sjelden aksent (4,35:1 på hvit, så aldri i brødtekst). Oransje `#CF4520` brukes **kun** på primær-CTA og «dot»-signaturen. Ny: en dyp, mørk seksjonsfarge (varm antrasitt) for kontrastblokker |
| **Grid** | 12 kolonner, maks 1 440 px, generøse marger (24/48/96 px). Asymmetriske bilde- og tekstkomposisjoner på prosjekt- og løsningssider |
| **Bilder** | Fullbredde prosjektbilder (21:9 hero, 4:5 portrett i grid). Produkter på nøytral bakgrunn med konsekvent beskjæring. Ingen generiske stockbilder |
| **Navigasjon** | Fem hovedpunkter: Løsninger · Produkter · Prosjekter · Møbelscout · Om oss, og én CTA: «Start et prosjekt». Mega-meny på desktop og fullskjermsmeny på mobil. Ingen handlekurv |
| **CTA-hierarki** | Én primær per visning (oransje), sekundær som konturknapp, tertiær som tekstlenke. Produkter: «Be om tilbud» (primær), «Snakk med rådgiver» (sekundær) og «Legg til i prosjekt» (tertiær). Aldri «Kjøp» eller «Handlekurv» |
| **Produktpresentasjon** | Premium B2B/interiør, ikke en nettbutikk uten kjøpsknapp. Store bilder, bruksområder, egenskaper, miljødata og dokumentasjon, og produktet *i prosjekter*. Pris er valgfri og nedtonet |
| **Prosjektpresentasjon** | Redaksjonell layout: nøkkeltall-stripe, utfordring → løsning → resultat, bildegalleri, «produkter i prosjektet» og sitat |
| **Bevegelse** | Subtil innfading og løft (150–250 ms), bildeskala ved hover på kort, sticky seksjonsnavigasjon på lange sider og View Transitions mellom liste og detalj. Alt av ved `prefers-reduced-motion` |
| **Signatur** | «Dot»-en beholdes som gjenkjenningselement i seksjonsmerker, prosesssteg og status |

Før fase 2 lager vi en visuell designprototype (typografi, farge og tre nøkkelsider) til egen godkjenning.

## H. Teknisk arkitektur

| Lag | Valg |
|---|---|
| Rammeverk | Next.js 16 (App Router, Server Components, SSG/ISR), TypeScript |
| Styling | Tailwind CSS v4 med designtokens som CSS-variabler |
| Database, lagring og auth | **Eget Supabase-prosjekt**. RLS på alle tabeller. Admin via Supabase Auth med roller |
| Innhold | Repository-lag (`content/`): `getProduct()`, `getSolution()` osv. Strukturert innhold ligger i databasen, redaksjonelt i MDX i v1 med `body_source: 'mdx' | 'db'`, så flyttingen blir en dataendring |
| Admin | `/admin` i samme app: produkter, merker, kategorier, prosjekter, personer, sitater, redirects, SEO-felt, sidens innstillinger og Møbelscout. Publisering trigger ISR-revalidering, uten deploy |
| Jobber | Supabase `pg_cron` → Edge Functions (Scout-innhenting, matching, varsling). Se I |
| AI | `ai/`-lag med `AiProvider`-grensesnitt, `OpenAiProvider` som standard og `MockProvider` i test. Modell per oppgave er konfigurerbar |
| E-post | Resend (avsender `@kontorcompaniet.no`) |
| Hosting | Vercel (Hobby/Pro etter trafikk, uavhengig av cron). Ingen e-handelsplattform, betalingsleverandør eller lagersystem |
| Analyse | Førsteparts hendelseslogg i Supabase + GA4 via GTM etter samtykke (Consent Mode v2) |
| Kvalitet | Vitest, Playwright (E2E + SEO-tester), Lighthouse CI med budsjett, axe-core, GitHub Actions |
| Integrasjoner | Outbox (`domain_events`) + signerte webhooks/API. Donna, CRM, Workshop Studio og 24SO leser derfra |

**Sentral konfigurasjon (`site_settings`, med typet standard i kode):** firmanavn, org.nr., adresse, telefon, `post@`/`info@kontorcompaniet.no`, åpningstider, sosiale profiler og standard-OG-bilde. Ingen komponent hardkoder kontaktdata.

## I. Møbelscout — arkitektur

### Trakt og måling

```
scout_started → scout_parsed → scout_confirmed → scout_activated (lead)
  → match_found → match_approved (internt) → match_presented (varsel sendt)
  → match_viewed → match_interested | match_rejected
  → opportunity_qualified → opportunity_won | opportunity_lost
  → order_value (fordelt på inntektstype)
```

Hver overgang lagres som hendelse med tidspunkt og attribusjon (UTM, referrer, landingsside, kampanje).
Omsetningen deles opp i **brukte møbler · nye kompletteringsprodukter · logistikk/frakt · montasje · andre tjenester** (`opportunity_lines.revenue_type`). Se [03 – Datamodell](03-datamodell.md).

### AI-laget — riktig verktøy per oppgave

| Oppgave | Løsning | Modellnivå |
|---|---|---|
| Tolke naturlig språk til `ScoutNeed` (hard vs. preferanse) | Ett kall med strukturert output (Zod/JSON Schema) | Liten, rask modell (dagens portefølje bruker `gpt-5-mini`) |
| 1–3 oppfølgingsspørsmål | Samme kall returnerer `missing_critical[]`. Spørsmålene lages i kode fra maler | Ingen ekstra kall |
| Deterministisk matching (kategori, merke, pris, antall, område, tilstand) | SQL + TypeScript | Ingen AI |
| Semantisk matching («tilsvarende HÅG», ukjent modell) | Kun for kandidater i gråsonen, med embeddings og eventuelt et kort vurderingskall | Embedding-modell / liten modell |
| Matchforklaring | Mal fra poengkomponentene («92 % match. Riktig modell, …») | Ingen AI. Eventuelt omformulering med liten modell |
| Tale til tekst | OpenAI speech-to-text via samme `AiProvider` | Transkripsjonsmodell (konfigurerbar) |

Alle AI-kall logges i `ai_calls` (formål, modell, tokens, kostnad, varighet) slik at kostnad per Scout kan måles.

### Innhenting med pg_cron — én tikk, mange Scouts

```
pg_cron (hvert 5. min: "tick")
  → scout_sources der next_run_at <= now() og aktiv
      → hvilke kategorier etterspør aktive Scouts hos denne kilden?
      → ETT kall per (kilde, kategori) → rådata
      → normaliser → dedupliser → upsert scout_items (+ pris/antall-historikk)
      → next_run_at = now() + source.interval   ← frekvens er data, kan endres i admin
  → match: kun nye/endrede varer × aktive Scouts
  → nye Scouts matches umiddelbart mot hele lageret ved aktivering
  → varsling: godkjente treff samles (maks én e-post per Scout per døgn)
```

Kildene tas i bruk i denne rekkefølgen: `mock` → `manual` (CSV/skjema i admin) → `own-stock` (eget bruktlager) → partnerfeeder etter avtale. FINN kobles bare på via API eller avtale, aldri scraping. Hver kilde har juridisk status, dato og hvem som har godkjent, og kan ikke aktiveres uten dette.

### Kildedata skilt fra kundepresentasjon

`scout_items` (kilde-URL, kildepris, kildenavn og rå bilder) er **bare tilgjengelig for service-rollen og admin**. Kunden ser kun `scout_item_presentation` + `scout_matches` via en view: visningsnavn, godkjente bilder, antall, tilstand, område og **Kontorcompaniets kundepris**. Påslaget (standard 10 %) er konfigurerbart per kategori og kilde i `pricing_rules`.

## J. Migreringsplan

1. **Baseline (gjort):** full crawl 2026-09-28 med URL-inventar, produktdata og redirect-kart.
2. **GSC/GA4 (når tilgang gis):** eksport av 16 måneder med klikk og visninger per URL, og backlinks. Fylles inn i `redirect-map.csv`. URL-er med verdi verifiseres manuelt.
3. **Fiks dagens side nå:** 500-feil, forsidens TTFB og sitemap-rot (se ⚠️ over).
4. **Redirect-motor:** tabellen `redirects` lastes inn fra CSV-en. Oppslag skjer i middleware med og uten avsluttende `/`, og uten `?add-to-cart`. Alt går i **ett hopp**.
5. **Automatiske tester i CI:** hver gammel URL får forventet status og mål, uten kjeder og uten 404 på URL-er med verdi. I tillegg testes canonical, én H1, unike titler og beskrivelser, at sitemap bare inneholder indekserbare 200-sider, JSON-LD-validering og interne lenker.
6. **Staging-crawl:** samme crawler kjøres mot staging, og inventarene sammenlignes.
7. **Lansering:** sjekklisten fra brief §34 (14 punkter), og GSC «adresseendring» er ikke nødvendig (samme domene).
8. **Etter lansering:** GSC daglig i to uker (dekning, 404, sitemap), deretter ukentlig i åtte uker (rangering, CWV, konverteringer). Redirects beholdes permanent.

## K. Faser

Prioritet: **de nye sidene og Møbelscout.** Produktsidene er en egen, senere fase.

| Fase | Innhold | Ferdig når |
|---|---|---|
| **0 — Data** ✅ | Crawl, inventar, redirect-kart, sitemap, datamodell, wireframes | Godkjent |
| **0b — Designprototype** ✅ | Forside, kategori, merke, prosjekt og Møbelscout (landing, flyt og treff) | Visuell retning godkjent |
| **1 — Fundament** | Next.js, designsystem, Supabase-skjema med RLS, SEO-primitiver, repository-lag, admin-skall, CI | Grønn CI, Lighthouse-budsjett aktivt |
| **2 — Møbelscout vertical slice** | Input (tekst og tale) → AI → bekreftelse → kontakt → Scout → mock-kilde → match (inkl. delvis treff) → resultat → «Interessant» → admin → sporing i hele trakten | Full trakt ende til ende med tester |
| **3 — Offentlige kjernesider** | Forside, løsninger (P1), kategorier som rådgivningssider med produktkort, merkesider, prosjekter (Norwegian først), om oss, kontakt, `/mobelscout`, `/brukt` og `/baerekraft` | Hele brukerreisen med ekte innhold og leads |
| **4 — Innhold og admin** | Prosjekter, løsninger og artikler. Admin for merker, kategorier, prosjekter, produktkort, redirects og SEO | Kontorcompaniet redigerer selv |
| **5 — Lansering** | Redirect-tester (produkt-URL-er → merke/kategori), staging-crawl, sjekkliste | Live uten 404 på verdifulle URL-er |
| **6 — Møbelscout-kilder og varsling** | Manuelle og egne kilder, partnerfeeder, samlet varsling, Donna/CRM via `domain_events` | Treff fra ekte kilder |
| **7 — Produktsider** (senere) | Kuraterte `/produkt/`-sider (~50), prioritert etter Search Console-trafikk. Redirect-kartet genereres på nytt med `PRODUCT_PAGES_LIVE = True` | Modellsøk rangerer igjen |

Fase 2 og 3 kan gå parallelt etter fase 1. Møbelscout er lagt først fordi den har mest ny logikk og mest forretningsverdi.

## Åpne punkter

1. **Tilgang til Search Console/GA4:** Site Kit er installert, så GSC er trolig allerede koblet til. Gi lesetilgang eller en eksport.
2. **MerchMaker-domene og URL-struktur** for firmagave-redirects.
3. **Prosjektdata:** kunde, år, størrelse, antall arbeidsplasser, bilder og tillatelse for Norwegian, Ice, Yara, Kontorhuset og nyere prosjekter.
4. **Kundesitater:** bekreft at de kan brukes med navn og tittel.
5. **Katalogen** (først aktuelt i fase 7): bekreft KEEP/ARCHIVE og velg nye modeller. **For v1:** hvilke produkter skal vises som kort på merke- og kategorisidene?
6. **Kategorinavn:** «Kantinestoler» (i dag «Stoler») og «Sofa og lounge».
