#!/usr/bin/env python3
"""
Bygger forslag til redirect-kart (OLD → NEW → ACTION) fra url-inventar.csv + produkter.csv.

Alle beslutninger ligger som eksplisitte regler/tabeller under, slik at de kan gjennomgås og
endres uten å røre logikken. Kolonnen `gsc_klikk_16m` og `backlinks` fylles når Search Console
og lenkedata kobles inn — da prioriteres manuell verifisering etter faktisk verdi.

Handlinger (redirect):
  KEEP    URL beholdes uendret på ny plattform (200)
  301     Permanent redirect 1:1 til tilsvarende side
  MERGE   Flere gamle URL-er slås sammen til én ny (301 fra alle)
  410     Fjernet uten relevant erstatning
  AVVENTER  Firmagaver: mål-URL avventer MerchMaker-struktur (A/B/C-forslag i egen kolonne)

Bruk: python3 tools/audit/build_redirect_map.py docs/migration/crawl-2026-09-28
"""
from __future__ import annotations

import collections
import csv
import re
import sys
import urllib.parse as up
from pathlib import Path

BASE = "https://kontorcompaniet.no"

# ---------------------------------------------------------------------------
# Produktkatalog: kuratering, ikke automatisk import.
#
# Ny plattform er IKKE en nettbutikk. Hver WooCommerce-produkt-URL får én beslutning:
#   KEEP      Blir egen produktside med samme URL (/produkt/{slug})
#   MERGE     Slås sammen med andre URL-er til én produktfamilie-side (301 fra alle)
#   REDIRECT  Duplikat eller feil slug → 301 til eksisterende/ny kanonisk produktside
#   ARCHIVE   Publiseres ikke (tilbehør, komponenter, svake enkeltprodukter). Data beholdes
#             internt; URL-en får 301 til mest relevante produkt/kategori/merke
#
# Kolonner: (beslutning, mål-sti, prioritet P1/P2, begrunnelse)
# ---------------------------------------------------------------------------
CATALOG: dict[str, tuple[str, str, str, str]] = {}


def family(target: str, olds: list[str], prio: str, why: str):
    for o in olds:
        decision = "KEEP" if f"/produkt/{o}" == target else "MERGE"
        CATALOG[o] = (decision, target, prio, why)


def one(slug: str, decision: str, target: str, prio: str, why: str):
    CATALOG[slug] = (decision, target, prio, why)


P = "/produkt/"
# Kontorstoler
one("hag-capisco-8106", "KEEP", P + "hag-capisco-8106", "P1", "Ikonisk modell, høy søkeverdi, egen brukerguide")
one("hag-creed-6006-kontorstol", "KEEP", P + "hag-creed-6006-kontorstol", "P1", "HÅG, EPD + miljømerker")
one("hag-futu-mesh-1100-s", "KEEP", P + "hag-futu-mesh-1100-s", "P1", "HÅG, 10 bilder, EPD")
one("hag-sofi-mesh-7500-2", "REDIRECT", P + "hag-sofi-mesh-7500", "P1", "Rydd bort -2 (basis-slug finnes ikke). Egen brukerguide")
family(P + "hag-tribute", ["hag-tribute-9021-kontorstol", "hag-tribute-9031-kontorstol"], "P1",
       "Én familieside: 9021 og 9031 (med nakkestøtte) som modellvarianter")
one("vitra-id-trim", "KEEP", P + "vitra-id-trim", "P1", "Vitra kontorstol")
one("vitra-id-trim-kopi", "REDIRECT", P + "vitra-id-trim", "P1", "«-kopi» (mesh-versjon) er variant av samme modell")
family(P + "vitra-soft-pad-chair", ["vitra-soft-pad-217", "vitra-soft-pad-219"], "P2", "EA 217 og EA 219 som varianter av Soft Pad Chair")
one("dauphin-tosync", "ARCHIVE", "/produkter/kontorstoler", "-",
    "Rimelig lagerstol, Dauphin står ikke på leverandørlisten, 3 innlenker. BEKREFT om dere vil selge den videre")
# Møteromsstoler
one("fora-form-bud-unite-konferansestol", "KEEP", P + "fora-form-bud-unite-konferansestol", "P1", "Norsk design, EPD, Møbelfakta")
one("vitra-physix", "KEEP", P + "vitra-physix", "P2", "Mangler beskrivelse i dag – må skrives")
one("vitra-physix-konferansestol", "MERGE", P + "vitra-physix", "P2", "Samme modellfamilie; understell/tekstil er detaljer for tilbudsfasen")
# Kantinestoler
one("fora-form-city-4-ben", "KEEP", P + "fora-form-city-4-ben", "P1", "Norsk design, EPD")
one("hag-celi-9100", "KEEP", P + "hag-celi-9100", "P1", "HÅG, EPD, Greenguard")
one("hay-about-a-chair-222", "KEEP", P + "hay-about-a-chair-222", "P2", "Kjent designstol (AAC 22), 19 bilder")
one("profim-noor-6050", "KEEP", P + "profim-noor-6050", "P2", "EPD + Greenguard. Profim står ikke på leverandørlisten – bekreft")
one("vitra-eames-plastic-sidechair-dsr", "KEEP", P + "vitra-eames-plastic-side-chair-dsr", "P1",
    "Høy søkeverdi. NB: ny slug er foreslått for riktig navn – beholdes gammel hvis GSC viser trafikk")
# Skrivebord
family(P + "dencon-skrivebord", ["dencon-skrivebord-120x80-cm", "dencon-skrivebord-140x80-cm", "dencon-skrivebord-160x80-cm",
                                 "dencon-skrivebord-120x80-cm-2", "dencon-skrivebord-fast-hoyde-140x80-cm", "dencon-skrivebord-140x80-cm-2"],
       "P1", "Én side: hev/senk og fast høyde, størrelser som informasjon (ikke SKU). Slugs i dag er delvis feil")
one("dencon-bordplate-160x80", "ARCHIVE", P + "dencon-skrivebord", "-", "Komponent – dekkes på skrivebordssiden")
one("dencon-elektrisk-hev-senk-understell", "ARCHIVE", P + "dencon-skrivebord", "-", "Komponent – dekkes på skrivebordssiden")
one("dencon-kabelrenne", "ARCHIVE", P + "dencon-skrivebord", "-", "Tilbehør – nevnes på skrivebordssiden")
# Møtebord
family(P + "dencon-delta-konferansebord", [f"dencon-delta-konferansebord-{s}-cm" for s in ("140x80", "160x80", "180x80", "180x90", "200x100", "220x100")],
       "P1", "Seks størrelser → én side")
family(P + "fora-form-kvart-motebord", ["fora-form-kvart-motebord-240x120", "fora-form-kvart-motebord-240x120-2", "fora-form-kvart-motebord-260x120"],
       "P1", "Duplikat + størrelser → én side. NB: «240x120» er i dag 200×120")
one("fora-form-kabelluke-med-bronn", "ARCHIVE", P + "fora-form-kvart-motebord", "-", "Tilbehør til møtebord")
# Oppbevaring
family(P + "dencon-skap", ["dencon-skap", "dencon-skap-3xa4", "dencon-skap-4xa4"], "P2", "Høyder som informasjon. Beskrivelse mangler – må skrives")
family(P + "dencon-uttrekksskap", ["dencon-utrekksskap-2xa4", "dencon-uttrekksskap-3xa4"], "P2", "Rettet skrivefeil. Beskrivelse mangler")
# Sofa og lounge
one("fogia-bollo", "KEEP", P + "fogia-bollo", "P2", "Norsk design (Andreas Engelsvik). 0 innlenker i dag. Fogia står ikke på leverandørlisten – bekreft")
family(P + "fora-form-senso-hoy", ["fora-form-senso-2-seter-hoy", "fora-form-senso-3-seter-hoy"], "P1", "2- og 3-seter på én side")
family(P + "muuto-outline-3-seter", ["muuto-outline-3-seter", "muuto-outline-3-seter-2", "muuto-outline-3-seter-3"], "P2", "Tre identiske titler → én side")
one("vitra-eames-loungechair", "KEEP", P + "vitra-eames-loungechair", "P1", "Svært høy søkeverdi (designikon)")
# Akustikk
family(P + "abstracta-soneo-bordskjerm", [f"abstracta-soneo-bordskjerm-{w}x650x30-mm" for w in (1200, 1400, 1600)], "P2", "Bredder som informasjon")
# Elektrifisering (Evoline)
family(P + "evoline-express", ["evoline-express-2xel-klikksystem", "evoline-express-3xschuko-klikksystem", "evoline-express-4xel-klikksystem"],
       "P2", "Systemside for strøm på arbeidsplassen")
family(P + "evoline-circle80", ["evoline-circle80", "evoline-circle80-disq"], "P2", "DisQ (trådløs lading) som variant")
for s in ["evoline-matafix-kabelsamler-20m", "evoline-metafix-verktoy-for-kabling", "evoline-rj45-cat6-utp-3m-gra", "evoline-rj45-cat6-utp-5m-gra",
          "evoline-rj45-cat6-utp-75m-gra", "evoline-skjotekabel-1m", "evoline-skjotekabel-25m", "evoline-skjotekabel-3m",
          "evoline-tilforselskabel-1m-sort", "evoline-tilforselskabel-2m-sort", "evoline-tilforselskabel-3m-sort"]:
    one(s, "ARCHIVE", P + "evoline-express", "-", "Kabel/tilbehør uten egen søke- eller leadverdi – nevnes på Express-siden")

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
# ---------------------------------------------------------------------------
# Produktsider er UTSATT (besluttet 2026-09-28): v1 har ingen /produkt/-sider.
# Katalogvurderingen over beholdes for fasen der produktsidene bygges.
# Frem til da går hver produkt-URL (og alt som pekte på en produktside) til
# merkesiden hvis merket får egen side ved lansering, ellers til kategorisiden.
# Settes til True når produktsidene lanseres → kartet regenereres.
# ---------------------------------------------------------------------------
PRODUCT_PAGES_LIVE = False
LAUNCH_BRANDS = {"Håg": "hag", "Vitra": "vitra", "Dencon": "dencon", "Fora Form": "fora-form", "Evoline": "evoline",
                 "Muuto": "muuto", "Abstracta": "abstracta", "Horreds": "horreds"}
CATEGORY_TARGET = {"Kontorstoler": "kontorstoler", "Møteromsstoler": "moteromsstoler", "Stoler": "kantinestoler",
                   "Skrivebord – El. hev/senk": "skrivebord", "Skrivebord – Fast understell": "skrivebord",
                   "Komponenter": "skrivebord", "Møtebord": "motebord", "Oppbevaring": "oppbevaring", "Sofa": "sofa-og-lounge",
                   "Loungestoler": "sofa-og-lounge", "Bordskjermer": "akustikk", "Skrivebord – Tilbehør": "tilbehor"}

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
    "ronan-erwan-bouroullec": "/produkt/vitra-physix",
    "skogstadwaernes": "/produkt/fora-form-bud-unite-konferansestol",
    "stokkeaustad-form-us-with-love-gronlund-design-and-flokk-design-team": "/produkt/profim-noor-6050",
    "svein-asbjornsen-sapdesign": "/produkt/hag-tribute",
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
        new, action, why, review, gift_opt, catalog_decision = None, None, "", "", "", ""

        if path in EXACT:
            new, action, why = EXACT[path]
        elif typ == "firmagave":
            opt, hint = gift_proposal(p.path)
            new, action, why, gift_opt = None, "AVVENTER", hint, opt
        elif p.path.startswith("/produkt/"):
            slug = p.path.strip("/").split("/")[1]
            if slug in GONE_PRODUCTS:
                new, action, why = GONE_PRODUCTS[slug]
                catalog_decision = "REDIRECT"
            elif "pizzapose" in slug:
                opt, hint = gift_proposal(p.path)
                new, action, why, gift_opt = None, "AVVENTER", "Firmagave, 404 i dag. " + hint, opt
            elif slug in USED_SLUGS:
                new, action, catalog_decision = "/brukt", "301", "REDIRECT"
                why = "Unik bruktvare. Hvis fortsatt tilgjengelig ved lansering: 301 til /brukt/{slug}, ellers /brukt"
                review = "Sjekk lagerstatus ved lansering"
            elif slug in CATALOG:
                decision, target, prio, why = CATALOG[slug]
                catalog_decision = decision
                new = target
                action = {"KEEP": "KEEP" if target == p.path.rstrip("/") else "301", "MERGE": "MERGE",
                          "REDIRECT": "301", "ARCHIVE": "301"}[decision]
                if decision == "KEEP" and target != p.path.rstrip("/"):
                    why = "Ny slug: " + why
            else:
                new, action, why, review = None, "UAVKLART", "Produkt uten katalogbeslutning", "JA"
            if "BEKREFT" in why or "bekreft" in why:
                review = review or "Bekreft med Kontorcompaniet"
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
            "katalog": catalog_decision,
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

    # --- Produktsider utsatt: løs /produkt/-mål til merke- eller kategoriside ---
    if not PRODUCT_PAGES_LIVE:
        page_target: dict[str, tuple[str, str]] = {}   # /produkt/x -> (mål, begrunnelse)
        for slug, (dec, target, _, _) in CATALOG.items():
            pr = prods.get(slug)
            if not pr or not target.startswith("/produkt/"):
                continue
            first_cat = (pr["kategorier"].split(",")[0] or "").strip()
            if pr["merke"] in LAUNCH_BRANDS:
                page_target[target] = (f"/merkevarer/{LAUNCH_BRANDS[pr['merke']]}", f"merkesiden ({pr['merke']})")
            elif first_cat in CATEGORY_TARGET:
                page_target[target] = (f"/produkter/{CATEGORY_TARGET[first_cat]}", f"kategorisiden ({first_cat})")
            else:
                page_target.setdefault(target, ("/produkter/skrivebord", "nærmeste kategori"))
        for o in out:
            path = up.urlsplit(o["new_url"]).path.rstrip("/") if o["new_url"] else ""
            if path.startswith("/produkt/"):
                if path not in page_target:
                    raise SystemExit(f"Mangler midlertidig mål for {path}")
                tgt, why = page_target[path]
                o["senere_produktside"] = path
                o["new_url"] = BASE + tgt
                if o["action"] == "KEEP":
                    o["action"] = "301"
                o["begrunnelse"] = f"MIDLERTIDIG (produktsider utsatt) → {why}. Senere: {path}. " + o["begrunnelse"]
            else:
                o["senere_produktside"] = ""

    # --- Validering: ingen mål kan selv være en redirect-kilde (ingen kjeder) ---
    norm = lambda u: (up.urlsplit(u).path.rstrip("/") or "/")
    live = {norm(o["new_url"]) for o in out if o["new_url"]}          # stier som finnes på ny plattform
    sources = {norm(o["old_url"]) for o in out if o["action"] not in ("KEEP", "AVVENTER") and norm(o["old_url"]) not in live}
    for o in out:
        tgt = norm(o["new_url"]) if o["new_url"] else None
        if tgt and tgt in sources and o["action"] != "KEEP":
            raise SystemExit(f"REDIRECT-KJEDE: {o['old_url']} -> {o['new_url']}")

    # --- Produktkatalog-vurdering (én rad per gammelt produkt) ---
    cat_rows = []
    for slug, (decision, target, prio, why) in sorted(CATALOG.items(), key=lambda x: (x[1][1], x[0])):
        pr = prods.get(slug, {})
        cat_rows.append({"gammel_slug": slug, "navn": pr.get("navn", ""), "merke": pr.get("merke", ""),
                         "beslutning": decision, "ny_side": target, "prioritet": prio,
                         "beskrivelse_ord": pr.get("beskrivelse_ord", ""), "bilder": pr.get("bilder", ""),
                         "epd": pr.get("epd", ""), "miljomerking": pr.get("miljomerking", ""),
                         "status_i_dag": pr.get("http_status", ""), "begrunnelse": why})
    missing = [s for s, r in prods.items() if r["segment"] == "kontor" and s not in CATALOG]
    if missing:
        raise SystemExit(f"Produkter uten katalogbeslutning: {missing}")
    with (d.parent / "produktkatalog-vurdering.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(cat_rows[0]))
        w.writeheader()
        w.writerows(cat_rows)
    pages = sorted({t for (dec, t, _, _) in CATALOG.values() if dec in ("KEEP", "MERGE", "REDIRECT") and t.startswith("/produkt/")})
    print(f"Produktsider i ny katalog (fra dagens data): {len(pages)}")
    print(collections.Counter(dec for (dec, *_ ) in CATALOG.values()))

    order = {"KEEP": 0, "301": 1, "MERGE": 2, "410": 3, "AVVENTER": 4, "UAVKLART": 5}
    out.sort(key=lambda x: (order.get(x["action"], 9), x["type"], x["old_url"]))
    with (d.parent / "redirect-map.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(rules + out)

    print(collections.Counter(o["action"] for o in out))
    print(collections.Counter((o["type"], o["action"]) for o in out))
    for o in out:
        if o["action"] == "UAVKLART":
            print("UAVKLART", o["old_url"])


if __name__ == "__main__":
    main()
