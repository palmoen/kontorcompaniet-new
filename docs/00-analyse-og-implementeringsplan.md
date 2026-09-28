# Nye Kontorcompaniet.no + Møbelscout — Analyse og implementeringsplan

Status: **Utkast til godkjenning.** Ingen applikasjonskode er skrevet. Ingen irreversible
beslutninger er tatt.
Dato: 2026-09-28

---

## 0. Grunnlag og begrensninger (les først)

### Hva analysen bygger på

| Kilde | Status | Hva den ga oss |
|---|---|---|
| `palmoen/kontorcompaniet-new` | Tomt repo (ingen commits) | Ingen eksisterende arkitektur å ta hensyn til |
| `palmoen/workshopstudio` | Lest | Next.js 16 + Supabase + Resend + Vercel cron; produktimport fra pCon og Fora Form; prosjekt/rom/produkt-datamodell |
| `palmoen/donna-core` | Lest | Leverandørnøytral `ModelProvider`, adapter-mønster, CRM/tilbud/ordre-adaptere (mock), 24SO- og Microsoft Graph-integrasjon, **Kontorcompaniets designmanual-farger** |
| `palmoen/merchmaker-core` | Lest | Shopify-app + Supabase for MerchMaker; bekrefter at firmagaver allerede har egen plattform |
| `palmoen/kontorcompaniet-guides` | Lest | Designsystem (farger, typografi, «dot»-signatur) og regler for bilderettigheter |
| `palmoen/workspace-manager`, `kontorcompaniet-ai` | Lest | Next.js 16-standard på tvers av porteføljen; OpenAI brukes i dag |
| **kontorcompaniet.no (live)** | **Blokkert** | Miljøets nettverkspolicy nekter tilgang til `kontorcompaniet.no` og `web.archive.org` |
| Google-indeks (websøk `site:kontorcompaniet.no`) | Delvis | ~45 indekserte URL-er, titler, utdrag, URL-mønstre, plattform |

**Konsekvens:** Seksjon A–E er en *foreløpig* audit basert på Googles indeks og
utdrag, ikke en fullstendig crawl. Mønstrene er tydelige nok til å ta arkitekturbeslutninger,
men den endelige URL-mappingen **kan ikke** lages før vi har full crawl + Search Console-data.
Se §0.1 for hva som trengs.

### 0.1 Hva jeg trenger fra deg før Fase 1 avsluttes

1. **Nettverkstilgang** — legg `kontorcompaniet.no` (og gjerne `web.archive.org`) til i
   miljøets tillatte domener, så kjører jeg full crawl selv. Alternativt: en Screaming Frog-
   eksport (alle interne HTML-URL-er med status, title, meta description, H1, canonical,
   indekserbarhet, innlenker).
2. **Google Search Console** — eksport av *Ytelse → Sider* og *Søk* for siste 16 måneder
   (klikk, visninger, posisjon per URL) + *Indeksering → Sider*.
3. **Backlinks** — eksport fra Ahrefs/Semrush/Search Console *Koblinger* (topp-lenkede sider).
4. **GA4 / analytics** — landingssider med økter og konverteringer siste 12 mnd.
5. **WordPress/WooCommerce-eksport** — produkt-CSV (WooCommerce → Produkter → Eksporter)
   eller WP XML-eksport, inkl. bilder, kategorier, attributter og merke-taksonomier.
6. **Prosjekter/referanser** — hvilke prosjekter har vi bilder, tillatelse og data til?
7. **Bilderettigheter** — hvilke bilder på dagens side er egne vs. produsentbilder?

---

## A. EXISTING SITE AUDIT — hva fungerer på dagens Kontorcompaniet.no?

**Plattform:** WordPress + WooCommerce (URL-mønstre `/produkt/`, `/produktkategori/`,
`/butikk/`, `?add-to-cart=`, «Arkiver» i titler, WooCommerce-taksonomier).

### Det som fungerer og må bevares

- **Posisjoneringen er riktig:** «Fra idé til ferdig møblerte lokaler», «prosjektpartner fra
  skisse til ferdig lokale», «ikke bare en forhandler».
- **Sterke tillitssignaler:** siden 1981, familieeid, Drammen, én fast kontaktperson gjennom
  hele prosjektet, leveranse og montering.
- **Kundesitat med tyngde:** Jørgen Horlings, Head of Facility Management, Norwegian ASA.
- **Merkevareporteføljen er solid og skandinavisk:** HÅG, Sedus, Vitra, Fora Form, Dencon,
  Muuto, Abstracta, Profim, Cemo, Evoline, Hay, Lexington, Horreds, Fogia, Dauphin, Sitland,
  Glimakra m.fl.
- **Produktsider finnes per modell** (HÅG Tribute 9031/9021, Creed 6006, Sofi Mesh 7500,
  Sedus Se:Flex, Fora Form Bud Unite …) — dette er long-tail SEO-verdi.
- **Brukte møbler** er allerede en kategori — et naturlig fundament for Møbelscout.
- **Leasing** (3/5 år via tredjepart, kjøpsopsjon) er nevnt — bør løftes frem.
- **Fagartikler** om ergonomi og akustikk (2020) — riktige temaer, utdatert utførelse.
- Kontorcompaniet har også en **FINN-butikk** (`finn.no/butikk/kontorcompaniet`) — relevant
  som første egne kilde for Møbelscout (se I).

### Det som ikke fungerer

- **Nettbutikk-DNA dominerer:** «Nettbutikk», handlekurv, `add-to-cart` — motsatt av
  rådgiverposisjonen.
- **Firmagaver blandet inn i kontorkatalogen:** `/produktkategori/firmagaver/strand-og-piknikk/`,
  `/produktkategori/rituals/`, «Trond Mois Pizzapose Spesial», og gavemerker (Orrefors,
  Sagaform, Vinga, Kosta Linnewäfveri) i samme merkeliste som HÅG og Vitra.
- **Prosjekter er underkommunisert:** «Se flere prosjekter» finnes, men ingen
  prosjektsider dukker opp i Googles indeks.
- **Kontakt-e-post på annet domene** (`info@kcdrammen.no`) — svekker merkevaresignalet.
- **Tjenester samlet på én side** (`/produkterogtjenester/`) i stedet for egne,
  søkbare løsningssider.

## B. SEO AUDIT — hva må bevares, hva må fikses

### Må bevares

1. Indekserte **produktsider** `/produkt/{slug}` (long-tail: «HÅG Tribute 9031», «Dencon
   hev senk skrivebord»). Anbefaling: **behold URL-mønsteret uendret** (se D).
2. **Kategorisider** for kontorstoler, skrivebord, møtebord, møteromsstoler, bordskjermer,
   brukte møbler — 301 til nye, rene URL-er.
3. **Merkesider** (HÅG, Muuto, Fora Form …) — 301 til `/merkevarer/{merke}`.
4. **Forsiden, Om oss, Kontakt, Leverandører** — deres eksterne lenker må ikke gå tapt.
5. **Artiklene** om ergonomi og akustikk — 301 til oppdaterte versjoner.
6. NAP-konsistens: Tollbugata 115, 3041 Drammen · 32 88 20 20.

### Tekniske SEO-problemer i dag

| Problem | Eksempel | Tiltak i ny plattform |
|---|---|---|
| Parameter-URL-er indeksert | `?add-to-cart=7564` på kategori-URL-er | Ingen handlekurv-parametere; 301 som stripper parameteren |
| Duplikate kategoristier | `/produktkategori/kontorstoler/`, `/produktkategori/arbeidsplassen/kontorstoler/`, `/butikk/kategori/kontorstoler/` | Én kanonisk URL per kategori |
| To parallelle merke-taksonomier | `/produktkategori/brands/hag/` og `/product-brands/express/` | Ett merke-register |
| Duplikat-slugs | `hag-sofi-mesh-7500-2`, `dencon-skrivebord-120x80-cm-2` | 301 til ren slug |
| Størrelser som egne produkter | Dencon 120x80 / 140x80 / 160x80 som 3 sider | Ett produkt med varianter (MERGE + 301) |
| Slug/tittel-inkonsistens | slug `dencon-skrivebord-120x80-cm` = «El. hev/senk» | Rydding ved MERGE |
| Tynne fasettarkiver | `/opprinnelsesland/norge/`, `/designer/lars-tornoe/`, `/produkt-stikkord/pent-brukt/` | Filtre uten egen indeksering |
| WP-standardtitler | «Kontorstoler **Arkiver** – Kontorinnredning til din bedrift \| Kontorcompaniet AS» | Tittelmal per sidetype, maks ~60 tegn |
| Artikler med STORE BOKSTAVER | «ERGONOMI PÅ ARBEIDSPLASSEN» | Normal skrivemåte, `Article`-schema, oppdatert dato |

## C. CONTENT AUDIT — hva skal migreres

| Innhold | Beslutning |
|---|---|
| Historikk (1981, familieeid, Drammen) | **Migrer**, skriv om til en ekte historie på /om-oss |
| Tjenestebeskrivelser (interiørplanlegging, prosjektering, prosjektledelse, montasje) | **Migrer og splitt** til egne løsningssider |
| Kundesitat Norwegian ASA | **Migrer** (bekreft at vi fortsatt kan bruke navn/tittel) |
| Leasing-informasjon | **Migrer**, egen seksjon/side under løsninger |
| Leverandørbeskrivelser | **Migrer og utvid** til merkevaresider med produkter + prosjekter |
| Ergonomi- og akustikkartikler (2020) | **Oppdater**, flytt til /inspirasjon, koble til løsningssider |
| Produkttekster | **Migrer data**, skriv om tekst gradvis (prioritert etter GSC-trafikk) |
| Firmagaver | **Ikke migrer** til kjernen (se §6 i brief) |
| Generisk filler-/«Arkiver»-tekst | **Fjern** |

Tone: førsteperson flertall («vi»), konkret, jordnært, fagkyndig. Ingen generisk AI-SEO-tekst.

## D. URL AUDIT — hvilke URL-er har verdi

Foreløpig inventar: [`docs/migration/url-inventar-forelopig.csv`](migration/url-inventar-forelopig.csv)
(45 URL-er fra Googles indeks, med foreslått ny URL og handling).

**Hovedanbefaling:** behold produkt-URL-ene som de er: `/produkt/{slug}`.

- Produktsider bærer mest long-tail-verdi, og et flatt mønster er stabilt når et produkt
  flytter kategori.
- Kategorier, merker og tjenester får nye, rene URL-er med 301 — der er gevinsten stor og
  antallet URL-er lite.
- Dette gir færrest mulig redirects der risikoen er størst.

Prioritering av URL-verdi (endelig først når GSC/backlinks er mottatt):
1. URL-er med organiske klikk siste 16 mnd → KEEP eller 1:1 301, verifiseres manuelt.
2. URL-er med eksterne lenker → 1:1 301 til nærmeste relevante side, aldri forsiden.
3. Indekserte URL-er uten trafikk/lenker → 301 hvis naturlig mål finnes, ellers 410.
4. Parameter-, tag- og fasett-URL-er → 301 (strip) eller 410.

## E. PRODUCT AUDIT — hvordan migrere produktene

**Datamodell (ny):**
`brands` · `categories` (hierarki) · `products` · `product_variants` (størrelse, farge,
understell) · `product_media` (med `rights`-felt) · `product_specs` (dimensjoner, materialer,
garanti, leveringstid) · `product_sustainability` (miljømerke, EPD-lenke) ·
`project_products` (kobling prosjekt↔produkt).

**Pris-modus per produkt:** `fixed` («12 490 kr eks. mva.») · `from` («Fra 8 990 kr») ·
`on_request` («Be om pris»).

**Migreringsløp:**
1. Import fra WooCommerce-eksport → staging-tabeller (rådata bevares uendret).
2. Normalisering: merke fra tittel/taksonomi, kategori-mapping, slå sammen
   størrelsesvarianter, flagg firmagaver ut.
3. **Kvalitetsport per produkt:** minst ett rettighetsavklart bilde, merke, kategori og
   kort beskrivelse → ellers `noindex` til det er komplett.
4. Prioritert omskriving av topp ~50 produkter (etter GSC-klikk).
5. Workshop Studio har allerede pCon- og Fora Form-import — gjenbruk parserlogikken i stedet
   for å bygge den på nytt (import kan senere hente produktdata direkte fra produsentfeeder).

## F. INFORMASJONSARKITEKTUR — foreslått sitemap

```
/                                   Forside
/losninger                          Hub: hva vi hjelper med
  /losninger/kontorinnredning       (hovedtjeneste – bærer «kontorinnredning»)
  /losninger/kontorlandskap
  /losninger/moterom
  /losninger/kantine
  /losninger/stillerom
  /losninger/ergonomi
  /losninger/akustikk
  /losninger/gjenbruk               (kobles til /brukt og /mobelscout)
  /losninger/prosjektledelse
  /losninger/levering-montering
  /losninger/service
  /losninger/leasing
/produkter                          Hub + filtrering
  /produkter/{kategori}             kontorstoler, skrivebord, motebord, moteromsstoler,
                                    oppbevaring, lounge, akustikk, belysning, stillerom, tilbehor
  /produkter/{kategori}/{merke}     KUN når kvalitetsterskel er nådd (se programmatisk SEO)
/produkt/{slug}                     Produktside (beholdt URL-mønster)
/merkevarer                         Hub
  /merkevarer/{merke}
/prosjekter                         Hub med filter (type, størrelse, område)
  /prosjekter/{slug}
/brukt                              Bruktlager (egne varer) + inngang til Møbelscout
/mobelscout                         Møbelscout-landingsside + input
  /mobelscout/resultat/{token}      Kundens treff (noindex, hemmelig lenke)
/inspirasjon                        Artikler/guider
  /inspirasjon/{slug}
/om-oss
/kontakt
/personvern, /informasjonskapsler
/admin/...                          Intern (noindex, auth)
```

Endringer fra briefens utgangspunkt:
- **`/produkt/{slug}` beholdes** i stedet for `/produkter/{kategori}/{slug}` (se D).
- **`/losninger/leasing`** lagt til (finnes i dag, differensierer).
- **Kategori×merke** ligger under `/produkter/` (ikke `/kontorstoler/hag` på toppnivå) — én
  hierarki, ingen konkurrerende duplikater.
- **Lokale sider** (`/omrader/{sted}`) opprettes **ikke** ved lansering. Kun når vi har
  ≥3 dokumenterte prosjekter + unik lokal tekst for et område (Oslo/Viken er trolig først).
  Drammen dekkes av /kontakt + /om-oss + LocalBusiness-schema.

### Programmatisk SEO — regler

En generert side (f.eks. `/produkter/kontorstoler/hag`) er **indekserbar** kun hvis:
≥ 4 aktive produkter · redaksjonell intro (ikke mal) · ≥ 1 relatert prosjekt eller artikkel.
Ellers: genereres ikke, eller `noindex, follow` + ikke i sitemap. Terskelen sjekkes i build
og i en automatisk test.

## G. DESIGN DIRECTION

**Konsept: «Arkitektens tegnebord».** Rolig, lyst, presist. Store prosjektbilder bærer
følelsen; typografi og grid bærer kvaliteten. Varmt, ikke kaldt — fordi paletten er varm.

**Bygger på eksisterende designmanual** (samme som guides.kontorcompaniet.no og Donnas e-poster):

| Token | Verdi | Bruk |
|---|---|---|
| `--ink` | `#2A2620` | Tekst, mørke flater |
| `--ink-soft` | `#6B655C` | Sekundærtekst |
| `--primary` | `#91762A` (Pantone 105 C) | Merkevarefarge, sparsomt — lenker, detaljer |
| `--secondary` | `#696158` (Pantone 405 C) | Nøytrale aksenter |
| `--accent` | `#CF4520` (Pantone 173 C) | **Kun** primær-CTA og «dot»-signaturen |
| `--panel` | `#FAF9F6` | Seksjonsbakgrunner |
| `--line` | `#E4E0D6` | Hårlinjer, kortkanter |

Kontrastsjekk: `#91762A` på hvit er 4,35:1 (under AA 4,5:1 for normal tekst) → bruk `--primary-deep #64511C` for
brødtekst-lenker, `--primary` kun på stor tekst/detaljer. `#CF4520` (4,64:1) og `#6B655C` (5,77:1) består AA.

**Typografi:** Archivo Expanded kun for display-overskrifter (H1/hero), Source Sans 3 for
alt annet, IBM Plex Mono for spesifikasjonstall. Barlow droppes på nettsiden for å spare en
fontfamilie. Selv-hostet via `next/font`, subset latin, `font-display: swap`.

**Signatur:** den lille fylte «dot»-en (aksentfarge) fra guidene — i seksjonsmerker,
prosesssteg og statusbadges. Gir gjenkjennelse uten å bli pynt.

**Komponenter (første sett):**
`SiteHeader` (sticky, kompakt ved scroll) · `SiteFooter` · `Hero` (bilde / delt) ·
`SectionLabel` (dot + nummer + etikett) · `ServiceCard` · `ProjectCard` (stort bilde,
kunde, antall arbeidsplasser) · `ProductCard` (bilde, merke, navn, pris-modus, miljømerke,
leveringstid) · `BrandStrip` · `LogoWall` · `ProcessSteps` · `Testimonial` ·
`SpecTable` · `Gallery` (uten slider — grid + lightbox) · `FilterBar` (URL-drevet, server-
rendret) · `Breadcrumbs` · `CtaBand` · `LeadForm` · `ScoutPrompt` · `ScoutSummary` ·
`MatchCard` · `Badge` · `Button` (primær/sekundær/tekst).

Bevegelse: kun `opacity`/`transform`, 150–250 ms, av ved `prefers-reduced-motion`.
Ingen sliders, ingen gradienter, ingen dashboard-estetikk offentlig.

**Forside-rekkefølge (strammet inn fra 12 til 10 blokker):**
1. Hero — «Fra idé til ferdig arbeidsplass.» + [Start et prosjekt] / [Se prosjekter]
2. Kort hva vi gjør + «siden 1981» + tre nøkkeltall
3. Løsninger (6 kort)
4. Utvalgte prosjekter (2–3 store)
5. Kundelogoer + ett sitat (slått sammen)
6. Møbelscout-bånd — «På jakt etter brukte kontormøbler? Fortell oss hva dere trenger. Vi leter.»
7. Produktkategorier
8. Gjenbruk/bærekraft (kan slås sammen med 6 visuelt)
9. Prosess — fra behov til ferdig lokale (5 steg)
10. Kontakt-CTA med navngitt rådgiver og bilde

## H. TECH ARCHITECTURE

Repoet er tomt, så vi velger fritt — men bør følge porteføljens eksisterende standard.

| Lag | Valg | Begrunnelse |
|---|---|---|
| Rammeverk | **Next.js 16 (App Router, React Server Components) + TypeScript** | Samme som workshopstudio, workspace-manager, kontorcompaniet-ai. SSG/ISR for innhold, server components som standard, minimal klient-JS |
| Styling | **Tailwind CSS v4** med designtokens som CSS-variabler | Samme som workshopstudio; null runtime |
| Database | **Supabase (Postgres) — eget prosjekt for nettsiden** | Foretrukket i porteføljen. Eget prosjekt fordi MerchMaker-databasen deles uten RLS (jf. Donna-kartleggingen) — nettsiden skal ikke arve det |
| Tilgang | RLS på alle tabeller; offentlig lesing kun via views for publisert innhold; skriving kun server-side | Kildedata for Møbelscout (kilde-URL, innkjøpspris, margin) er aldri tilgjengelig for anon-rollen |
| Bilder | Supabase Storage + `next/image` (AVIF/WebP, `sizes`, blur-placeholder) | Rettighetsfelt per bilde |
| E-post | **Resend** | Allerede i bruk |
| Cron | Vercel Cron (krever Pro for 30-min-intervall) eller Supabase `pg_cron` → edge function | Se I |
| Hosting | **Vercel** | Allerede i bruk |
| Validering | **Zod** | Samme som donna-core; delt mellom skjema, API og AI-output |
| AI | Leverandørnøytralt `ModelProvider`-grensesnitt (samme mønster som donna-core) + mock-provider i test | Porteføljen bruker OpenAI i dag; valg av modell/leverandør tas som egen beslutning |
| Tester | Vitest (enhet) · Playwright (E2E + SEO-assertions) · Lighthouse CI · `axe-core` | |
| CI | GitHub Actions: lint, typecheck, test, build, Playwright, Lighthouse-budsjett | Regressjoner stoppes før merge |

**Viktig om Next.js 16:** porteføljens `AGENTS.md` advarer om brudd i API-er — vi leser
`node_modules/next/dist/docs/` før vi skriver kode, ikke hukommelse.

### CMS — anbefaling (trenger din beslutning)

**Anbefaling: intet tungt tredjeparts-CMS i v1.**

- **Strukturert innhold** (produkter, merker, kategorier, prosjekter, redirects, SEO-felter,
  Møbelscout) → Supabase-tabeller + en egen `/admin`. Vi må uansett bygge admin for
  Møbelscout; samme skall håndterer resten.
- **Redaksjonelt innhold** (løsningssider, artikler, om oss) → MDX i repoet i v1 med
  frontmatter for SEO-felter. Raskt, versjonert, gratis — men krever at noen redigerer via Git/Claude.
- **Hvis ikke-tekniske redaktører skal skrive jevnlig:** vurder **Payload CMS 3** (kjører
  inne i Next.js, bruker samme Postgres) i Fase 5. Vi designer innholdsmodellen slik at
  dette byttet er billig.

### Integrasjonsklarhet (Donna, Workshop Studio, CRM, 24SO, M365)

- Alle viktige hendelser (lead opprettet, Scout aktivert, treff godkjent, kunde interessert)
  skrives til en **`domain_events`-tabell (outbox)**. Integrasjoner leser derfra — ingen
  kobling direkte mellom nettsiden og CRM/Donna.
- En felles **`leads`-tabell** for alle skjema (kontakt, prosjektforespørsel, Scout) med
  `source`, `attribution` (UTM, referrer, landingsside) og `external_refs` (CRM-id, Workshop
  Studio-prosjekt-id, 24SO-kunde-id).
- Donna eksponeres senere som et typet verktøy (`kontorcompaniet.scout.list_interested`
  osv.) mot en intern API, i tråd med Donna-arkitekturen («snakker aldri direkte mot
  databasene»).
- «Legg til i prosjekt» (produktside) lagrer en **prosjektliste** som senere kan eksporteres
  direkte som Workshop Studio-prosjekt (rom/produkt-modellen passer).

## I. MØBELSCOUT ARCHITECTURE — vertical slice

### Flyt

```
Kunde skriver/snakker behov
  → POST /api/scout/parse   (AI → Zod-validert ScoutNeed, hard vs. preferences)
  → «Slik forstår Møbelscout behovet» (+ maks 3 oppfølgingsspørsmål ved manglende kritisk info)
  → [Endre] / [Start Møbelscout]
  → Kontaktinfo (bedrift, navn, e-post, tlf valgfritt) + samtykke
  → scout_requests (status: active) + leads + domain_event
  → Umiddelbar matching mot eksisterende lager + mock-kilde
  → Admin godkjenner treff (human-in-the-loop)
  → Kunde varsles («Møbelscout har funnet noe») → /mobelscout/resultat/{token}
  → [Dette er interessant] → høyprioritert lead + intern varsling
  → [Ikke aktuelt] → tilbakemelding forbedrer matching
```

### Datamodell (Supabase)

| Tabell | Innhold |
|---|---|
| `leads` | Felles lead: bedrift, kontakt, e-post, tlf, `source`, `attribution` jsonb, `external_refs` jsonb |
| `scout_requests` | `lead_id`, `original_prompt`, `need` jsonb (ScoutNeed), `status` (draft/active/paused/matched/won/lost/expired), `result_token`, `last_matched_at`, `expires_at` |
| `scout_sources` | Kilde: navn, adaptertype, aktiv, **juridisk status** (vurdert/godkjent av/dato), bilde-rettighet, rate-limit, kategorier |
| `scout_items` | Normalisert varelager: `source_id`, `external_id`, `dedupe_hash`, kategori, merke, modell, antall, tilstand, farge/materiale, område, `source_price`, `source_url`, `first_seen`, `last_seen`, `availability` |
| `scout_item_presentation` | **Kundevendt data, adskilt fra kildedata:** visningsnavn, beskrivelse, godkjente bilder, kundepris |
| `scout_matches` | `request_id`, `item_id`, `score` 0–100, `explanation`, `covered_qty`, `completion_suggestion` jsonb («6 nye HÅG Tribute»), `customer_price`, `margin`, `status` (candidate/approved/presented/interested/rejected/unavailable) |
| `scout_events` | Tidslinje per request/match (også analytics-grunnlag) |
| `pricing_rules` | Konfigurerbart påslag (standard 10 %), per kategori/kilde, avrunding |

`scout_items` + `source_*`-felter er **aldri** eksponert for anon/kunde; kundesiden leser kun
fra en view som slår sammen `scout_matches` (approved/presented) + `scout_item_presentation`.

### Source adapters

```ts
interface ScoutSourceAdapter {
  id: string;
  fetchItems(scope: { categories: string[]; since?: Date }): Promise<ScoutRawItem[]>;
  normalize(raw: ScoutRawItem): ScoutItemInput;
  refreshItem?(item: ScoutItem): Promise<ScoutItemInput | 'gone'>;
}
```

Rekkefølge for kilder:
1. **`mock`** — deterministisk testlager (v1).
2. **`manual`** — CSV/skjema-import i admin (partier Kontorcompaniet får tilbud om).
3. **`own-stock`** — Kontorcompaniets eget bruktlager (inkl. det som i dag ligger på FINN-butikken).
4. **Partner-feeder** (Movement, Segundo m.fl.) — kun etter avtale.
5. **FINN** — FINNs vilkår tillater ikke automatisert innhenting uten avtale. Kun via
   offisielt API/partneravtale. Ingen scraping.

Hver kilde har en eksplisitt juridisk vurdering lagret i `scout_sources` før den kan aktiveres.

### Cron og matching

```
Hvert 30. min:
  aktive scouts → samlet sett av (kilde, kategori) som faktisk etterspørres
  → én henting per (kilde, kategori), ikke per kunde
  → normaliser → dedupliser (source+external_id, deretter hash på merke/modell/antall/område)
  → upsert scout_items (pris, antall, last_seen; ikke sett på N kjøringer → unavailable)
  → match KUN endrede/nye varer × aktive scouts (og nye scouts × hele lageret)
```

**Matching:**
1. Deterministisk filter (SQL): kategori, tilstand, geografi, harde krav, maks pris
   (etter påslag).
2. Poengsum (TS, testbar): merke/modell (30) · pris vs. budsjett (25) · antall-dekning (20)
   · geografi (15) · tilstand/preferanser (10).
3. AI/semantisk vurdering kun for kandidater i gråsonen (f.eks. «tilsvarende HÅG») — billig
   og sjelden.
4. **Delvis treff tillatt:** `covered_qty < target` → `completion_suggestion` fra
   produktkatalogen (samme merke/kategori) → «24 brukt + 6 nye».
5. Forklaring genereres deterministisk fra poengkomponentene (ikke AI) — konsistent og billig.

### Varsling

Godkjente treff samles i en **utsendelseskø** (maks én e-post per scout per døgn,
grupperer flere treff). Kanal-grensesnitt (`email` først; `sms`, `donna`, `crm_activity`
senere) leser fra `domain_events`.

### Voice

Nettleserens Web Speech API er ikke robust (mangler i Firefox, varierende i Safari).
Anbefaling: `MediaRecorder` → server-side transkripsjon (samme `ModelProvider`), knappen vises
kun når mikrofon-API finnes. Progressiv forbedring — fritekst fungerer alltid uten JS-avhengig UI.

### Analytics

- **Førsteparts hendelseslogg** (`analytics_events` + `scout_events`) for hele trakten
  page_view → scout_started → … → scout_won, med UTM/referrer/landingsside lagret ved første
  besøk (førsteparts-cookie, kun etter samtykke der påkrevd).
- **GA4/GTM** for markedsføring, lastet kun etter samtykke (ekomloven §3-15 krever samtykke
  for ikke-nødvendige cookies), med Consent Mode v2.
- Omsetning kobles på via `leads.external_refs` → CRM/24SO senere.

## J. MIGRATION PLAN — lansering uten SEO-tap

1. **Baseline** (før vi bygger mer): full crawl av gammel side, GSC-eksport, backlinks,
   rangeringer for ~50 nøkkelord. Lagres i repoet (`docs/migration/baseline/`).
2. **Mapping** `OLD → NEW → ACTION` i `redirects`-tabell (versjonert eksport i repo),
   med kolonner for klikk/lenker slik at viktige URL-er verifiseres manuelt.
3. **Redirect-motor** i Next.js middleware/`redirects()` fra tabellen; alle 301 går
   direkte til endelig mål (ingen kjeder); parametere strippes.
4. **Automatiske tester** (CI + staging):
   - hver gammel URL → forventet status (200/301/410) og mål,
   - ingen redirect-kjeder, ingen redirect til forsiden (unntatt `/`),
   - ingen 404 på interne lenker, canonical = egen URL, én H1,
   - title/description finnes og er unike, sitemap inneholder kun 200-indekserbare URL-er,
   - JSON-LD validerer mot schema.org-typer.
5. **Staging-crawl** av ny side, sammenlign URL-inventar med gammel.
6. **Lansering** i lavsesong, med sjekkliste (brief §34, alle 14 punkter).
7. **Etter lansering (8 uker):** GSC daglig første 2 uker (dekning, 404, sitemap), ukentlig
   rangering/CWV/konverteringer, 404-logg med rask oppfølging, behold gamle redirects i minst
   12 måneder (i praksis: permanent).

## K. IMPLEMENTATION PHASES

Hver fase avsluttes med en demo og din godkjenning før neste.

| Fase | Innhold | Leveranse / «ferdig når» |
|---|---|---|
| **0 — Data** | Nettverkstilgang eller eksporter (§0.1), full crawl, GSC, backlinks, WooCommerce-eksport | Komplett URL-inventar med trafikk/lenker; endelig mapping-utkast |
| **1 — Fundament** | Next.js 16-oppsett, designtokens, fonter, basiskomponenter, SEO-primitiver (metadata-helper, JSON-LD-byggere, sitemap, robots, breadcrumbs), Supabase-skjema v1 med RLS, CI (lint/typecheck/Vitest/Playwright/Lighthouse) | Tom men produksjonsklar ramme, grønn CI, Lighthouse-budsjett aktivt |
| **2 — Offentlig vertical slice** | Forside · `/losninger/kontorinnredning` · `/produkter/kontorstoler` · 3 produktsider · 1 prosjektside · 1 merkeside · kontakt/lead-skjema → `leads` + Resend | Hele reisen forside → løsning/kategori → produkt/prosjekt → lead fungerer, med ekte innhold |
| **3 — Møbelscout vertical slice** | Input → AI-tolkning → bekreftelse → kontakt → scout → mock-lager → matching (inkl. delvis treff) → resultatside → «Interessant» → admin-lead; admin-liste over scouts/treff med godkjenn/avvis/pris/status | Full Scout-flyt ende til ende med mock-kilde og tester |
| **4 — Innholds- og produktmigrering** | Import fra WooCommerce, variant-sammenslåing, merkevaresider, prosjekter, løsningssider, artikler | Alt innhold på plass på staging; kvalitetsport for indeksering |
| **5 — Admin og redaksjon** | Admin for produkter/merker/prosjekter/redirects/SEO; evt. Payload-beslutning | Kontorcompaniet kan redigere selv |
| **6 — SEO-migrering og lansering** | Redirect-tester, staging-crawl, sammenligning, sjekkliste §34, lansering | Live uten 404-er på verdifulle URL-er |
| **7 — Etter lansering + utvidelse** | Monitorering; egne/manuelle Scout-kilder; varsling-batching; Donna/CRM-kobling via `domain_events`; lokale sider der data finnes | Målbar trakt fra kilde til omsetning |

---

## Beslutninger jeg trenger fra deg

1. **Datatilgang:** åpne nettverkstilgang til `kontorcompaniet.no`, eller send eksportene i §0.1.
2. **Produkt-URL-er:** godkjenn at vi beholder `/produkt/{slug}`.
3. **Firmagaver:** skal gamle firmagave-URL-er 301 til MerchMaker (hvilket domene?) eller 410?
4. **CMS:** godkjenn «Supabase + egen admin + MDX i v1» (evt. Payload senere).
5. **Supabase:** nytt eget prosjekt for nettsiden (anbefalt)?
6. **Hosting:** Vercel Pro (for 30-min-cron), eller skal vi bruke Supabase `pg_cron`?
7. **AI-leverandør** for Scout-tolkning og transkripsjon.
8. **E-postdomene:** skal nettsiden bruke `@kontorcompaniet.no` i stedet for `@kcdrammen.no`?
