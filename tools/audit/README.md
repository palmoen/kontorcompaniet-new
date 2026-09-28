# SEO-audit av eksisterende kontorcompaniet.no

Skriptene kan kjøres på nytt. Kjør dem før lansering og etter at Search Console-data er koblet inn.

```bash
pip install beautifulsoup4 lxml requests
python3 tools/audit/crawl.py --out /tmp/kc-crawl --seeds ekstra-urler.txt   # ~5 min, høflig tempo
python3 tools/audit/analyze.py --raw /tmp/kc-crawl --out docs/migration/crawl-$(date +%F)
python3 tools/audit/build_redirect_map.py docs/migration/crawl-$(date +%F)
```

- `crawl.py`: leser alle Yoast-sitemaps, crawler interne lenker (følger robots.txt, maks 4 samtidige forespørsler), registrerer hvert redirect-hopp, sjekker bilder og henter WP/WooCommerce REST-data (produkter, kategorier, attributter, sider, innlegg). Rådata (~10 MB) skrives utenfor repoet.
- `analyze.py`: lager `url-inventar.csv`, `produkter.csv` og `oppsummering.json`.
- `build_redirect_map.py`: lager `docs/migration/redirect-map.csv`. Alle beslutninger ligger som tabeller øverst i filen.

Brukeragent: `KontorcompanietSEOAudit/1.0`.
