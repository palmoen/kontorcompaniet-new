import { expect, test } from "@playwright/test";
import { redirectRows } from "./helpers";

/**
 * Hver URL fra dagens kontorcompaniet.no (docs/migration/redirect-map.csv):
 * forventet status og mål i ETT hopp. Målsider testes for 200 når de er lansert
 * (sitemap-testen dekker det); her testes første hopp og at det ikke er kjeder.
 */
test("migrerings-redirects: status, mål og ett hopp", async ({ request }) => {
  const rows = redirectRows().filter((r) => r.action !== "AVVENTER" && r.action !== "UAVKLART");
  expect(rows.length).toBeGreaterThan(150);
  const failures: string[] = [];
  for (const r of rows) {
    const url = new URL(r.old);
    const res = await request.get(url.pathname + url.search, { maxRedirects: 0 });
    if (r.action === "410") {
      if (res.status() !== 410) failures.push(`${r.old}: forventet 410, fikk ${res.status()}`);
      continue;
    }
    const want = new URL(r.next).pathname;
    if (r.action === "KEEP") {
      // Samme sti. Med avsluttende «/» → ett hopp til sti uten «/».
      if (url.pathname !== want && res.status() !== 301) failures.push(`${r.old}: forventet 301 til ${want}`);
      continue;
    }
    const loc = res.headers()["location"];
    if (res.status() !== 301 || !loc || new URL(loc, "http://x").pathname !== want) {
      failures.push(`${r.old}: forventet 301 → ${want}, fikk ${res.status()} ${loc ?? ""}`);
      continue;
    }
    // Ingen kjede: målet skal ikke selv redirecte
    const second = await request.get(want, { maxRedirects: 0 });
    if ([301, 302, 307, 308].includes(second.status())) failures.push(`${r.old}: kjede via ${want}`);
  }
  expect(failures).toEqual([]);
});

test("WooCommerce-parametere og gamle sitemaps", async ({ request }) => {
  const a = await request.get("/produktkategori/kontorstoler/?add-to-cart=7095", { maxRedirects: 0 });
  expect(a.status()).toBe(301);
  expect(new URL(a.headers()["location"], "http://x").pathname).toBe("/produkter/kontorstoler");
  const b = await request.get("/sitemap_index.xml", { maxRedirects: 0 });
  expect(new URL(b.headers()["location"], "http://x").pathname).toBe("/sitemap.xml");
});
