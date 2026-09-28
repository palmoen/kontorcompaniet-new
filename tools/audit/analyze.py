#!/usr/bin/env python3
"""
Analyserer output fra crawl.py og lager inventar/avviksfiler for migreringen.

Bruk:  python3 tools/audit/analyze.py --raw <crawl-mappe> --out docs/migration/crawl-2026-09-28
"""
from __future__ import annotations

import argparse
import collections
import csv
import html
import json
import re
import sys
import urllib.parse as up
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import crawl  # noqa: E402  (gjenbruker parse_page/fetch)

SYSTEM_SLUGS = ("handlekurv", "kassen", "min-konto", "min-onskeliste", "registrer", "registration",
                "customer-", "rentmy-", "elementor-hf", "author/")
ATTR_PREFIXES = ("/designer/", "/leveringstid/", "/opprinnelsesland/", "/miljomerking/", "/epd/")


def classify(url: str, gift_urls: set[str]) -> str:
    p = up.urlsplit(url)
    path, q = p.path, p.query
    if q.startswith("jet-woo-builder") or q.startswith("page_id"):
        return "system"
    if url in gift_urls or path.startswith("/produktkategori/firmagaver") or path.startswith("/produktkategori/rituals"):
        return "firmagave"
    if path == "/":
        return "forside"
    if path.startswith("/produkt/"):
        return "produkt"
    if path.startswith("/produktkategori/brands/"):
        return "merke"
    if path.startswith("/product-brands/"):
        return "merke (yith)"
    if path.startswith("/produktkategori/brukte-mobler") or path.startswith("/produkt-stikkord/pent-brukt"):
        return "brukt"
    if path.startswith("/produktkategori/") or path.startswith("/butikk/kategori/"):
        return "kategori"
    if path.startswith("/produkt-stikkord/"):
        return "produkt-tag"
    if path.startswith(ATTR_PREFIXES):
        return "attributt-arkiv"
    if re.match(r"^/\d{4}/", path) or path.startswith("/category/"):
        return "dato/kategori-arkiv"
    if any(s in path for s in SYSTEM_SLUGS):
        return "system"
    return "side"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    raw, out = Path(a.raw), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    P = json.loads((raw / "pages.json").read_text())
    SM = json.loads((raw / "sitemap_urls.json").read_text())
    INL = json.loads((raw / "inlinks.json").read_text())
    IMG = json.loads((raw / "images.json").read_text())
    PARAM = json.loads((raw / "param_urls.json").read_text())
    R = json.loads((raw / "rest.json").read_text())

    # Sider som svarer 5xx men likevel leverer full HTML: parse dem for innholdsaudit
    for url, p in P.items():
        if p["status"] == 500 and "title" not in p:
            r = crawl.fetch(url)
            if not isinstance(r, Exception) and "text/html" in r.headers.get("content-type", ""):
                p.update(crawl.parse_page(url, r))
                p["note"] = "HTTP 500 men HTML rendres"

    products = R["products"]
    gift_ids = {pr["id"] for pr in products if any(c["slug"] in ("firmagaver", "paskegaver", "rituals") for c in pr["categories"])}
    gift_urls = {crawl.normalize(pr["permalink"]) for pr in products if pr["id"] in gift_ids}

    html_pages = {u: p for u, p in P.items() if "title" in p}
    n_pages = len(html_pages)

    # Innlenker: unike kildesider, uten selvlenker
    inl_unique = {u: sorted({l["from"] for l in lst if l["from"] != u}) for u, lst in INL.items()}
    sitewide_threshold = 0.8 * n_pages

    title_cnt = collections.Counter(p["title"] for p in html_pages.values())
    desc_cnt = collections.Counter(p["meta_description"] for p in html_pages.values() if p.get("meta_description"))
    hash_groups = collections.defaultdict(list)
    for u, p in html_pages.items():
        hash_groups[p["content_hash"]].append(u)

    rows = []
    all_urls = set(P) | set(SM)
    for url in sorted(all_urls):
        p = P.get(url, {})
        typ = classify(url, gift_urls)
        issues = []
        status = p.get("status", "ikke crawlet")
        robots_meta = (p.get("meta_robots") or "").lower()
        canon = p.get("canonical")
        canon_state = "mangler" if "title" in p and not canon else ("self" if canon == url else ("annen" if canon else ""))
        indexable = status == 200 and "noindex" not in robots_meta and canon_state in ("self", "mangler")
        if status in (500, 404) or (isinstance(status, int) and status >= 400):
            issues.append(f"HTTP {status}")
        if url in SM and status != 200:
            issues.append("i sitemap men ikke 200")
        if url in SM and "noindex" in robots_meta:
            issues.append("i sitemap men noindex")
        if status == 200 and url not in SM and typ not in ("dato/kategori-arkiv",):
            issues.append("200 men ikke i sitemap")
        if typ == "system" and indexable:
            issues.append("systemside indekserbar")
        if canon_state == "annen":
            issues.append("canonical peker annet sted")
        if p.get("redirect_hops", 0) > 1:
            issues.append("redirect-kjede")
        if "title" in p:
            t = p["title"]
            if title_cnt[t] > 1:
                issues.append(f"duplikat title ×{title_cnt[t]}")
            if len(t) > 65:
                issues.append("title > 65 tegn")
            d = p.get("meta_description")
            if not d:
                issues.append("mangler meta description")
            elif desc_cnt[d] > 1:
                issues.append(f"duplikat description ×{desc_cnt[d]}")
            h1 = p.get("h1", [])
            if len(h1) == 0:
                issues.append("mangler H1")
            elif len(h1) > 1:
                issues.append(f"{len(h1)} H1")
            if h1 and h1[0].isupper() and len(h1[0]) > 12:
                issues.append("H1 i VERSALER")
            if len(hash_groups[p["content_hash"]]) > 1:
                issues.append(f"identisk innhold ×{len(hash_groups[p['content_hash']])}")
            if indexable and p.get("word_count", 0) < 150 and typ not in ("forside",):
                issues.append("tynt innhold (<150 ord)")
            miss_alt = sum(1 for i in p.get("images", []) if not (i.get("alt") or "").strip())
            if miss_alt:
                issues.append(f"{miss_alt} bilder uten alt")
        inl = inl_unique.get(url, [])
        if status == 200 and len(inl) == 0:
            issues.append("foreldreløs (ingen interne lenker inn)")
        rows.append({
            "url": url, "type": typ, "status": status,
            "final_url": p.get("final_url") if p.get("redirect_hops") else "",
            "redirect_hops": p.get("redirect_hops", ""),
            "i_sitemap": "ja" if url in SM else "nei",
            "sitemap": (SM.get(url) or {}).get("sitemap", ""),
            "lastmod": ((SM.get(url) or {}).get("lastmod") or "")[:10],
            "indekserbar": "ja" if indexable else "nei",
            "meta_robots": p.get("meta_robots") or "",
            "canonical": canon_state,
            "title": p.get("title", ""), "title_len": len(p.get("title", "")),
            "meta_description": p.get("meta_description") or "",
            "desc_len": len(p.get("meta_description") or ""),
            "h1": " | ".join(p.get("h1", [])), "h1_antall": len(p.get("h1", [])) if "title" in p else "",
            "ord": p.get("word_count", ""),
            "schema": " ".join(p.get("jsonld_types", [])),
            "interne_innlenker": len(inl),
            "bilder": len(p.get("images", [])),
            "bilder_uten_alt": sum(1 for i in p.get("images", []) if not (i.get("alt") or "").strip()),
            "dybde": p.get("depth", ""),
            "funnet_via": (p.get("found_via") or "")[:100],
            "avvik": "; ".join(issues),
        })

    with (out / "url-inventar.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    # ---------- Produkter ----------
    brand_cats = {c["id"]: html.unescape(c["name"]) for c in R["product_categories"] if c["parent"] == 140}
    prows = []
    name_groups = collections.defaultdict(list)
    for pr in products:
        cats = [c for c in pr["categories"]]
        brand = next((html.unescape(c["name"]) for c in cats if c["id"] in brand_cats), "")
        attrs = {a["taxonomy"]: ", ".join(t["name"] for t in a.get("terms", [])) for a in pr.get("attributes", [])}
        desc_txt = re.sub(r"<[^>]+>", " ", pr.get("description") or "")
        sdesc_txt = re.sub(r"<[^>]+>", " ", pr.get("short_description") or "")
        url = crawl.normalize(pr["permalink"])
        cp = P.get(url, {})
        segment = "firmagave" if pr["id"] in gift_ids else ("brukt" if any(c["slug"] == "brukte-mobler" for c in cats) else "kontor")
        # WP-duplikatsuffiks: -2..-9 som ikke er del av produktnavnet (modellnr. som «Celi 9100» teller ikke)
        m = re.search(r"-([2-9])$", pr["slug"])
        dup_suffix = bool(m) and not html.unescape(pr["name"]).rstrip().endswith(m.group(1))
        family = re.sub(r"\s*\d+(,\d+)?\s*[x×]\s*.*$|\s+\d+(,\d+)?\s*(m|cm)\b.*$", "",
                        html.unescape(pr["name"]), flags=re.I).strip().lower()
        name_groups[family].append(pr["slug"])
        prows.append({
            "id": pr["id"], "navn": html.unescape(pr["name"]), "slug": pr["slug"], "url": url,
            "http_status": cp.get("status", "ikke crawlet"),
            "segment": segment, "merke": brand,
            "kategorier": ", ".join(html.unescape(c["name"]) for c in cats if c["id"] not in brand_cats and c["id"] != 140),
            "type": pr["type"], "varianter": len(pr.get("variations", [])),
            "pris": pr["prices"]["price"], "sku": pr.get("sku", ""),
            "på_lager": pr.get("is_in_stock"),
            "bilder": len(pr.get("images", [])),
            "bilder_uten_alt": sum(1 for i in pr.get("images", []) if not (i.get("alt") or "").strip()),
            "beskrivelse_ord": len(desc_txt.split()), "kortbeskrivelse_ord": len(sdesc_txt.split()),
            "leveringstid": attrs.get("pa_leveringstid", ""), "miljomerking": attrs.get("pa_miljomerking", ""),
            "epd": attrs.get("pa_epd", ""), "garanti": attrs.get("pa_garanti", ""),
            "opprinnelsesland": attrs.get("pa_opprinnelsesland", ""), "designer": attrs.get("pa_designer", ""),
            "farge/tekstil": ", ".join(v for k, v in attrs.items() if k in ("pa_farge", "pa_tekstil", "pa_overflate")),
            "slug_suffiks": "ja" if dup_suffix else "",
            "produktfamilie": family,
            "interne_innlenker": len(inl_unique.get(url, [])),
            "title": cp.get("title", ""), "meta_description": cp.get("meta_description") or "",
            "schema": " ".join(cp.get("jsonld_types", [])),
        })
    for r in prows:
        r["familie_størrelse"] = len(name_groups[r["produktfamilie"]])
    with (out / "produkter.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(prows[0]))
        w.writeheader()
        w.writerows(sorted(prows, key=lambda r: (r["segment"], r["merke"], r["navn"])))

    # ---------- Parameter-URL-er ----------
    pkeys = collections.Counter()
    for u, n in PARAM.items():
        for k, _ in up.parse_qsl(up.urlsplit(u).query, keep_blank_values=True):
            pkeys[k] += 1

    # ---------- Bilder ----------
    img_status = collections.Counter(str(v.get("status")) for v in IMG.values())
    img_types = collections.Counter((v.get("type") or "?").split(";")[0] for v in IMG.values())
    big = sorted(((v.get("bytes") or 0, u) for u, v in IMG.items()), reverse=True)[:15]
    all_imgs = [i for p in html_pages.values() for i in p.get("images", [])]

    # ---------- Oppsummering ----------
    type_cnt = collections.Counter(r["type"] for r in rows)
    status_cnt = collections.Counter(str(r["status"]) for r in rows)
    issue_cnt = collections.Counter(re.sub(r"^\d+ (bilder uten alt|H1)$", r"N \1", i.split(" ×")[0])
                                    for r in rows for i in r["avvik"].split("; ") if i)
    schema_cnt = collections.Counter(t for p in html_pages.values() for t in p.get("jsonld_types", []))
    sitewide = sorted([u for u, s in inl_unique.items() if len(s) >= sitewide_threshold])
    summary = {
        "urls_total": len(rows), "html_parsed": n_pages, "sitemap_urls": len(SM),
        "types": type_cnt, "status": status_cnt, "issues": issue_cnt,
        "indexable": sum(1 for r in rows if r["indekserbar"] == "ja"),
        "schema_types": schema_cnt,
        "param_urls_found": len(PARAM), "param_keys": pkeys.most_common(15),
        "images_unique": len(IMG), "image_status": img_status, "image_types": img_types,
        "images_largest": big,
        "img_tags_total": len(all_imgs),
        "img_tags_missing_alt": sum(1 for i in all_imgs if not (i.get("alt") or "").strip()),
        "img_tags_no_dimensions": sum(1 for i in all_imgs if not i.get("width")),
        "sitewide_links": sitewide,
        "external_links": json.loads((raw / "external_links.json").read_text()),
        "products": {"total": len(products), "segments": collections.Counter(r["segment"] for r in prows),
                     "brands": collections.Counter(r["merke"] or "(ingen)" for r in prows if r["segment"] != "firmagave"),
                     "variable": sum(1 for r in prows if r["type"] == "variable"),
                     "no_image": sum(1 for r in prows if r["bilder"] == 0),
                     "desc_under_50_words": sum(1 for r in prows if r["beskrivelse_ord"] < 50),
                     "slug_suffix": [r["slug"] for r in prows if r["slug_suffiks"]],
                     "families_multi": {k: v for k, v in name_groups.items() if len(v) > 1},
                     "http_500": [r["slug"] for r in prows if r["http_status"] == 500]},
        "content_dupes": [v for v in hash_groups.values() if len(v) > 1],
        "title_dupes": {t: [u for u, p in html_pages.items() if p["title"] == t] for t, c in title_cnt.items() if c > 1},
    }
    (out / "oppsummering.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1, default=list))
    print(json.dumps(summary, ensure_ascii=False, indent=1, default=list)[:20000])


if __name__ == "__main__":
    main()
