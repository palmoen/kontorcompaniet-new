@AGENTS.md

# Kontorcompaniet.no – prosjektregler

- **Ikke en nettbutikk.** Ingen handlekurv, checkout, betaling, lager, SKU-priser eller «Kjøp»-knapper. CTA-er er «Be om tilbud», «Snakk med rådgiver» og «Legg til i prosjekt».
- **Produktsider er utsatt** (egen fase). Produkter vises som kort. Gamle `/produkt/`-URL-er går midlertidig til merke eller kategori (`PRODUCT_PAGES_LIVE` i `tools/audit/build_redirect_map.py`).
- **Kontaktdata** hentes alltid fra `content.getSiteSettings()`. Aldri hardkod `@kcdrammen.no`.
- **Innhold** leses via `src/lib/content/repository.ts` (Supabase når miljøet er konfigurert, ellers seed).
- **SEO:** hver side bruker `buildMetadata()` (canonical, robots) og relevante JSON-LD-byggere fra `src/lib/seo/jsonld.ts`. Nye sidetyper skal gjennom kvalitetsporten i `src/lib/seo/quality.ts` og legges i `src/app/sitemap.ts`.
- **Navigasjon:** lenk aldri til sider som ikke finnes. Slå på `ready` i `src/lib/site/navigation.ts` når siden lanseres.
- **Redirects:** kilden er `docs/migration/redirect-map.csv`. Etter endring: `npm run redirects:build`. Alt skal gå i ett hopp.
- **Database:** nye migreringer i `supabase/migrations/`, med RLS på alle tabeller. Anon leser kun `public.*_v`-views. Test med `npm run db:test`.
- **Møbelscout:** kildedata (`scout.items`: URL, kildepris, kilde) vises ALDRI til kunden. Kunden ser kun `scout.result_v` (presentasjon + kundepris). Kilder aktiveres kun med juridisk godkjenning. Ingen scraping som bryter vilkår.
- Språk i UI og innhold: norsk bokmål, jordnært og konkret. Ingen generisk AI-SEO-tekst.

## Kommandoer
`npm run dev` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run db:test` · `SITE_INDEXABLE=true npm run build && npm run test:e2e`
