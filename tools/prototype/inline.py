#!/usr/bin/env python3
"""Lager én selvstendig HTML-fil av prototypen (bilder som data-URI).
Bruk: python3 tools/prototype/inline.py  →  prototype/dist/kontorcompaniet-prototype-0b.html"""
import base64, mimetypes, re
from pathlib import Path
root = Path(__file__).resolve().parents[2] / "prototype"
html = (root / "index.html").read_text(encoding="utf-8")
cache = {}
def data_uri(m):
    rel = m.group(2)
    if rel not in cache:
        p = root / rel
        mime = mimetypes.guess_type(p.name)[0] or ("image/webp" if p.suffix == ".webp" else "application/octet-stream")
        cache[rel] = f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()
    return m.group(1) + cache[rel] + m.group(3)
out = re.sub(r'(src=")(assets/[^"]+)(")', data_uri, html)

# Bygg inn skrifter (kun latin-subsett, dekker æøå) slik at filen fungerer uten nett
def inline_fonts(doc):
    import urllib.request
    m = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/css2[^"]+)">', doc)
    if not m:
        return doc
    ua = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"}
    try:
        css = urllib.request.urlopen(urllib.request.Request(m.group(1).replace("&amp;", "&"), headers=ua), timeout=30).read().decode()
    except Exception as e:  # noqa: BLE001
        print("Skrifter ble ikke bygget inn:", e)
        return doc
    faces = []
    for block in re.findall(r"/\*\s*latin\s*\*/\s*(@font-face\s*{[^}]+})", css):
        url = re.search(r"url\((https://[^)]+)\)", block).group(1)
        b64 = base64.b64encode(urllib.request.urlopen(urllib.request.Request(url, headers=ua), timeout=30).read()).decode()
        faces.append(block.replace(url, "data:font/woff2;base64," + b64))
    print(f"{len(faces)} skriftfiler bygget inn")
    doc = doc.replace(m.group(0), "<style>\n" + "\n".join(faces) + "\n</style>")
    return re.sub(r'<link rel="preconnect"[^>]*>\n?', "", doc)

out = inline_fonts(out)
(root / "dist").mkdir(exist_ok=True)
dest = root / "dist" / "kontorcompaniet-prototype-0b.html"
dest.write_text(out, encoding="utf-8")
print(dest, f"{dest.stat().st_size/1024:.0f} KB", f"{len(cache)} bilder")
