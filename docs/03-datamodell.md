# 03 — Datamodell (Supabase / Postgres)

Status: forslag til godkjenning. Dette er en **spesifikasjon**, ikke migreringer. SQL-en under viser struktur og intensjon, og endelige migreringer skrives i fase 1.

## Konvensjoner

- **Eget Supabase-prosjekt** for kontorcompaniet.no. Ingen tabeller deles med Workshop Studio, MerchMaker eller Donna.
- **Postgres-skjemaer etter ansvar:** `content` (nettstedets innhold), `crm` (leads, kontakter, salgsmuligheter), `scout` (Møbelscout), `ops` (redirects, hendelser, AI-logg, revisjon). Bare `public` eksponeres via Supabase-API-et, og der ligger **kun views** med publisert innhold.
- Alle tabeller har `id uuid pk default gen_random_uuid()`, `created_at` og `updated_at` (trigger). Innholdstabeller har i tillegg `status` (`draft` | `published` | `archived`) og `published_at`.
- **RLS på alt.** Anonyme brukere leser bare `public.*`-views. Skriving fra nettsiden skjer i server-kode med service-rollen etter validering (Zod). Admin bruker Supabase Auth med roller (`admin`, `editor`, `sales`).
- **Ingen e-handelsinfrastruktur.** Ingen tabeller for handlekurv, ordre, betaling, lager eller kundekonto.
- Slugs er unike per tabell, med små bokstaver `[a-z0-9-]`. En slug-endring i admin **oppretter automatisk en redirect**.
- **Felles SEO-felt** på alle indekserbare innholdstabeller: `seo_title`, `seo_description`, `og_image_id`, `robots_override` (`index` | `noindex` | null = automatisk via kvalitetsport) og `canonical_override`.

---

## 1. Nettstedsinnstillinger og folk

```sql
content.site_settings (          -- én rad; typet standard i kode som fallback
  company_name, legal_name, org_number,
  street_address, postal_code, city, country, geo_lat, geo_lng,
  phone, email_general,          -- f.eks. post@kontorcompaniet.no (ALDRI kcdrammen.no)
  email_sales, email_service,
  opening_hours jsonb,           -- showroom
  social jsonb,                  -- linkedin, instagram, facebook, vimeo
  default_og_image_id, founded_year int default 1981,
  certifications text[]          -- Miljøfyrtårn, Grønt Punkt
)

content.people (                 -- rådgivere/ansatte (kontaktside, prosjekter, CTA «snakk med rådgiver»)
  name, role_title, phone, email, photo_id, bio, linkedin_url,
  is_public bool, sort int, handles text[]   -- f.eks. {'salg','service'} for ruting av leads
)
```

## 2. Produktkatalog (B2B, ikke nettbutikk)

Katalogen skal **informere, rangere og skape leads**. Den har ingen salgbare SKU-er, ingen lagerstyring, ingen prismotor og ingen konfigurator. Detaljert konfigurasjon skjer i tilbudsprosessen (Workshop Studio).

```sql
content.brands (
  slug, name, logo_id, website_url, country, parent_company,   -- f.eks. HÅG → Flokk
  intro_md,                       -- kort introduksjon
  why_we_use_md,                  -- «hvorfor Kontorcompaniet bruker merket»
  sustainability_md,              -- miljøarbeid, sertifiseringer
  is_partner bool,                -- står på leverandørlisten
  + SEO-felt
)
content.categories (
  slug, name, parent_id, sort,
  intro_md,                       -- rådgivende ingress
  body_source ('db'|'mdx'), body_mdx_path, body_blocks jsonb,  -- «slik velger du …», behov, ergonomi
  + SEO-felt
)
content.brand_categories (brand_id, category_id, note)   -- «merker vi leverer i kategorien»
content.product_families (       -- valgfritt: HÅG Tribute, Dencon Delta … (grupperer modeller)
  brand_id, slug, name, intro_md
)

content.products (
  slug, name, brand_id, family_id null, primary_category_id,
  model_code text null,           -- «8106», «9031»
  tagline text,                   -- én linje under navnet
  summary_md,                     -- kort, god beskrivelse (≥ 80 ord før indeksering)
  use_cases text[],               -- «fokusarbeid», «ståarbeidsplass», «møterom»
  features jsonb,                 -- [{title, text}] – egenskaper med kort forklaring
  ergonomics_md null,             -- der det er relevant
  dimensions_md null,             -- størrelser/mål som informasjon (ikke SKU-er)
  materials_md null,              -- materialer/farger på hensiktsmessig nivå
  warranty_years int null, designer text null, country_of_origin text null,
  lead_time_text text null,       -- «Normalt 3–5 uker» (valgfritt, ikke en forpliktelse)

  price_display ('none'|'from'|'on_request') default 'none',   -- VALGFRITT
  price_from_ex_vat numeric null,                                -- bare når price_display = 'from'
  price_checked_at date null,     -- når prisen sist ble kontrollert (skjules etter X mnd)

  catalog_status ('draft'|'published'|'archived'),
  legacy_wc_ids int[],            -- sporbarhet til WooCommerce-ID-ene som ble slått sammen
  + SEO-felt
)
content.product_options (         -- VISER MULIGHETER, er ikke salgbare kombinasjoner
  product_id, group text,         -- «Størrelser», «Understell», «Tekstil», «Modeller»
  values text[],                  -- {"120×80","140×80","160×80"} eller {"9021","9031 (med nakkestøtte)"}
  note text, sort int
)
content.product_specs (product_id, group, label, value, unit, sort)   -- sittehøyde, vekt, justeringer …
content.product_categories (product_id, category_id)                  -- sekundære kategorier
content.product_solutions (product_id, solution_id)                   -- «passer i løsning»
content.certifications (slug, name, description, logo_id)             -- FSC, Greenguard, Møbelfakta, Svanemerket
content.product_certifications (product_id, certification_id)
content.documents (product_id|brand_id, kind ('epd'|'datasheet'|'manual'|'guide'|'certificate'),
                   title, url | file_id, valid_until date null)
content.related_products (product_id, related_id, kind ('family'|'complement'|'alternative'))
```

**Ikke i modellen (bevisst):** handlekurv, ordre, betaling, kundekonto for netthandel, lagerbeholdning, SKU-pris per variant, rabattkoder, fraktberegning, mva.-motor og produktanmeldelser. Bruktvarer med antall og pris hører hjemme i `scout.*` (egen kilde `own_stock`), ikke i katalogen.

### Migrering fra WooCommerce (kuratert)

```sql
migration.wc_products (wc_id, slug, raw jsonb, fetched_at)           -- rådata, uendret
migration.catalog_decisions (wc_slug, decision ('KEEP'|'MERGE'|'REDIRECT'|'ARCHIVE'),
                             target_path, priority, reason, decided_by, decided_at)
```
Kilde: [`migration/produktkatalog-vurdering.csv`](migration/produktkatalog-vurdering.csv). Import henter bare `KEEP` og `MERGE` og lager et utkast. Publisering krever at kvalitetsporten er bestått.

## 3. Media og rettigheter

```sql
content.media_assets (
  storage_path, width, height, mime, bytes, blurhash,
  alt_text,                       -- påkrevd før publisering av indekserbar side
  caption, credit,                -- f.eks. «Foto: Vitra»
  rights ('own'|'manufacturer_licensed'|'customer_permission'|'restricted'|'unknown'),
  rights_note, source_url,
  focal_x, focal_y                -- for beskjæring
)
content.product_media (product_id, media_id, role ('primary'|'gallery'|'detail'|'context'|'in_project'), sort)
```

Bilder med `rights = 'unknown' | 'restricted'` publiseres ikke. Hvem som har importert bildet og når, logges.

## 4. Løsninger, prosjekter og redaksjonelt innhold

```sql
content.solutions (              -- /losninger/{slug}
  slug, name, group ('rom'|'tjeneste'), summary,
  body_source ('mdx'|'db'), body_mdx_path, body_blocks jsonb,   -- flyttes fra MDX til DB uten ny kode
  hero_media_id, sort, + SEO-felt
)
content.projects (               -- /prosjekter/{slug}
  slug, title, client_name, client_display ('named'|'anonymous'), industry,
  location_text, municipality, year int, area_m2 int, workstations int,
  challenge_md, solution_md, result_md,
  hero_media_id, video_urls text[], testimonial_id,
  featured bool, sort, + SEO-felt
)
content.project_media (project_id, media_id, sort, caption)
content.project_solutions (project_id, solution_id)
content.project_products (project_id, product_id, quantity int null, note)
content.project_brands (project_id, brand_id)      -- også merker uten produktsider
content.project_services (project_id, solution_id) -- tjenester levert (prosjektledelse, montering …)

content.testimonials (quote, person_name, person_title, company, project_id null,
                      permission_confirmed_at timestamptz)  -- publiseres ikke uten bekreftet tillatelse
content.clients (name, logo_id, website_url, show_in_logo_wall bool, sort)

content.articles (slug, title, excerpt, author_id → people, published_at, updated_at_display,
                  body_source, body_mdx_path, body_blocks, hero_media_id, + SEO-felt)
content.article_links (article_id, solution_id|product_id|category_id)   -- internlenking
```

**Fra MDX til admin:** alle sider leses gjennom et repository (`getSolution(slug)`). Det slår opp raden i databasen og henter brødteksten fra MDX-filen eller `body_blocks` avhengig av `body_source`. Å flytte en side til admin er dermed en dataendring.

## 5. Redirects og drift

```sql
ops.redirects (from_path unique, to_path null, status_code (301|302|410),
               source ('migration'|'slug_change'|'manual'), note, hits int, last_hit_at)
ops.not_found_log (path, referrer, count, first_seen, last_seen)
ops.audit_log (actor_id, table_name, row_id, action, diff jsonb, at)
ops.ai_calls (purpose ('scout_parse'|'scout_semantic'|'transcribe'|…), provider, model,
              input_tokens, output_tokens, audio_seconds, cost_nok numeric, latency_ms,
              scout_request_id null, ok bool, error text)
```

## 6. Leads, attribusjon, salgsmuligheter og omsetning

```sql
crm.visitors (anon_id text unique,             -- førsteparts-ID, bare satt etter samtykke
              first_touch jsonb, last_touch jsonb) -- {utm_source, utm_medium, utm_campaign, utm_content,
                                                   --  utm_term, referrer, landing_page, gclid, li_fat_id, at}
crm.organizations (name, org_number null, domain, external_refs jsonb)   -- {"crm":"…","24so":"…"}
crm.contacts (organization_id, name, email, phone, role, consent jsonb, external_refs jsonb)

crm.leads (
  kind ('contact'|'project_request'|'quote_request'|'advisor_request'|'scout'|'scout_interest'),
  product_id null, brand_id null, category_id null, project_ref_id null,  -- hvor forespørselen startet
  priority ('normal'|'high'),
  organization_id, contact_id, visitor_id,
  message, payload jsonb,          -- skjemadata / produktliste
  attribution jsonb,               -- kopi av first/last touch på innsendingstidspunktet
  assigned_to → people, status ('new'|'contacted'|'qualified'|'disqualified'),
  external_refs jsonb
)
crm.inquiry_lists (              -- «Legg til i prosjekt»: en huskeliste for forespørselen, IKKE en handlekurv
  visitor_id, lead_id null,       -- ingen priser, ingen antall-validering, ingen checkout
  items jsonb                     -- [{product_id, note, qty_estimate?}] → sendes som én prosjektforespørsel
)

crm.opportunities (                -- kvalifisert salgsmulighet (fra lead eller Scout-interesse)
  lead_id, scout_request_id null, title,
  stage ('qualified'|'quoted'|'won'|'lost'), lost_reason,
  expected_value_ex_vat, won_at, external_refs jsonb   -- CRM / Workshop Studio-prosjekt / 24SO-ordre
)
crm.opportunity_lines (
  opportunity_id,
  revenue_type ('used_furniture'|'new_products'|'logistics'|'installation'|'services'|'other'),
  description, quantity, unit_price_ex_vat, cost_ex_vat null,
  source ('scout_match'|'catalog'|'manual'), scout_match_id null, product_id null
)
```

`opportunity_lines` gjør det mulig å skille omsetningen i **brukt · nye kompletteringsprodukter · logistikk · montasje · andre tjenester**, både per Scout og totalt.

### Hendelser

```sql
ops.analytics_events (         -- førsteparts trakt (i tillegg til GA4)
  name, visitor_id, lead_id null, scout_request_id null, scout_match_id null,
  path, props jsonb, at
)
-- page_view, product_view, project_view, cta_click, contact_started, contact_submitted,
-- scout_started, scout_parsed, scout_confirmed, scout_activated, match_found, match_approved,
-- match_presented, match_viewed, match_interested, match_rejected,
-- opportunity_qualified, scout_won, scout_lost, order_value_recorded

ops.domain_events (             -- outbox for integrasjoner (Donna, CRM, Workshop Studio, 24SO, e-post)
  type, aggregate ('lead'|'scout_request'|'scout_match'|'opportunity'), aggregate_id,
  payload jsonb, occurred_at, processed_at null, attempts int, last_error
)
```

`page_view` logges sammendratt (per side og dag) i førstepartsloggen for å holde volumet nede. Full sidevisningsanalyse ligger i GA4.

---

## 7. Møbelscout

### Behovet (`ScoutNeed`)

```ts
type ScoutNeed = {
  items: Array<{
    category: CategoryKey;                  // 'office_chair' | 'desk' | 'meeting_table' | …
    quantity: { target: number; minimum?: number };
    brands: string[];                       // normalisert: 'HÅG', 'RH', …
    models: string[];
    max_unit_price_ex_vat?: number;
    condition: Array<'new' | 'used' | 'refurbished' | 'demo'>;
    accept_alternatives: boolean;
    attributes?: Record<string, string>;    // farge, mål, materiale
  }>;
  locations: string[];                      // leveringssted(er)
  deadline?: string;                        // ISO-dato
  hard_constraints: Constraint[];           // må oppfylles, ellers ingen match
  preferences: Constraint[];                // påvirker bare poengsum
  missing_critical: Array<'category' | 'quantity' | 'location' | 'budget'>;
  confidence: number;                       // 0–1 fra tolkningen
};
```

Én Scout kan ha flere varelinjer («30 stoler og 15 skrivebord»). Matching skjer per linje.

### Tabeller

```sql
scout.requests (
  lead_id, contact_id, organization_id, visitor_id,
  original_prompt text, input_mode ('text'|'voice'), transcript text null,
  need jsonb,                      -- gjeldende ScoutNeed
  status ('draft'|'active'|'paused'|'matched'|'won'|'lost'|'expired'),
  result_token text unique,        -- hemmelig lenke til resultatsiden
  activated_at, last_matched_at, expires_at, closed_reason,
  attribution jsonb
)
scout.request_revisions (request_id, need jsonb, changed_by ('customer'|'ai'|'admin'), at)  -- «Endre»-historikk
scout.request_lines (request_id, line_no, category, quantity_target, quantity_min,
                     brands text[], models text[], max_unit_price, conditions text[], hard jsonb, prefs jsonb)
                                 -- denormalisert fra need for rask SQL-filtrering

scout.sources (
  key, name, adapter ('mock'|'manual'|'own_stock'|'feed'|'api'),
  config jsonb, categories text[],
  interval_minutes int,            -- frekvens er DATA: endres i admin
  next_run_at, last_run_at, is_active bool,
  legal_status ('not_assessed'|'approved'|'rejected'), legal_note, legal_approved_by, legal_approved_at,
  images_republishable bool, rate_limit_per_min int
)
scout.source_runs (source_id, started_at, finished_at, categories text[], fetched int, new int,
                   updated int, gone int, ok bool, error)

scout.items (                      -- NORMALISERT KILDEDATA (aldri eksponert for kunde)
  source_id, external_id, dedupe_key,        -- unik (source_id, external_id)
  category, brand, model, title_raw, description_raw,
  quantity int, condition, color, material, location_text, municipality,
  source_price numeric, source_currency, source_url, source_images jsonb,
  availability ('available'|'reserved'|'gone'|'unknown'),
  first_seen_at, last_seen_at, missed_runs int
)
scout.item_observations (item_id, observed_at, quantity, source_price, availability) -- historikk

scout.item_presentation (          -- KUNDEVENDT DATA (redigeres/godkjennes internt)
  item_id unique, display_name, display_description,
  media_ids uuid[],                -- bare rettighetsavklarte bilder (egne, produsent, eller ingen)
  catalog_product_id null,         -- kobling til katalogen (produsentbilder, spesifikasjoner)
  approved_by, approved_at
)

scout.pricing_rules (scope ('default'|'category'|'source'), scope_value, markup_pct numeric default 10,
                     min_markup_nok, rounding ('none'|'10'|'50'|'100'), is_active)

scout.matches (
  request_id, request_line_no, item_id,
  score int check (0..100),
  score_breakdown jsonb,           -- {model:30, price:22, quantity:14, geo:15, condition:8}
  explanation text,                -- generert fra breakdown
  covered_qty int, completion jsonb, -- {"missing":6,"suggested_product_id":…,"text":"Vi kan komplettere med 6 nye"}
  source_price_snapshot numeric, customer_price_ex_vat numeric, margin_nok numeric,
  status ('candidate'|'approved'|'presented'|'interested'|'rejected'|'unavailable'),
  reviewed_by, reviewed_at, customer_feedback text,
  unique (request_id, request_line_no, item_id)
)

scout.notifications (request_id, channel ('email'|'sms'|'donna'|'crm'), match_ids uuid[],
                     scheduled_for, sent_at, provider_id, opened_at)  -- gruppering: én per Scout per døgn

scout.settings (key, value jsonb)   -- tick-intervall, varslingsvindu, standard utløp (f.eks. 90 dager)
```

### Tilstandsmaskiner

```
requests:  draft → active ⇄ paused → matched → won | lost
                   active → expired (etter expires_at uten aktivitet)
matches:   candidate → approved → presented → interested | rejected
           (alle) → unavailable   (varen er borte fra kilden)
```

- `match_interested` oppretter en **høyprioritert lead** (`kind = 'scout_interest'`), sender intern varsling og skriver en `domain_event`.
- Admin ser kildedata (URL, kildepris, margin), og kunden ser aldri disse feltene.

### Views for kunden (ingen kildefelter)

```sql
public.scout_result_v   -- (result_token) → linjer, godkjente/presenterte treff med display_name,
                        --   media, antall, tilstand, område, customer_price_ex_vat, explanation, completion
```

Tilgangen går via server-kode som validerer `result_token`. Viewet eksponeres ikke direkte for anon-rollen.

### Jobber (pg_cron → Edge Functions)

| Jobb | Plan | Gjør |
|---|---|---|
| `scout_tick` | hvert 5. min | Velger kilder med `next_run_at <= now()`, henter per (kilde × etterspurt kategori), upsert og historikk, og setter `next_run_at` |
| `scout_match_incremental` | etter hver kjøring | Matcher nye/endrede varer mot aktive Scout-linjer (SQL-filter → TS-poeng → eventuelt semantisk for gråsonen) |
| `scout_match_request` | ved aktivering | Matcher ny Scout mot hele lageret |
| `scout_mark_gone` | i tick | `missed_runs >= N` → `availability = 'gone'` → berørte treff `unavailable` |
| `scout_notify` | hver time | Samler godkjente treff per Scout og sender, med maks én e-post per døgn |
| `scout_expire` | daglig | Utløper inaktive Scouts, med e-post før utløp |
| `outbox_dispatch` | hvert minutt | Leverer `domain_events` til integrasjoner |

---

## 8. Offentlige views (det eneste anon kan lese)

`public.products_v`, `public.categories_v`, `public.brands_v`, `public.projects_v`, `public.solutions_v`, `public.articles_v`, `public.people_v`, `public.site_settings_v` og `public.redirects_v` (for middleware).
Alle filtrerer på `status = 'published'`, og `seo_status_v` beregner indekserbarhet (kvalitetsport) per rad.

## 9. RLS-matrise (kortversjon)

| Rolle | content | crm | scout | ops |
|---|---|---|---|---|
| anon | kun `public.*_v` | – | – | – |
| server (service role) | les | skriv leads, kontakter, hendelser | skriv requests, les resultat via token | skriv hendelser, AI-logg |
| editor | les/skriv | – | – | redirects |
| sales | les | les/skriv | les/skriv (godkjenne treff, pris, status) | les |
| admin | alt | alt | alt | alt |
