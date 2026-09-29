import { describe, expect, it } from "vitest";
import type { AiProvider } from "@/lib/scout/ai/provider";
import { createWebAdapter, htmlToText, robotsAllows } from "@/lib/scout/sources/web";

describe("robots.txt", () => {
  const txt = "User-agent: *\nDisallow: /admin\nDisallow: /*?sort=\nAllow: /admin/offentlig\n\nUser-agent: BadBot\nDisallow: /";
  it("følger Disallow/Allow for * (lengste treff vinner)", () => {
    expect(robotsAllows(txt, "/brukte-kontorstoler")).toBe(true);
    expect(robotsAllows(txt, "/admin/innstillinger")).toBe(false);
    expect(robotsAllows(txt, "/admin/offentlig/side")).toBe(true);
    expect(robotsAllows(txt, "/stoler?sort=pris")).toBe(false);
  });
  it("egen gruppe for vår agent går foran *", () => {
    expect(robotsAllows("User-agent: *\nAllow: /\n\nUser-agent: KontorcompanietScout\nDisallow: /", "/x")).toBe(false);
  });
  it("tom robots.txt tillater alt", () => expect(robotsAllows("", "/x")).toBe(true));
});

describe("htmlToText", () => {
  it("fjerner skript og stil, og beholder lenker som absolutte adresser", () => {
    const html = `<html><head><style>.a{}</style><script>alert(1)</script></head><body>
      <div class="p"><a href="/produkt/hag-futu-12">HÅG Futu, 12 stk</a><p>Pris: 1&nbsp;490 kr</p><span>Oslo</span></div></body></html>`;
    const t = htmlToText(html, "https://forhandler.example/brukt/");
    expect(t).toContain("HÅG Futu, 12 stk [https://forhandler.example/produkt/hag-futu-12]");
    expect(t).toContain("Pris: 1 490 kr");
    expect(t).not.toContain("alert");
    expect(t).not.toContain(".a{}");
  });
});

describe("nettside-adapter", () => {
  const pages: Record<string, { status: number; body: string }> = {
    "https://forhandler.example/robots.txt": { status: 200, body: "User-agent: *\nDisallow: /privat" },
    "https://forhandler.example/kontorstoler": { status: 200, body: "<a href='/p/1'>HÅG Futu</a> 12 stk, 1 490 kr, Oslo" },
  };
  const calls: string[] = [];
  const fakeFetch = (async (input: RequestInfo | URL) => {
    const url = input.toString();
    calls.push(url);
    const p = pages[url];
    return new Response(p?.body ?? "", { status: p?.status ?? 404 });
  }) as typeof fetch;
  const ai = {
    name: "fake",
    parseNeed: async () => { throw new Error("ikke brukt"); },
    extractListings: async ({ pageText }) => ({
      items: pageText.includes("HÅG Futu")
        ? [{ title: "HÅG Futu", brand: "HÅG", model: "Futu", quantity: 12, condition: "used", price_nok: 1490, location: "Oslo", url: "https://forhandler.example/p/1" }]
        : [],
      usage: { model: "fake", latencyMs: 1 },
    }),
  } satisfies AiProvider;
  const adapter = createWebAdapter({ fetch: fakeFetch, sleep: async () => {} });

  it("henter tillatte sider, lar AI lese ut varer og normaliserer", async () => {
    const raw = await adapter.fetchItems({ category: "office_chair", config: { pages: { office_chair: ["https://forhandler.example/kontorstoler"] } }, ai });
    expect(calls).toContain("https://forhandler.example/robots.txt");
    const items = raw.map((r) => adapter.normalize(r));
    expect(items).toEqual([expect.objectContaining({
      externalId: "https://forhandler.example/p/1", category: "office_chair", brand: "HÅG", model: "Futu", quantity: 12,
      condition: "used", sourcePrice: 1490, municipality: "Oslo", images: [],
    })]);
  });

  it("stopper når robots.txt ikke tillater siden", async () => {
    await expect(adapter.fetchItems({ category: "office_chair", config: { pages: { office_chair: ["https://forhandler.example/privat/stoler"] } }, ai }))
      .rejects.toThrow(/robots\.txt/);
  });

  it("krever AI, og ignorerer kategorier uten sider", async () => {
    await expect(adapter.fetchItems({ category: "office_chair", config: {}, ai: null })).rejects.toThrow(/AI/);
    expect(await adapter.fetchItems({ category: "desk", config: { pages: {} }, ai })).toEqual([]);
  });

  it("forkaster varer uten tittel", () => {
    expect(adapter.normalize({ title: "  ", category: "office_chair" })).toBeNull();
  });
});
