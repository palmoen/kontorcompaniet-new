import { expect, test } from "@playwright/test";
import { SITE, sitemapPaths } from "./helpers";

test("robots.txt og sitemap.xml", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  expect(robots).toMatch(/Disallow: \/admin/);
  const paths = await sitemapPaths(request);
  expect(paths).toContain("/");
  expect(paths.every((p) => !p.endsWith("/") || p === "/")).toBe(true);
});

test("hver side i sitemap: 200, én H1, metadata, canonical, JSON-LD, alt-tekster", async ({ page, request }) => {
  const paths = await sitemapPaths(request);
  const titles = new Set<string>();
  for (const path of paths) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1"), path).toHaveCount(1);
    expect(await page.locator("html").getAttribute("lang")).toBe("nb");

    const title = await page.title();
    expect(title.length, `${path} title`).toBeGreaterThan(10);
    expect(title.length, `${path} title`).toBeLessThanOrEqual(65);
    expect(titles.has(title), `duplikat title ${title}`).toBe(false);
    titles.add(title);

    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc?.length ?? 0, `${path} description`).toBeGreaterThan(50);
    expect(desc!.length, `${path} description`).toBeLessThanOrEqual(160);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical, path).toBe(path === "/" ? SITE : `${SITE}${path}`);
    expect(await page.locator('meta[name="robots"]').getAttribute("content"), path).toMatch(/^index/);

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length, `${path} JSON-LD`).toBeGreaterThan(0);
    const types = blocks.flatMap((b) => [JSON.parse(b)].flat().map((x: { "@type": string }) => x["@type"]));
    expect(types).toContain("Organization");
    if (path !== "/") expect(types).toContain("BreadcrumbList");

    const imgs = page.locator("img");
    for (let i = 0; i < (await imgs.count()); i++) {
      expect(await imgs.nth(i).getAttribute("alt"), `${path} img ${i} mangler alt`).not.toBeNull();
    }
    expect(await page.content()).not.toContain("kcdrammen");
  }
});

test("ingen døde interne lenker fra sidene i sitemap", async ({ page, request }) => {
  const seen = new Set<string>();
  for (const path of await sitemapPaths(request)) {
    await page.goto(path);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    for (const h of hrefs) seen.add(h.split("#")[0] || "/");
  }
  for (const href of seen) {
    const r = await request.get(href, { maxRedirects: 0 });
    expect(r.status(), `intern lenke ${href}`).toBe(200);
  }
});

test("404 har riktig status og noindex", async ({ page }) => {
  const res = await page.goto("/finnes-ikke-xyz");
  expect(res?.status()).toBe(404);
  expect(await page.locator('meta[name="robots"]').first().getAttribute("content")).toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
});

test("admin er noindex og stengt uten Supabase", async ({ page }) => {
  const res = await page.goto("/admin");
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Admin er ikke konfigurert");
});
