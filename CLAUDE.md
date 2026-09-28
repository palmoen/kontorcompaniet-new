@AGENTS.md

# Kontorcompaniet.no – prosjektregler

- **Ikke en nettbutikk.** Ingen handlekurv, checkout, betaling, lager, SKU-priser eller «Kjøp»-knapper. CTA-er er «Be om tilbud», «Snakk med rådgiver» og «Legg til i prosjekt».
- **Produktsider er utsatt** (egen fase). Produkter vises som kort. Gamle `/produkt/`-URL-er går midlertidig til merke eller kategori (`PRODUCT_PAGES_LIVE` i `tools/audit/build_redirect_map.py`).
- **Kontaktdata** hentes alltid fra `content.getSiteSettings()`. Aldri hardkod `@kcdrammen.no`.
- **Innhold** leses via `src/lib/content/repository.ts` (Supabase når miljøet er konfigurert, ellers seed). Redaksjonelle tekster ligger som markdown i `content/{type}/{slug}.md` og rendres med `src/lib/content/markdown.tsx` (ingen rå HTML).
- **Kvalitetsport:** `src/lib/site/pages.ts` bestemmer både robots og sitemap per side. `npm run gates` viser hva som mangler. Ikke fyll på med generisk tekst for å bestå porten.
- **Henvendelser:** alle skjema går til `POST /api/lead` → `crm.leads` (+ `crm.inquiry_lists` for prosjektlisten).
- **SEO:** hver side bruker `buildMetadata()` (canonical, robots) og relevante JSON-LD-byggere fra `src/lib/seo/jsonld.ts`. Nye sidetyper skal gjennom kvalitetsporten i `src/lib/seo/quality.ts` og legges i `src/app/sitemap.ts`.
- **Navigasjon:** lenk aldri til sider som ikke finnes. Slå på `ready` i `src/lib/site/navigation.ts` når siden lanseres.
- **Redirects:** kilden er `docs/migration/redirect-map.csv`. Etter endring: `npm run redirects:build`. Alt skal gå i ett hopp.
- **Database:** nye migreringer i `supabase/migrations/`, med RLS på alle tabeller. Anon leser kun `public.*_v`-views – nye views i public må ha eksplisitt `revoke all … from public, anon, authenticated` + `grant select` (Supabase gir ellers anon skriverett). Test med `npm run db:test`. Produksjon: `npm run db:push` (docs/06).
- **Innhold i Supabase:** `supabase/seed/content.sql` genereres fra `src/lib/content/seed.ts` (`npm run content:seed`) og må holdes i synk. Nye felt i seed-modus må også finnes i Supabase-modus (`supabase-repository.ts` + view).
- **Møbelscout:** kildedata (`scout.items`: URL, kildepris, kilde) vises ALDRI til kunden. Kunden ser kun `scout.result_v` (presentasjon + kundepris). Kilder aktiveres kun med juridisk godkjenning. Ingen scraping som bryter vilkår.
- Språk i UI og innhold: norsk bokmål, jordnært og konkret. Ingen generisk AI-SEO-tekst.

## Kommandoer
`npm run dev` · `npm run gates` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run db:test` · `SITE_INDEXABLE=true npm run build && npm run test:e2e`
