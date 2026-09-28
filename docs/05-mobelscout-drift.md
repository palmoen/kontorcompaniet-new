# 05 — Møbelscout: drift og oppsett

Status: fase 2 (vertical slice) er ferdig. Flyten virker ende til ende med **mock-kilde**. Ekte kilder kobles på én etter én etter teknisk og juridisk vurdering.

## Flyt

```
/mobelscout  →  skriv eller snakk behov  →  POST /api/scout/parse (AI eller regler)
             →  «Slik forstår Møbelscout behovet» (+ maks 3 spørsmål)  →  kontaktinfo + samtykke
             →  POST /api/scout  →  én transaksjon: organisasjon, kontakt, lead, Scout, linjer, hendelser
             →  umiddelbar matching mot eksisterende lager (etter svaret)
pg_cron  →  POST /api/cron/scout-tick  →  én henting per (kilde × etterspurt kategori)
         →  normaliser, dedupliser, historikk  →  match KUN nye/endrede varer mot aktive Scouts
Admin    →  /admin/mobelscout  →  godkjenn (visningsnavn, kundepris) / avvis  →  samlet e-post (maks 1 per døgn)
Kunde    →  /mobelscout/resultat/{token}  →  «Dette er interessant»  →  høyprioritert lead + salgsvarsel
```

## Miljøvariabler

| Variabel | Påkrevd | Hva |
|---|---|---|
| `DATABASE_URL` | Ja | Supabase → Database → Connection pooling (transaction mode). Server-kode bruker direkte Postgres (transaksjoner) |
| `CRON_SECRET` | Ja | Minst 16 tegn. pg_cron sender den som `Authorization: Bearer …` |
| `OPENAI_API_KEY` | Nei | Uten nøkkel: regelbasert tolkning, og tale er skjult |
| `OPENAI_SCOUT_MODEL` | Nei | Standard `gpt-5.4-mini` (tolkning og semantisk vurdering) |
| `OPENAI_TRANSCRIBE_MODEL` | Nei | Standard `gpt-4o-mini-transcribe` |
| `RESEND_API_KEY` / `EMAIL_FROM` | Nei | Uten nøkkel logges e-poster i stedet for å sendes |
| `SALES_NOTIFY_EMAIL` | Anbefalt | Mottar «Ny Møbelscout» og «HØY PRIORITET: Kunde interessert» |

## Aktivere tikken (pg_cron)

1. Supabase → Database → Extensions: aktiver `pg_cron` og `pg_net`.
2. Kjør én gang i SQL-editoren:
   ```sql
   select scout.schedule_tick('https://kontorcompaniet.no/api/cron/scout-tick', '<CRON_SECRET>');
   ```
3. **Frekvens er data:** tikken går hvert 5. minutt, og hver kilde har egen `interval_minutes` (standard 30). Endre kildens frekvens med `update scout.sources set interval_minutes = 60 where key = '…'`, eller tikken med `select scout.schedule_tick(…, '*/10 * * * *')`.

## Kilder

- En kilde kan **ikke** aktiveres før `legal_status = 'approved'` (skjemaet håndhever det).
- Rekkefølge: `mock` (kun utvikling) → `manual` (CSV/skjema) → `own_stock` (eget bruktlager) → partnerfeeder etter avtale.
- **FINN:** kun via offisielt API eller avtale. Ingen scraping, og ingen omgåelse av innlogging, CAPTCHA eller rate limits.
- Nye adaptere implementerer `ScoutSourceAdapter` (`src/lib/scout/sources/types.ts`) og registreres i `src/lib/scout/sources/index.ts`.
- Kildebilder vises ikke automatisk. Kunden ser bare bilder som er godkjent i `scout.item_presentation.media_ids`.

## Prising

`scout.pricing_rules`: standard 10 % påslag, rundet opp til nærmeste 10 kr. Regler per kategori eller kilde vinner over standarden. Admin kan overstyre kundeprisen per treff ved godkjenning.

## Måling (trakt og omsetning)

```sql
-- Trakt siste 30 dager
select name, count(*) from ops.analytics_events
where at > now() - interval '30 days' and name like any (array['scout_%', 'match_%'])
group by name order by min(id);

-- Scouts per kanal (UTM)
select attribution->>'utm_source' as kilde, count(*) as scouts,
       count(*) filter (where status = 'won') as vunnet
from scout.requests group by 1 order by 2 desc;

-- Omsetning per inntektstype for vunne Scouts
select l.revenue_type, sum(l.quantity * l.unit_price_ex_vat) as omsetning
from crm.opportunity_lines l join crm.opportunities o on o.id = l.opportunity_id
where o.stage = 'won' and o.scout_request_id is not null group by 1;
```

Salgsmuligheter og omsetningslinjer (`crm.opportunities` og `crm.opportunity_lines`) registreres i admin i fase 4, eller synkroniseres fra CRM og 24SO via `ops.domain_events`.

## Lokal utvikling

```bash
eval "$(bash scripts/db-local.sh start)"     # Postgres med migreringer og dev-seed (mock-kilde)
export CRON_SECRET=lokal-hemmelighet-123456
npm run dev
curl -X POST localhost:3000/api/cron/scout-tick -H "Authorization: Bearer $CRON_SECRET"
TEST_DATABASE_URL=$DATABASE_URL npm test      # inkl. integrasjonstester
```
