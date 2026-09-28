# 06 — Supabase: oppsett og drift

Kontorcompaniet.no har **eget Supabase-prosjekt** (ref `rswtbsgnewhaxyimagvs`). Det deles ikke med MerchMaker, Workshop Studio eller Donna.

Appen virker uten Supabase, og da brukes seed-innhold. Så snart `NEXT_PUBLIC_SUPABASE_URL` og `NEXT_PUBLIC_SUPABASE_ANON_KEY` er satt, leses **alt** innhold fra `public.*_v`-viewene. Databasen må derfor ha migreringer **og** innholdsseed før variablene settes i et miljø som skal vise nettstedet.

## Hva ligger hvor

| Fil | Hva |
|---|---|
| `supabase/config.toml` | Supabase CLI: lokal stack, og hvilke seedfiler `db push --include-seed` tar med |
| `supabase/migrations/*.sql` | Skjema, RLS og views. Kjøres i navnerekkefølge |
| `supabase/seed/content.sql` | Startinnhold (kategorier, merker, løsninger, produktkort, prosjekt, folk). **Genereres** fra `src/lib/content/seed.ts` med `npm run content:seed`. Idempotent: rører aldri rader som finnes, så admin-endringer beholdes |
| `supabase/seed/dev.sql` | Mock-kilde for Møbelscout. **Kun lokalt/CI, aldri produksjon** |
| `supabase/tests/` | Stub av Supabase (roller, `auth`, standardrettigheter) + RLS-tester for ren Postgres |

## 1. Første gangs oppsett

### 1.1 Migreringer og innhold

Krever databasepassordet (Project Settings → Database) og en personlig tilgangsnøkkel for CLI-et.

```bash
npx supabase@2 login                        # åpner nettleser, eller: export SUPABASE_ACCESS_TOKEN=…
npm run db:link                             # spør etter databasepassordet
npx supabase@2 db push --include-seed --dry-run   # se hva som vil kjøres
npm run db:push                             # migreringer + supabase/seed/content.sql
```

CLI-et fører logg i `supabase_migrations.schema_migrations`, så `npm run db:push` kjører bare nye migreringer. Seedfilen kjøres på nytt bare når innholdet i den endres.

### 1.2 Sjekk at databasen er riktig

I SQL-editoren:

```sql
select (select count(*) from public.categories_v) as kategorier,   -- 9
       (select count(*) from public.brands_v) as merker,           -- 52
       (select count(*) from public.solutions_v) as losninger,     -- 12
       (select count(*) from public.products_v) as produktkort,    -- 26
       (select count(*) from public.projects_v) as prosjekter,     -- 1
       (select org_number from public.site_settings_v) as orgnr;   -- 930 584 630
```

**Security Advisor** (Database → Advisors) skal ikke vise tabeller uten RLS. Varselet «Security Definer View» for `public.*_v` er bevisst: viewene eier tilgangen og filtrerer selv på publisert innhold (se `20260928120300_public_views.sql`).

### 1.3 Data API

Settings → API → **Exposed schemas**: kun `public` (og `graphql_public`). Legg **aldri** til `content`, `crm`, `scout`, `ops` eller `migration`, fordi anon da får direkte API mot interne tabeller. Server-koden når dem via `DATABASE_URL` og service-rollen.

### 1.4 Auth (admin-innlogging med e-postlenke)

Authentication → URL Configuration:

- **Site URL:** `https://kontorcompaniet.no`
- **Redirect URLs:** `https://kontorcompaniet.no/admin/auth/callback`, forhåndsvisning (f.eks. `https://*-kontorcompaniet.vercel.app/admin/auth/callback`) og `http://localhost:3000/admin/auth/callback`

Authentication → Sign In / Providers:

- **Allow new users to sign up:** av. Innloggingen sender lenke kun til eksisterende brukere (`shouldCreateUser: false`).
- **Email:** på, med magisk lenke.

Authentication → Emails → **SMTP Settings**: Supabase sin innebygde e-post er sterkt begrenset (få e-poster i timen, og bare til prosjektets egne medlemmer). Bruk Resend:

| Felt | Verdi |
|---|---|
| Host / port | `smtp.resend.com` / `465` |
| Brukernavn | `resend` |
| Passord | `RESEND_API_KEY` |
| Avsender | `post@kontorcompaniet.no` (domenet må være verifisert i Resend) |

`supabase/config.toml` har de samme valgene for den **lokale** stacken. Ikke kjør `supabase config push` mot produksjon. Da overskrives Site URL med `localhost`.

### 1.5 Admin-brukere

1. Authentication → Users → **Add user → Send invitation** (eller «Create new user» med «Auto confirm»).
2. Gi rolle i SQL-editoren (`admin` | `editor` | `sales`):

```sql
insert into ops.admin_users (user_id, display_name, role)
select id, 'Pål Moen', 'admin' from auth.users where email = 'navn@kontorcompaniet.no'
on conflict (user_id) do update set role = excluded.role, display_name = excluded.display_name;
```

Uten rad i `ops.admin_users` slipper ingen inn i `/admin`, selv med gyldig innlogging.

### 1.6 Miljøvariabler (Vercel / hosting)

| Variabel | Hvor i Supabase | Merk |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | `https://rswtbsgnewhaxyimagvs.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API Keys | Anon- eller publishable-nøkkel. Leser kun `public.*_v` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys | Service role / secret. **Kun server**, aldri `NEXT_PUBLIC_` |
| `DATABASE_URL` | Connect → **Transaction pooler** | Hele strengen med passord, port 6543: `postgresql://postgres.rswtbsgnewhaxyimagvs:<passord>@aws-0-<region>.pooler.supabase.com:6543/postgres`. Appen validerer at den starter med `postgres` |
| `CRON_SECRET` | – | Minst 16 tegn. Brukes også i `scout.schedule_tick` |

Resten (`OPENAI_*`, `RESEND_API_KEY`, `SALES_NOTIFY_EMAIL`, `SITE_INDEXABLE`) står i `.env.example` og [05](05-mobelscout-drift.md).

### 1.7 Møbelscout-tikken

Aktiver `pg_cron` og `pg_net`, og kjør `scout.schedule_tick(...)`. Se [05 — Aktivere tikken](05-mobelscout-drift.md#aktivere-tikken-pg_cron). Ikke legg `dev.sql` på produksjon. Ekte kilder legges inn med `legal_status = 'approved'` først når de er klarert.

## 2. Bilderettigheter

Produktbildene fra dagens nettsted (`public/images/produkter/`) er registrert i `content.media_assets` med `rights = 'unknown'`, fordi lisensen ikke er bekreftet ([00](00-analyse-og-implementeringsplan.md), åpent spørsmål 8). I Supabase-modus vises de derfor **ikke** på produktkortene før det er avklart. Når lisensen er bekreftet:

```sql
update content.media_assets
set rights = 'manufacturer_licensed', rights_note = 'Bekreftet av … (dato)'
where storage_path like '/images/produkter/%';
```

## 3. Endringer videre

1. Ny migrering: `supabase/migrations/<yyyymmddhhmmss>_navn.sql`. RLS på nye tabeller. Nye views i `public` får `revoke all … from public, anon, authenticated` og `grant select … to anon, authenticated`, fordi Supabase ellers gir anon skriverett på nye objekter. Stubben etterligner det, og `npm run db:test` feiler hvis anon kan skrive.
2. `npm run db:test`, og deretter integrasjonstestene mot lokal database (se README).
3. Endret startinnhold: rediger `src/lib/content/seed.ts`, kjør `npm run content:seed` og commit `supabase/seed/content.sql`. CI feiler hvis de er ute av synk.
4. Etter merge: `npm run db:push`.

Innhold som allerede er redigert i admin, oppdateres ikke av seeden. Seeden er bare for startinnhold.
