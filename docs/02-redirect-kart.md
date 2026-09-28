# 02 — Redirect-kart

**Fil:** [`migration/redirect-map.csv`](migration/redirect-map.csv), én rad per gammel URL og 4 mønsterregler.
**Generert av:** `tools/audit/build_redirect_map.py`. Alle beslutninger ligger som tabeller øverst i skriptet og kan gjennomgås uten å lese logikken.
**Grunnlag:** full crawl 2026-09-28 (sitemap + interne lenker + URL-er fra Googles indeks).

## Oppsummering

| Handling | Antall | Hva |
|---|---|---|
| **KEEP** | 34 | 29 produktsider + forside, om oss, prosjekter, kontakt og produkter. Samme URL på ny plattform |
| **301** | 74 | Kategorier, merker, sider, innlegg, designer- og miljøarkiver, alle 1:1 til nærmeste relevante side |
| **MERGE** | 50 | 40 produkt-URL-er → 12 produkter med varianter, 8 kategorier → 4, 2 vilkårssider → 1 |
| **410** | 35 | 23 system- og plugin-sider, 6 leveringstid-arkiver, 6 opprinnelsesland-arkiver |
| **AVVENTER** | 41 | Firmagaver. Venter på MerchMaker-struktur ([inventar](migration/firmagaver-inventar.csv)) |
| **UAVKLART** | 0 | |

Ingen URL videresendes til forsiden. Ingen URL videresendes til en side uten faglig sammenheng.

## Prinsipper

1. **Ett hopp.** Hver gammel URL går direkte til endelig mål, også når den kommer via `http://`, `www.` eller med/uten avsluttende `/`. Dagens kjede (`http://www` → `https://www` → `https://`) forsvinner.
2. **Produkt-URL-er beholdes** (`/produkt/{slug}`), bortsett fra:
   - duplikater (`-2`, `-3`, `-kopi`) → kanonisk slug,
   - størrelses- og lengdevarianter → ett produkt med varianter,
   - feil eller misvisende slug (`…-140x80-cm-2` som er 160×80) → ny slug.
3. **Kategorier og merker** får ny, ren struktur (`/produkter/{kategori}`, `/merkevarer/{merke}`) med 301. Duplikatstier slås sammen.
4. **Attributtarkiver** (designer, miljømerking, EPD) går til det mest relevante: eneste produkt, merke eller `/baerekraft`. Arkiver uten søkeintensjon (leveringstid, opprinnelsesland) får 410.
5. **System- og plugin-sider** (handlekurv, kasse, konto, RentMy, Elementor-/JetWoo-maler) får 410.
6. **Firmagaver:** A = samme produkt i MerchMaker, B = tilsvarende MerchMaker-kategori, C = 410 bare når ingen relevant erstatning finnes.
7. **Search Console avgjør rekkefølgen for manuell kontroll.** Kolonnene `gsc_klikk_16m` og `backlinks` fylles inn når dataene foreligger, og alle URL-er med klikk eller lenker kontrolleres manuelt før lansering.

## Produktkonsolidering (MERGE)

| Ny kanonisk URL | Gamle URL-er |
|---|---|
| `/produkt/dencon-hev-senk-skrivebord` | dencon-skrivebord-120x80-cm · -140x80-cm · -160x80-cm |
| `/produkt/dencon-skrivebord-fast-hoyde` | dencon-skrivebord-120x80-cm-2 · -fast-hoyde-140x80-cm · -140x80-cm-2 (som er 160×80) |
| `/produkt/dencon-delta-konferansebord` | 6 størrelser (140×80 → 220×100) |
| `/produkt/dencon-skap` | dencon-skap (beholdes) · -3xa4 · -4xa4 |
| `/produkt/dencon-uttrekksskap` | dencon-utrekksskap-2xa4 (skrivefeil) · dencon-uttrekksskap-3xa4 |
| `/produkt/abstracta-soneo-bordskjerm` | 1200 · 1400 · 1600 mm |
| `/produkt/fora-form-kvart-motebord` | 240x120 (som er 200×120) · 240x120-2 · 260x120 |
| `/produkt/fora-form-senso-hoy` | 2-seter · 3-seter ⚠️ bekreft |
| `/produkt/muuto-outline-3-seter` | muuto-outline-3-seter (beholdes) · -2 · -3 |
| `/produkt/vitra-id-trim` | vitra-id-trim (beholdes) · vitra-id-trim-kopi |
| `/produkt/hag-sofi-mesh-7500` | hag-sofi-mesh-7500-2 |
| `/produkt/evoline-express` | 2×, 3× og 4× Schuko |
| `/produkt/evoline-rj45-cat6-kabel` | 3 m · 5 m · 7,5 m |
| `/produkt/evoline-skjotekabel` | 1 m · 2,5 m · 3 m |
| `/produkt/evoline-tilforselskabel` | 1 m · 2 m · 3 m |

**Manuell sjekk (5):** `vitra-physix-konferansestol` (egen modell eller duplikat?), `evoline-matafix-kabelsamler-20m` (stavemåte), Fora Form Senso 2/3-seter (samle eller ikke) og bruktvarene (lagerstatus ved lansering).

## Kategorier

| Gammel | Ny |
|---|---|
| `/produktkategori/kontorstoler/` · `/produktkategori/arbeidsplassen/kontorstoler/` · `/butikk/kategori/kontorstoler/` | `/produkter/kontorstoler` |
| `/produktkategori/moteromsstoler/` | `/produkter/moteromsstoler` |
| `/produktkategori/stoler/` | `/produkter/kantinestoler` ⚠️ bekreft navn |
| `/produktkategori/skrivebord-el-hev-senk/` · `skrivebord-fast-understell/` · `komponenter/` · `skrivebord/komponenter/` · `skrivebord/` (404) · `arbeidsplassen/skrivebord/` (404) | `/produkter/skrivebord` |
| `/produktkategori/motebord/` · `motebord/komponenter-motebord/` (404) | `/produkter/motebord` |
| `/produktkategori/oppbevaring/` | `/produkter/oppbevaring` |
| `/produktkategori/sofa/` · `loungestoler/` | `/produkter/sofa-og-lounge` |
| `/produktkategori/bordskjermer/` · `arbeidsplassen/bordskjermer/` | `/produkter/akustikk` |
| `/produktkategori/skrivebord-tilbehor/` | `/produkter/tilbehor` |
| `/produktkategori/brukte-mobler/` · `/produkt-stikkord/pent-brukt/` · `/produkt-stikkord/utstillingsvare/` · `/product-brands/ombruk/` | `/brukt` |
| `/produktkategori/brands/{merke}/` (12 + rot) | `/merkevarer/{merke}` · `/merkevarer` |
| `/product-brands/express/` | `/merkevarer/evoline` |

## Sider og innlegg

| Gammel | Ny | Handling |
|---|---|---|
| `/` · `/om-oss/` · `/prosjekter/` · `/produkter` | samme sti (uten `/`) | KEEP |
| `/om-oss/kontakt/` · `/kontakt/` | `/kontakt` | 301 |
| `/produkterogtjenester/` | `/losninger` | 301 |
| `/leverandorer/` | `/merkevarer` | 301 |
| `/miljo-baerekraft/` | `/baerekraft` | 301 |
| `/butikk/` | `/produkter` | 301 |
| `/kjopsbetingelsene/` · `/butikk/vilkar-nettbutikk/` | `/salgsbetingelser` | MERGE |
| `/sikkerhet-og-personvern/` · `/cookies/` | `/personvern` · `/informasjonskapsler` | 301 |
| `/prosjekt-norwegian/` | `/prosjekter/norwegian-fornebu` | 301 |
| `/ergonomi-pa-arbeidsplassen/` | `/inspirasjon/ergonomi-pa-arbeidsplassen` | 301 |
| `/forstyrrende-stoy-og-darlig-akustikk-…/` | `/inspirasjon/stoy-og-akustikk-pa-kontoret` | 301 |
| `/framerykampanje/` | `/losninger/stillerom` | 301 |
| `/?page_id=46` · `/category/uncategorized/` · `/2020/…` (4) | `/inspirasjon` | 301 |
| `/designer/` | `/merkevarer/vitra` | 301 |

## Firmagaver (AVVENTER)

41 URL-er: 4 kategorier og 37 produkter (34 i kategorien Påskegaver, inkludert spekemat og kjølebager, 2 Rituals og 1 tidligere gave, pizzaposen, som svarer 404).

| Forslag | Antall | Innhold |
|---|---|---|
| **B** (kategori) | 4 | `/produktkategori/firmagaver/` → MerchMaker firmagaver · `…/paskegaver/` → påskegaver · `…/strand-og-piknikk/` → sommergaver · `/produktkategori/rituals/` → velvære |
| **A→B** | 37 | Samme produkt i MerchMaker hvis det finnes, ellers kategorien (påskegaver / mat og delikatesser / sommer og kjølebag / velvære) |
| **C** (410) | 0 foreløpig | Settes bare når MerchMaker ikke har en relevant kategori |

Mange av disse er sesongvarer som allerede byttes ut: tidligere julegave-URL-er som «pizzapose» svarer 404 i dag. Search Console vil vise om gamle gave-URL-er fortsatt har trafikk.

## Hvordan kartet blir kode (fase 1–6)

- `redirects`-tabellen i Supabase (`from_path`, `to_path`, `status_code`, `source`, `note`, `hits`, `last_hit_at`) lastes inn fra CSV-en og kan redigeres i admin.
- Oppslag skjer i middleware (edge) med normalisering: små bokstaver, uten avsluttende `/`, uten `add-to-cart` og uten `www`/`http`, i ett hopp.
- 410-svar får en hjelpsom side med søk og hovedkategorier, men statuskoden forblir 410.
- 404-logg (`not_found_log`) i admin gjør det enkelt å legge til manglende redirects etter lansering.
- **CI-test:** hver rad i CSV-en gir forventet status og mål, ingen mål er selv en redirect (ingen kjeder), og ingen KEEP-URL gir 404 på staging.
