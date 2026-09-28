# kontorcompaniet-new

Neste generasjon Kontorcompaniet.no + Møbelscout.

**Status:** Fase 1 (fundament) og fase 2 (Møbelscout vertical slice) er ferdige. Neste er fase 3 (offentlige kjernesider).

- [`docs/00-analyse-og-implementeringsplan.md`](docs/00-analyse-og-implementeringsplan.md): audit, beslutninger, arkitektur, Møbelscout, migrering og faser
- [`docs/01-sitemap.md`](docs/01-sitemap.md): foreslått sitemap og kvalitetsporter
- [`docs/02-redirect-kart.md`](docs/02-redirect-kart.md) + [`docs/migration/redirect-map.csv`](docs/migration/redirect-map.csv)
- [`docs/03-datamodell.md`](docs/03-datamodell.md): Supabase-skjema
- [`docs/04-wireframes.md`](docs/04-wireframes.md): sideanatomi
- [`docs/05-mobelscout-drift.md`](docs/05-mobelscout-drift.md): Møbelscout-oppsett, kilder, cron, prising og måling
- [`docs/migration/`](docs/migration/): URL-inventar, produkter, firmagaver og merker (crawl 2026-09-28)
- [`tools/audit/`](tools/audit/): crawler og analyse

## Utvikling

Krever Node 22+. Postgres 16 (`psql`) for databasetestene.

```bash
npm install
cp .env.example .env.local        # Supabase er valgfritt lokalt – uten det brukes seed-innhold
npm run dev                       # http://localhost:3000
```

| Kommando | Hva |
|---|---|
| `npm run lint` / `npm run typecheck` | ESLint og TypeScript (med Next-typegen) |
| `npm test` | Enhetstester (redirect-motor, SEO, kvalitetsporter) |
| `npm run db:test` | Migreringer + RLS-tester mot en ny, midlertidig Postgres |
| `eval "$(bash scripts/db-local.sh start)"` | Lokal Postgres med dev-seed (mock-kilde). Setter `DATABASE_URL` |
| `TEST_DATABASE_URL=$DATABASE_URL npm test` | Enhetstester + Møbelscout-integrasjonstester mot databasen |
| `SITE_INDEXABLE=true npm run build && npm run test:e2e` | Produksjonsbygg + Playwright (SEO, alle gamle URL-er, layout) |
| `npm run redirects:build` | `docs/migration/redirect-map.csv` → `src/generated/redirects.json` |

### Arkitektur (fase 1)

```
src/
  app/(site)/        offentlige sider (server components)
  app/admin/         admin (Supabase Auth, roller i ops.admin_users)
  app/robots.ts, sitemap.ts
  proxy.ts           redirects, 410, normalisering (Next 16: proxy, ikke middleware)
  lib/content/       repository-lag (Supabase ↔ seed)
  lib/seo/           metadata, JSON-LD, kvalitetsporter
  lib/redirects/     ren redirect-resolver (testet)
  lib/site/          sentral firmakonfigurasjon og navigasjon
  lib/scout/         Møbelscout: behov (Zod), tolkning (AI/regler), matching, prising, kilder, lagring, tick
  app/api/scout/     tolk, tale, opprett · app/api/cron/scout-tick (pg_cron)
supabase/migrations/ skjema: content, crm, scout, ops + public-views (RLS overalt)
tests/unit, tests/e2e
```
