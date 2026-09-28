# 02 — Redirect-kart

**Fil:** [`migration/redirect-map.csv`](migration/redirect-map.csv), én rad per gammel URL og 4 mønsterregler.
**Generert av:** `tools/audit/build_redirect_map.py`. Alle beslutninger ligger som tabeller øverst i skriptet og kan gjennomgås uten å lese logikken.
**Grunnlag:** full crawl 2026-09-28 (sitemap + interne lenker + URL-er fra Googles indeks).

## Oppsummering

| Handling | Antall | Hva |
|---|---|---|
| **KEEP** | 20 | 15 produktsider + forside, om oss, prosjekter, kontakt og produkter. Samme URL på ny plattform |
| **301** | 93 | Kategorier, merker, sider, innlegg og attributtarkiver. **Produkter:** 16 arkiverte → relevant produkt eller kategori, 2 duplikater, 1 slug-retting (Eames DSR), 4 bruktvarer → `/brukt` og Sedus Se:flex (404 i dag) → `/merkevarer/sedus` |
| **MERGE** | 45 | 35 produkt-URL-er → 10 produktfamilier, 8 kategorier → 4, 2 vilkårssider → 1 |
| **410** | 35 | 23 system- og plugin-sider, 6 leveringstid-arkiver, 6 opprinnelsesland-arkiver |
| **AVVENTER** | 41 | Firmagaver. Venter på MerchMaker-struktur ([inventar](migration/firmagaver-inventar.csv)) |
| **UAVKLART** | 0 | |

Skriptet stopper hvis et mål selv er en redirect-kilde, så redirect-kjeder kan ikke oppstå. Ingen URL videresendes til forsiden. Ingen URL videresendes til en side uten faglig sammenheng.

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

## Produkter: kuratert katalog

Ny plattform er ikke en nettbutikk, så katalogen **kurateres** ([`produktkatalog-vurdering.csv`](migration/produktkatalog-vurdering.csv)). Resultatet er 26 produktsider fra dagens data.

| Ny produktside | Gamle URL-er | Beslutning |
|---|---|---|
| `/produkt/dencon-skrivebord` | 6 URL-er (hev/senk og fast, 120–160 cm, flere med feil slug) + 3 arkiverte komponenter | MERGE/ARCHIVE |
| `/produkt/dencon-delta-konferansebord` | 6 størrelser | MERGE |
| `/produkt/fora-form-kvart-motebord` | 3 (inkl. `-2`, og «240x120» som er 200×120) + arkivert kabelluke | MERGE/ARCHIVE |
| `/produkt/hag-tribute` | 9021 og 9031 | MERGE |
| `/produkt/vitra-soft-pad-chair` | EA 217 og EA 219 | MERGE |
| `/produkt/vitra-physix` | physix + physix-konferansestol | MERGE |
| `/produkt/fora-form-senso-hoy` | 2- og 3-seter | MERGE |
| `/produkt/muuto-outline-3-seter` | 3 identiske | MERGE |
| `/produkt/dencon-skap` · `/produkt/dencon-uttrekksskap` | 3 + 2 (skrivefeil rettet) | MERGE |
| `/produkt/abstracta-soneo-bordskjerm` | 3 bredder | MERGE |
| `/produkt/evoline-express` | 3 Express + **11 arkiverte kabler og verktøy** | MERGE/ARCHIVE |
| `/produkt/evoline-circle80` | Circle80 + DisQ | MERGE |
| `/produkt/hag-sofi-mesh-7500` | `-2` | REDIRECT |
| `/produkt/vitra-id-trim` | `-kopi` | REDIRECT |
| `/produkt/vitra-eames-plastic-side-chair-dsr` | `vitra-eames-plastic-sidechair-dsr` | Ny slug, **bare hvis GSC ikke viser trafikk**. Ellers beholdes den gamle |
| `/produkter/kontorstoler` | Dauphin ToSync | ARCHIVE (bekreft) |
| Øvrige produktsider (Capisco, Creed, Futu, Celi, Eames Lounge, Bud Unite, City, AAC 22, Noor, Bollo) | uendret URL | KEEP |

**Bekreft:** Dauphin (arkiveres), Profim Noor og Fogia Bollo (beholdes, men merkene står ikke på leverandørlisten), og slug-rettingen for Eames DSR.

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

Designer-arkivene går til eneste relevante produkt eller merke (f.eks. `/designer/svein-asbjornsen-sapdesign/` → `/produkt/hag-tribute`).

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
