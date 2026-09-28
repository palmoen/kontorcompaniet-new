#!/usr/bin/env python3
"""
Bygger forslag til redirect-kart (OLD → NEW → ACTION) fra url-inventar.csv + produkter.csv.

Alle beslutninger ligger som eksplisitte regler/tabeller under, slik at de kan gjennomgås og
endres uten å røre logikken. Kolonnen `gsc_klikk_16m` og `backlinks` fylles når Search Console
og lenkedata kobles inn — da prioriteres manuell verifisering etter faktisk verdi.

Handlinger:
  KEEP    URL beholdes uendret på ny plattform (200)
  301     Permanent redirect 1:1 til tilsvarende side
  MERGE   Flere gamle URL-er slås sammen til én ny (301 fra alle)
  410     Fjernet uten relevant erstatning
  AVVENTER  Firmagaver: mål-URL avventer MerchMaker-struktur (A/B/C-forslag i egen kolonne)

Bruk: python3 tools/audit/build_redirect_map.py docs/migration/crawl-2026-09-28
"""
from __future__ import annotations

import csv
import re
import sys
import urllib.parse as up
from pathlib import Path

BASE = "https://kontorcompaniet.no"

# ---------------------------------------------------------------------------
# Produkter: sammenslåing av størrelses-/duplikatvarianter og slug-rydding.
# Alt som ikke står her beholdes som /produkt/{slug} (KEEP).
# ---------------------------------------------------------------------------
PRODUCT_TARGET: dict[str, tuple[str, str, str]] = {}  # old_slug -> (new_slug, action, begrunnelse)


def merge(new_slug: str, olds: list[str], why: str):
    for o in olds:
        PRODUCT_TARGET[o] = (new_slug, "KEEP" if o == new_slug else "MERGE", why)


merge("dencon-hev-senk-skrivebord", ["dencon-skrivebord-120x80-cm", "dencon-skrivebord-140x80-cm", "dencon-skrivebord-160x80-cm"],
      "Størrelser blir varianter. Gammel slug sa ikke hev/senk.")
merge("dencon-skrivebord-fast-hoyde", ["dencon-skrivebord-120x80-cm-2", "dencon-skrivebord-fast-hoyde-140x80-cm", "dencon-skrivebord-140x80-cm-2"],
      "Størrelser blir varianter. NB: slug ...140x80-cm-2 er i dag produktet 160×80 (feil slug).")
merge("dencon-delta-konferansebord", [f"dencon-delta-konferansebord-{s}-cm" for s in ("140x80", "160x80", "180x80", "180x90", "200x100", "220x100")],
      "Seks størrelser → ett produkt med varianter")
merge("dencon-skap", ["dencon-skap", "dencon-skap-3xa4", "dencon-skap-4xa4"], "Høyder (2/3/4×A4) blir varianter. Beholder eksisterende basis-slug.")
merge("dencon-uttrekksskap", ["dencon-utrekksskap-2xa4", "dencon-uttrekksskap-3xa4"], "Varianter + rettet skrivefeil i slug (utrekk→uttrekk)")
merge("abstracta-soneo-bordskjerm", [f"abstracta-soneo-bordskjerm-{w}x650x30-mm" for w in (1200, 1400, 1600)], "Bredder blir varianter")
merge("fora-form-kvart-motebord", ["fora-form-kvart-motebord-240x120", "fora-form-kvart-motebord-240x120-2", "fora-form-kvart-motebord-260x120"],
      "Duplikat (-2) + størrelser blir varianter")
merge("fora-form-senso-hoy", ["fora-form-senso-2-seter-hoy", "fora-form-senso-3-seter-hoy"], "2- og 3-seter som varianter (VURDER: egne sider hvis GSC viser separat søkeverdi)")
merge("muuto-outline-3-seter", ["muuto-outline-3-seter", "muuto-outline-3-seter-2", "muuto-outline-3-seter-3"], "Tre identiske titler → én side, tekstil/ben som varianter")
merge("vitra-id-trim", ["vitra-id-trim", "vitra-id-trim-kopi"], "«-kopi» er duplikat")
merge("hag-sofi-mesh-7500", ["hag-sofi-mesh-7500-2"], "Rydd bort -2-suffiks (basis-slug finnes ikke i dag)")
merge("evoline-express", ["evoline-express-2xel-klikksystem", "evoline-express-3xschuko-klikksystem", "evoline-express-4xel-klikksystem"], "Antall uttak blir varianter")
merge("evoline-rj45-cat6-kabel", ["evoline-rj45-cat6-utp-3m-gra", "evoline-rj45-cat6-utp-5m-gra", "evoline-rj45-cat6-utp-75m-gra"], "Lengder blir varianter")
merge("evoline-skjotekabel", ["evoline-skjotekabel-1m", "evoline-skjotekabel-25m", "evoline-skjotekabel-3m"], "Lengder blir varianter")
merge("evoline-tilforselskabel", ["evoline-tilforselskabel-1m-sort", "evoline-tilforselskabel-2m-sort", "evoline-tilforselskabel-3m-sort"], "Lengder blir varianter")

PRODUCT_REVIEW = {
    "vitra-physix-konferansestol": "Egen modell eller duplikat av vitra-physix? Avklar før lansering.",
    "evoline-matafix-kabelsamler-20m": "Produktnavn stavet «Matafix» – verifiser mot produsent (Metafix?) før evt. slug-endring.",
    "fora-form-senso-2-seter-hoy": "Sammenslåing 2/3-seter – bekreft.",
    "fora-form-senso-3-seter-hoy": "Sammenslåing 2/3-seter – bekreft.",
}

# Brukt/utstillingsvarer: unike fysiske varer, ikke modellsider.
USED_SLUGS = {"fora-form-senso-3-seter-hoy-pent-brukt", "horreds-mute-focus-high-utstillingsprodukt",
              "horreds-mute-focus-low-utstillingsprodukt", "horreds-mute-focus-low-utstillingsprodukt-2"}

# Kjente produkt-URL-er som allerede er borte (fra Googles indeks)
GONE_PRODUCTS = {
    "sedus-seflex": ("/merkevarer/sedus", "301", "Produktet er fjernet (404 i dag). Sedus føres fortsatt – merkeside er nærmeste relevante mål."),
}

# ---------------------------------------------------------------------------
# Kategorier, merker, sider, arkiver
# ---------------------------------------------------------------------------
EXACT: dict[str, tuple[str, str, str]] = {
    # sider
    "/": ("/", "KEEP", "Forside"),
    "/om-oss/": ("/om-oss", "KEEP", "Samme innholdsformål. Ny URL uten avsluttende skråstrek (301 fra variant)."),
    "/om-oss/kontakt/": ("/kontakt", "301", "Kontakt flyttes til toppnivå"),
    "/kontakt/": ("/kontakt", "301", "Eksisterende 301 i dag – beholdes til nytt mål (ingen kjede)"),
    "/kontakt": ("/kontakt", "KEEP", ""),
    "/prosjekter/": ("/prosjekter", "KEEP", "Samme URL – nå med ekte prosjektsider under"),
    "/produkterogtjenester/": ("/losninger", "301", "Tjenesteinnhold splittes til løsningssider; hub er nærmeste mål"),
    "/produkter": ("/produkter", "KEEP", "I dag 301 → /produkterogtjenester/. Blir ekte side."),
    "/miljo-baerekraft/": ("/baerekraft", "301", "Miljøfyrtårn, Grønt Punkt, miljømerking – eget tema"),
    "/leverandorer/": ("/merkevarer", "301", "Leverandøroversikt blir merkevarehub"),
    "/butikk/": ("/produkter", "301", "Nettbutikk-hub → produkthub"),
    "/butikk": ("/produkter", "301", ""),
    "/butikk/vilkar-nettbutikk/": ("/salgsbetingelser", "MERGE", "To vilkårssider slås sammen"),
    "/kjopsbetingelsene/": ("/salgsbetingelser", "MERGE", "To vilkårssider slås sammen"),
    "/sikkerhet-og-personvern/": ("/personvern", "301", ""),
    "/cookies/": ("/informasjonskapsler", "301", ""),
    "/cookies": ("/informasjonskapsler", "301", ""),
    "/designer/": ("/merkevarer/vitra", "301", "Siden handler kun om Charles & Ray Eames / Vitra"),
    # innlegg
    "/ergonomi-pa-arbeidsplassen/": ("/inspirasjon/ergonomi-pa-arbeidsplassen", "301", "Oppdateres (2020-tekst) og kobles til /losninger/ergonomi"),
    "/forstyrrende-stoy-og-darlig-akustikk-pa-arbeidsplassen-kan-forarsake-stress/":
        ("/inspirasjon/stoy-og-akustikk-pa-kontoret", "301", "Oppdateres og kobles til /losninger/akustikk"),
    "/framerykampanje/": ("/losninger/stillerom", "301", "Utløpt kampanje (2020) om Framery stillerom – løsningssiden er relevant mål"),
    "/prosjekt-norwegian/": ("/prosjekter/norwegian-fornebu", "301", "Blir fullverdig prosjektside (750 arbeidsplasser, 4 filmer)"),
    "/?page_id=46": ("/inspirasjon", "301", "Gammel bloggside"),
    "/category/uncategorized/": ("/inspirasjon", "301", "Innleggsarkiv"),
    "/author/heiadseo-no/": (None, "410", "Forfatterarkiv for byrå – ingen verdi"),
    # kategorier
    "/produktkategori/kontorstoler/": ("/produkter/kontorstoler", "301", ""),
    "/produktkategori/arbeidsplassen/kontorstoler/": ("/produkter/kontorstoler", "301", "Duplikat av kategori (identisk innhold)"),
    "/butikk/kategori/kontorstoler/": ("/produkter/kontorstoler", "301", "Duplikat av kategori"),
    "/produktkategori/moteromsstoler/": ("/produkter/moteromsstoler", "301", ""),
    "/produktkategori/stoler/": ("/produkter/kantinestoler", "301", "Innhold i dag = kantine-/besøksstoler (Eames, Celi, Noor, AAC, City). Bekreft navn."),
    "/produktkategori/motebord/": ("/produkter/motebord", "301", ""),
    "/produktkategori/motebord/komponenter-motebord/": ("/produkter/motebord", "301", "404 i dag, men i Googles indeks"),
    "/produktkategori/skrivebord/": ("/produkter/skrivebord", "301", "404 i dag, men i Googles indeks"),
    "/produktkategori/arbeidsplassen/skrivebord/": ("/produkter/skrivebord", "301", "404 i dag, men i Googles indeks"),
    "/produktkategori/skrivebord-el-hev-senk/": ("/produkter/skrivebord", "MERGE", "Hev/senk dekkes på skrivebordssiden til sortimentet forsvarer egen underkategori"),
    "/produktkategori/skrivebord-fast-understell/": ("/produkter/skrivebord", "MERGE", ""),
    "/produktkategori/komponenter/": ("/produkter/skrivebord", "MERGE", "Bordplater/understell/kabelrenner – del av skrivebord"),
    "/produktkategori/skrivebord/komponenter/": ("/produkter/skrivebord", "MERGE", "Duplikat av komponenter"),
    "/produktkategori/skrivebord-tilbehor/": ("/produkter/tilbehor", "301", "Evoline strøm/kabel"),
    "/produktkategori/bordskjermer/": ("/produkter/akustikk", "MERGE", "Bordskjermer blir filter under akustikk"),
    "/produktkategori/arbeidsplassen/bordskjermer/": ("/produkter/akustikk", "MERGE", "Duplikat"),
    "/produktkategori/oppbevaring/": ("/produkter/oppbevaring", "301", ""),
    "/produktkategori/loungestoler/": ("/produkter/sofa-og-lounge", "MERGE", ""),
    "/produktkategori/sofa/": ("/produkter/sofa-og-lounge", "MERGE", ""),
    "/produktkategori/brands/": ("/merkevarer", "301", ""),
    # brukt
    "/produktkategori/brukte-mobler/": ("/brukt", "301", "Bruktlager – kobles til Møbelscout"),
    "/produkt-stikkord/pent-brukt/": ("/brukt", "301", ""),
    "/produkt-stikkord/utstillingsvare/": ("/brukt", "301", "Utstillingsvarer selges via bruktsiden"),
    "/product-brands/ombruk/": ("/brukt", "301", ""),
    "/produkt-stikkord/miljo/": ("/baerekraft", "301", "Tag med 1 produkt"),
    "/product-brands/express/": ("/merkevarer/evoline", "301", "YITH-merke «Express» = Evoline Express-produkter"),
    # attributt-arkiver
    "/epd/ja/": ("/baerekraft", "301", "Forklaring av EPD hører hjemme på bærekraftsiden"),
    "/miljomerking/fsc/": ("/baerekraft", "301", ""),
    "/miljomerking/greenguard/": ("/baerekraft", "301", ""),
    "/miljomerking/mobelfakta/": ("/baerekraft", "301", ""),
    "/opprinnelsesland/norge/": (None, "410", "Tynt fasettarkiv. VURDER egen side «norskproduserte kontormøbler» hvis GSC viser visninger."),
}
for land in ("danmark", "polen", "sveits", "sverige", "tyskland"):
    EXACT[f"/opprinnelsesland/{land}/"] = (None, "410", "Tynt fasettarkiv uten søkeintensjon")
for lt in ("bestillingsvare-2-3-uker", "bestillingsvare-3-5-uker", "bestillingsvare-4-6-uker", "bestillingsvare-5-7-uker",
           "bestillingsvare-6-8-uker", "lagerfort-3-5-dager"):
    EXACT[f"/leveringstid/{lt}/"] = (None, "410", "Leveringstid-arkiv har ingen søkeintensjon")

# Designer-arkiver: 1:1 til produktet når arkivet bare har ett produkt/én familie, ellers merke
DESIGNER = {
    "alberto-meda": "/produkt/vitra-physix",
    "andersen-og-voll": "/merkevarer/fora-form",
    "andreas-engelsvik": "/produkt/fogia-bollo",
    "antonio-cittero": "/produkt/vitra-id-trim",
    "big-game-hunting-narud-anderssen-voll-and-flokk-design-team": "/produkt/hag-celi-9100",
    "eames": "/merkevarer/vitra",
    "hee-welling": "/produkt/hay-about-a-chair-222",
    "lars-tornoe": "/produkt/fora-form-kvart-motebord",
    "oivind-iversen": "/produkt/fora-form-city-4-ben",
    "peter-opsvik": "/produkt/hag-creed-6006-kontorstol",
    "ronan-erwan-bouroullec": "/produkt/vitra-physix-konferansestol",
    "skogstadwaernes": "/produkt/fora-form-bud-unite-konferansestol",
    "stokkeaustad-form-us-with-love-gronlund-design-and-flokk-design-team": "/produkt/profim-noor-6050",
    "svein-asbjornsen-sapdesign": "/merkevarer/hag",
}
for d, tgt in DESIGNER.items():
    EXACT[f"/designer/{d}/"] = (tgt, "301", "Designer-arkiv → eneste relevante produkt/merke")

SYSTEM_410 = re.compile(r"^/(handlekurv|kassen|min-konto|min-onskeliste|registrer|registration(-2)?|customer-[a-z-]+|rentmy-[a-z-]+|elementor-hf/[a-z]+)/?$")

# Firmagaver: forslag A/B/C. Mål-URL settes når MerchMaker-strukturen er klar.
GIFT_CATEGORY_HINT = [
    (re.compile(r"paskeegg|gullegg|paske|olasekken-med-paskegodt|taskeladden"), "Påskegaver"),
    (re.compile(r"spekemat|speke|italienske-smaker|kortreist"), "Mat- og delikatessegaver"),
    (re.compile(r"olasekken|kjolebag|kjolesekken"), "Sommer/utendørs (kjølebag)"),
    (re.compile(r"rituals"), "Velvære (Rituals)"),
    (re.compile(r"pizzapose"), "Matgaver"),
]


def gift_proposal(path: str) -> tuple[str, str]:
    if path.startswith("/produktkategori/firmagaver/paskegaver"):
        return "B", "MerchMaker-kategori: Påskegaver"
    if path.startswith("/produktkategori/firmagaver/strand-og-piknikk"):
        return "B", "MerchMaker-kategori: Sommergaver / strand og piknik"
    if path.startswith("/produktkategori/firmagaver"):
        return "B", "MerchMaker-kategori: Firmagaver (tilsvarende kategori – ikke forside)"
    if path.startswith("/produktkategori/rituals"):
        return "B", "MerchMaker-kategori: Velvære / Rituals"
    slug = path.strip("/").split("/")[-1]
    for rx, cat in GIFT_CATEGORY_HINT:
        if rx.search(slug):
            return "A→B", f"A hvis identisk produkt finnes i MerchMaker, ellers B: {cat}"
    return "C", "410 hvis ingen relevant kategori finnes"


def main():
    d = Path(sys.argv[1])
    inv = list(csv.DictReader((d / "url-inventar.csv").open()))
    prods = {r["slug"]: r for r in csv.DictReader((d / "produkter.csv").open())}
    extra_known = [
        # Fra Googles indeks (første analyse) – ikke lenger lenket/i sitemap
        "https://kontorcompaniet.no/produkt/trond-mois-pizzapose-spesial/",
        "https://kontorcompaniet.no/produkt/sedus-seflex/",
    ]
    seen = {r["url"] for r in inv}
    for u in extra_known:
        if u not in seen:
            inv.append({"url": u, "type": "produkt", "status": "404", "i_sitemap": "nei", "interne_innlenker": "0", "indekserbar": "nei"})

    out = []
    for r in inv:
        url = r["url"]
        p = up.urlsplit(url)
        path = p.path + (("?" + p.query) if p.query else "")
        typ, status = r["type"], r["status"]
        new, action, why, review, gift_opt = None, None, "", "", ""

        if path in EXACT:
            new, action, why = EXACT[path]
        elif typ == "firmagave":
            opt, hint = gift_proposal(p.path)
            new, action, why, gift_opt = None, "AVVENTER", hint, opt
        elif p.path.startswith("/produkt/"):
            slug = p.path.strip("/").split("/")[1]
            if slug in GONE_PRODUCTS:
                new, action, why = GONE_PRODUCTS[slug]
            elif "pizzapose" in slug:
                opt, hint = gift_proposal(p.path)
                new, action, why, gift_opt = None, "AVVENTER", "Firmagave, 404 i dag. " + hint, opt
            elif slug in USED_SLUGS:
                new, action = "/brukt", "301"
                why = "Unik bruktvare. Hvis fortsatt tilgjengelig ved lansering: 301 til /brukt/{slug}, ellers /brukt"
                review = "Sjekk lagerstatus ved lansering"
            elif slug in PRODUCT_TARGET:
                ns, action, why = PRODUCT_TARGET[slug]
                new = f"/produkt/{ns}"
            else:
                new, action, why = f"/produkt/{slug}", "KEEP", "Hovedregel: behold /produkt/{slug}"
            review = review or PRODUCT_REVIEW.get(slug, "")
            if str(status) == "500":
                why += " · NB: svarer HTTP 500 i dag – bør fikses på dagens side nå"
        elif p.path.startswith("/produktkategori/brands/"):
            b = p.path.strip("/").split("/")[-1]
            new, action, why = f"/merkevarer/{b}", "301", "Merkearkiv → merkevareside"
        elif re.match(r"^/\d{4}/\d{2}/\d{2}/$", p.path):
            new, action, why = "/inspirasjon", "301", "Datoarkiv med ett innlegg"
        elif p.query.startswith("jet-woo-builder"):
            new, action, why = None, "410", "Intern malside (JetWoo) eksponert i sitemap"
        elif SYSTEM_410.match(p.path):
            new, action, why = None, "410", "System-/plugin-side (handlekurv, konto, RentMy, maler) – ingen erstatning"
        else:
            new, action, why, review = None, "UAVKLART", "Ingen regel – må vurderes manuelt", "JA"

        out.append({
            "old_url": url,
            "type": typ,
            "status_i_dag": status,
            "i_sitemap": r.get("i_sitemap", ""),
            "interne_innlenker": r.get("interne_innlenker", ""),
            "action": action,
            "new_url": (BASE + new) if new else "",
            "firmagave_forslag": gift_opt,
            "begrunnelse": why,
            "manuell_sjekk": review,
            "gsc_klikk_16m": "",
            "backlinks": "",
        })

    # Mønsterregler (gjelder alle URL-er, ikke egne rader)
    rules = [
        {"old_url": "MØNSTER: *?add-to-cart=*", "type": "parameter", "status_i_dag": "200 (3 656 lenker funnet)", "action": "301",
         "new_url": "(samme sti uten parameter → deretter regelen for stien, i ett hopp)",
         "begrunnelse": "Handlekurv-parametere. Blokkert i robots.txt i dag, men lenket fra alle produktlister."},
        {"old_url": "MØNSTER: www.kontorcompaniet.no/*", "type": "vertsnavn", "status_i_dag": "301", "action": "301",
         "new_url": "https://kontorcompaniet.no/* (direkte til endelig mål)", "begrunnelse": "Behold dagens kanoniske vertsnavn uten www"},
        {"old_url": "MØNSTER: http://*", "type": "protokoll", "status_i_dag": "", "action": "301", "new_url": "https://… (direkte til endelig mål)",
         "begrunnelse": "Ett hopp, ingen kjede"},
        {"old_url": "MØNSTER: avsluttende skråstrek", "type": "normalisering", "status_i_dag": "", "action": "301",
         "new_url": "Ny plattform bruker URL-er uten avsluttende /; /x/ → /x i samme hopp som evt. mål-redirect",
         "begrunnelse": "Unngå kjeder: gamle URL-er slås opp med og uten /"},
    ]
    for rr in rules:
        rr.update({k: "" for k in out[0] if k not in rr})

    order = {"KEEP": 0, "301": 1, "MERGE": 2, "410": 3, "AVVENTER": 4, "UAVKLART": 5}
    out.sort(key=lambda x: (order.get(x["action"], 9), x["type"], x["old_url"]))
    with (d.parent / "redirect-map.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(rules + out)

    import collections
    print(collections.Counter(o["action"] for o in out))
    print(collections.Counter((o["type"], o["action"]) for o in out))
    for o in out:
        if o["action"] == "UAVKLART":
            print("UAVKLART", o["old_url"])


if __name__ == "__main__":
    main()
