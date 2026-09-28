#!/usr/bin/env python3
"""
Høflig SEO-crawl av eksisterende kontorcompaniet.no.

- Respekterer robots.txt, maks ~4 samtidige forespørsler, fast User-Agent.
- Følger IKKE redirects automatisk: hver hopp registreres (kjeder, mål, status).
- Leser alle Yoast-sitemaps og sammenligner mot det som faktisk finnes via interne lenker.
- Henter i tillegg strukturerte data fra de offentlige WordPress/WooCommerce REST-API-ene.

Bruk:  python3 tools/audit/crawl.py --out docs/migration/crawl
Krever: beautifulsoup4, lxml (pip install beautifulsoup4 lxml)
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import hashlib
import json
import re
import sys
import threading
import time
import urllib.parse as up
import urllib.robotparser as rp
from collections import deque
from pathlib import Path

import requests
from bs4 import BeautifulSoup

HOST = "kontorcompaniet.no"
BASE = f"https://{HOST}"
UA = "Mozilla/5.0 (compatible; KontorcompanietSEOAudit/1.0; +https://kontorcompaniet.no)"
MAX_PAGES = 6000
WORKERS = 4
DELAY = 0.25  # sekunder per worker mellom forespørsler

# Parametere som aldri gir unike sider (logges, men crawles ikke videre)
IGNORED_PARAMS = {"add-to-cart", "orderby", "paged", "product-page", "min_price", "max_price",
                  "rating_filter", "filter_", "query_type_", "s", "replytocom", "_wpnonce"}
SKIP_PATH_PREFIXES = ("/wp-admin", "/wp-login", "/wp-json", "/feed", "/xmlrpc", "/cart", "/handlekurv",
                      "/kasse", "/checkout", "/min-konto", "/my-account", "/wp-content", "/wp-includes")
ASSET_EXT = re.compile(r"\.(jpe?g|png|gif|webp|avif|svg|pdf|zip|mp4|webm|css|js|ico|woff2?|ttf|xml|docx?|xlsx?)$", re.I)

session = requests.Session()
session.headers.update({"User-Agent": UA, "Accept-Language": "nb-NO,nb;q=0.9"})
robots = rp.RobotFileParser(BASE + "/robots.txt")
robots.read()


def normalize(url: str, base: str | None = None) -> str | None:
    if base:
        url = up.urljoin(base, url)
    p = up.urlsplit(url.strip())
    if p.scheme not in ("http", "https"):
        return None
    host = p.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return up.urlunsplit(("https" if host == HOST else p.scheme, host, p.path or "/", p.query, ""))


def is_internal(url: str) -> bool:
    return up.urlsplit(url).netloc == HOST


def crawlable(url: str) -> bool:
    p = up.urlsplit(url)
    if not is_internal(url) or ASSET_EXT.search(p.path):
        return False
    if p.path.startswith(SKIP_PATH_PREFIXES):
        return False
    if p.query:
        keys = {k for k, _ in up.parse_qsl(p.query, keep_blank_values=True)}
        if any(k in IGNORED_PARAMS or any(k.startswith(i) for i in IGNORED_PARAMS if i.endswith("_")) for k in keys):
            return False
    return robots.can_fetch(UA, url)


def fetch(url: str, method: str = "GET"):
    for attempt in range(3):
        try:
            r = session.request(method, url, allow_redirects=False, timeout=30)
            if r.status_code in (429, 503):
                time.sleep(5 * (attempt + 1))
                continue
            return r
        except requests.RequestException as e:  # noqa: PERF203
            err = e
            time.sleep(2 * (attempt + 1))
    return err  # type: ignore[possibly-undefined]


def resolve_chain(url: str, max_hops: int = 10):
    chain, cur = [], url
    for _ in range(max_hops):
        r = fetch(cur)
        if isinstance(r, Exception):
            chain.append({"url": cur, "status": "error", "error": str(r)})
            return chain, None
        chain.append({"url": cur, "status": r.status_code})
        if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
            nxt = normalize(r.headers["location"], cur)
            if nxt is None or nxt in [c["url"] for c in chain]:
                chain.append({"url": nxt, "status": "loop"})
                return chain, None
            cur = nxt
            continue
        return chain, r
    return chain, None


def text_of(el) -> str:
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)) if el else ""


def parse_page(url: str, r: requests.Response) -> dict:
    soup = BeautifulSoup(r.content, "lxml")
    head = soup.head or soup

    def meta(name=None, prop=None):
        el = head.find("meta", attrs={"name": name} if name else {"property": prop})
        return el.get("content", "").strip() if el else None

    canonical = head.find("link", rel="canonical")
    jsonld_types, jsonld_raw = [], []
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(s.string or "")
        except Exception:  # noqa: BLE001
            jsonld_types.append("INVALID_JSON")
            continue
        jsonld_raw.append(data)
        stack = [data]
        while stack:
            d = stack.pop()
            if isinstance(d, list):
                stack.extend(d)
            elif isinstance(d, dict):
                if "@type" in d:
                    t = d["@type"]
                    jsonld_types.extend(t if isinstance(t, list) else [t])
                stack.extend(v for k, v in d.items() if k == "@graph")

    # Hovedinnhold: fjern header/footer/nav for ordtelling og duplikatsjekk
    body = soup.body or soup
    for tag in body.find_all(["script", "style", "noscript", "svg"]):
        tag.decompose()
    main = body.find("main") or body
    main_copy = BeautifulSoup(str(main), "lxml")
    for tag in main_copy.find_all(["header", "footer", "nav"]):
        tag.decompose()
    for tag in main_copy.select('[data-elementor-type="header"], [data-elementor-type="footer"], .elementor-location-header, .elementor-location-footer'):
        tag.decompose()
    main_text = text_of(main_copy)
    words = len(main_text.split())

    links = []
    for a in body.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        n = normalize(href, url)
        if n:
            links.append({"href": n, "text": text_of(a)[:120], "rel": " ".join(a.get("rel", []))})

    images = []
    for img in body.find_all("img"):
        src = img.get("data-src") or img.get("data-lazy-src") or img.get("src") or ""
        if src.startswith("data:"):
            src = img.get("data-src") or ""
        if not src:
            continue
        images.append({
            "src": normalize(src, url),
            "alt": img.get("alt"),
            "width": img.get("width"),
            "height": img.get("height"),
            "loading": img.get("loading"),
        })

    return {
        "title": text_of(head.find("title")),
        "meta_description": meta("description"),
        "meta_robots": meta("robots"),
        "x_robots_tag": r.headers.get("x-robots-tag"),
        "canonical": normalize(canonical["href"], url) if canonical and canonical.get("href") else None,
        "og_title": meta(prop="og:title"),
        "og_description": meta(prop="og:description"),
        "og_image": meta(prop="og:image"),
        "og_type": meta(prop="og:type"),
        "twitter_card": meta("twitter:card"),
        "html_lang": (soup.html.get("lang") if soup.html else None),
        "h1": [text_of(h) for h in body.find_all("h1")],
        "h2": [text_of(h) for h in body.find_all("h2")][:30],
        "h3_count": len(body.find_all("h3")),
        "headings_order": [h.name for h in body.find_all(re.compile(r"^h[1-6]$"))][:80],
        "word_count": words,
        "content_hash": hashlib.sha1(main_text.lower().encode()).hexdigest(),
        "content_excerpt": main_text[:600],
        "jsonld_types": sorted(set(jsonld_types)),
        "jsonld": jsonld_raw,
        "links": links,
        "images": images,
        "body_classes": (soup.body.get("class") if soup.body else []) or [],
        "html_bytes": len(r.content),
        "generator": meta("generator"),
    }


def load_sitemaps() -> dict[str, dict]:
    urls: dict[str, dict] = {}
    idx = fetch(BASE + "/sitemap_index.xml")
    subs = re.findall(r"<loc>([^<]+)</loc>", idx.text)
    for sm in subs:
        r = fetch(sm)
        name = sm.rsplit("/", 1)[-1]
        if isinstance(r, Exception) or r.status_code != 200:
            print(f"  ! sitemap {name}: {getattr(r, 'status_code', r)}", file=sys.stderr)
            continue
        for block in re.findall(r"<url>(.*?)</url>", r.text, re.S):
            loc = re.search(r"<loc>([^<]+)</loc>", block)
            lm = re.search(r"<lastmod>([^<]+)</lastmod>", block)
            imgs = len(re.findall(r"<image:image>", block))
            if loc:
                n = normalize(loc.group(1).strip())
                urls[n] = {"sitemap": name, "lastmod": lm.group(1) if lm else None, "sitemap_images": imgs}
    return urls


def crawl(out: Path, extra_seeds: list[str]):
    out.mkdir(parents=True, exist_ok=True)
    print("Leser sitemaps …")
    sitemap = load_sitemaps()
    (out / "sitemap_urls.json").write_text(json.dumps(sitemap, ensure_ascii=False, indent=1))
    print(f"  {len(sitemap)} URL-er i sitemaps")

    seeds = [BASE + "/"] + list(sitemap) + extra_seeds
    seen: set[str] = set()
    queue: deque[tuple[str, str | None, int]] = deque()
    for s in seeds:
        n = normalize(s)
        if n and n not in seen:
            seen.add(n)
            queue.append((n, "seed", 0))

    pages: dict[str, dict] = {}
    inlinks: dict[str, list[dict]] = {}
    param_urls: dict[str, int] = {}
    external: dict[str, int] = {}
    lock = threading.Lock()

    def work(item):
        url, src, depth = item
        time.sleep(DELAY)
        chain, final = resolve_chain(url)
        rec = {"url": url, "found_via": src, "depth": depth, "chain": chain,
               "status": chain[0]["status"] if chain else "error",
               "final_url": chain[-1]["url"] if chain else None,
               "final_status": chain[-1]["status"] if chain else None,
               "redirect_hops": max(0, len(chain) - 1)}
        if final is not None and final.status_code == 200 and "text/html" in final.headers.get("content-type", ""):
            if len(chain) == 1:  # kun parse sider som svarer 200 direkte
                rec.update(parse_page(url, final))
            rec["content_type"] = final.headers.get("content-type")
            rec["last_modified"] = final.headers.get("last-modified")
        elif final is not None:
            rec["content_type"] = final.headers.get("content-type")
        return rec

    with cf.ThreadPoolExecutor(WORKERS) as ex:
        futures = {}
        while queue or futures:
            while queue and len(futures) < WORKERS * 2 and len(pages) + len(futures) < MAX_PAGES:
                item = queue.popleft()
                futures[ex.submit(work, item)] = item
            if not futures:
                break
            done, _ = cf.wait(futures, return_when=cf.FIRST_COMPLETED)
            for f in done:
                item = futures.pop(f)
                rec = f.result()
                pages[rec["url"]] = rec
                for l in rec.get("links", []):
                    h = l["href"]
                    with lock:
                        inlinks.setdefault(h, []).append({"from": rec["url"], "text": l["text"]})
                    if not is_internal(h):
                        external[h] = external.get(h, 0) + 1
                        continue
                    if up.urlsplit(h).query and not crawlable(h):
                        param_urls[h] = param_urls.get(h, 0) + 1
                        continue
                    if h not in seen and crawlable(h):
                        seen.add(h)
                        queue.append((h, rec["url"], item[2] + 1))
                # Redirect-mål skal også crawles
                fu = rec.get("final_url")
                if fu and fu not in seen and is_internal(fu) and crawlable(fu):
                    seen.add(fu)
                    queue.append((fu, rec["url"] + " (redirect)", item[2]))
                if len(pages) % 50 == 0:
                    print(f"  crawlet {len(pages)} · kø {len(queue)}", flush=True)

    (out / "pages.json").write_text(json.dumps(pages, ensure_ascii=False, indent=1))
    (out / "inlinks.json").write_text(json.dumps(inlinks, ensure_ascii=False))
    (out / "param_urls.json").write_text(json.dumps(param_urls, ensure_ascii=False, indent=1))
    (out / "external_links.json").write_text(json.dumps(external, ensure_ascii=False, indent=1))
    print(f"Ferdig: {len(pages)} URL-er crawlet")


def check_images(out: Path):
    pages = json.loads((out / "pages.json").read_text())
    imgs = sorted({i["src"] for p in pages.values() for i in p.get("images", []) if i.get("src")})
    print(f"Sjekker {len(imgs)} unike bilder (HEAD) …")
    res = {}

    def head(u):
        time.sleep(DELAY)
        r = fetch(u, "HEAD")
        if isinstance(r, Exception):
            return u, {"status": "error"}
        return u, {"status": r.status_code, "type": r.headers.get("content-type"),
                   "bytes": int(r.headers.get("content-length") or 0)}

    with cf.ThreadPoolExecutor(WORKERS) as ex:
        for u, v in ex.map(head, imgs):
            res[u] = v
    (out / "images.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))


def fetch_rest(out: Path):
    """Strukturerte data fra offentlige WP/Woo-API-er (ingen autentisering)."""
    def paged(path, per=100):
        items, page = [], 1
        while True:
            sep = "&" if "?" in path else "?"
            r = session.get(f"{BASE}/wp-json/{path}{sep}per_page={per}&page={page}", timeout=60)
            if r.status_code != 200:
                break
            batch = r.json()
            if not batch:
                break
            items.extend(batch)
            if page >= int(r.headers.get("x-wp-totalpages", 1)):
                break
            page += 1
            time.sleep(DELAY)
        return items

    rest = {
        "products": paged("wc/store/v1/products"),
        "product_categories": paged("wc/store/v1/products/categories"),
        "product_brands": paged("wp/v2/product_brand"),
        "product_tags": paged("wp/v2/product_tag"),
        "attributes": session.get(f"{BASE}/wp-json/wc/store/v1/products/attributes", timeout=60).json(),
        "pages": paged("wp/v2/pages?_fields=id,link,slug,title,date,modified,parent,status,content"),
        "posts": paged("wp/v2/posts?_fields=id,link,slug,title,date,modified,categories,content"),
        "categories": paged("wp/v2/categories"),
        "tags": paged("wp/v2/tags"),
    }
    attr_terms = {}
    for a in rest["attributes"] if isinstance(rest["attributes"], list) else []:
        attr_terms[a["taxonomy"]] = paged(f"wc/store/v1/products/attributes/{a['id']}/terms")
    rest["attribute_terms"] = attr_terms
    (out / "rest.json").write_text(json.dumps(rest, ensure_ascii=False, indent=1))
    print("REST: " + ", ".join(f"{k}={len(v)}" for k, v in rest.items() if isinstance(v, (list, dict))))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="docs/migration/crawl")
    ap.add_argument("--seeds", help="Fil med ekstra URL-er (én per linje), f.eks. fra Googles indeks eller GSC")
    ap.add_argument("--skip-crawl", action="store_true")
    a = ap.parse_args()
    out = Path(a.out)
    extra = Path(a.seeds).read_text().split() if a.seeds else []
    if not a.skip_crawl:
        crawl(out, extra)
        check_images(out)
    fetch_rest(out)
