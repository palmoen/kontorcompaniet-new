import { describe, expect, it } from "vitest";
import generated from "@/generated/redirects.json";
import { resolveRedirect, type RedirectMap } from "@/lib/redirects/resolve";

const map = generated.map as RedirectMap;
const run = (href: string, maps: RedirectMap[] = [map]) =>
  resolveRedirect({ url: new URL(href), canonicalHost: "kontorcompaniet.no", maps });

describe("redirect-motor", () => {
  it("gammel WordPress-URL med skråstrek går til endelig mål i ett hopp", () => {
    expect(run("https://kontorcompaniet.no/om-oss/kontakt/")).toEqual({ kind: "redirect", location: "https://kontorcompaniet.no/kontakt" });
  });
  it("www + gammel URL går direkte til kanonisk domene og mål", () => {
    expect(run("https://www.kontorcompaniet.no/produktkategori/kontorstoler/")).toEqual({
      kind: "redirect", location: "https://kontorcompaniet.no/produkter/kontorstoler",
    });
  });
  it("add-to-cart fjernes og regelen for stien brukes i samme hopp", () => {
    expect(run("https://kontorcompaniet.no/produktkategori/moteromsstoler/?add-to-cart=7564")).toEqual({
      kind: "redirect", location: "https://kontorcompaniet.no/produkter/moteromsstoler",
    });
  });
  it("produkt-URL går midlertidig til merkesiden (produktsider utsatt)", () => {
    expect(run("https://kontorcompaniet.no/produkt/hag-capisco-8106/")).toEqual({ kind: "redirect", location: "https://kontorcompaniet.no/merkevarer/hag" });
  });
  it("systemsider gir 410", () => {
    expect(run("https://kontorcompaniet.no/rentmy-cart/")).toEqual({ kind: "gone" });
    expect(run("https://kontorcompaniet.no/leveringstid/lagerfort-3-5-dager/")).toEqual({ kind: "gone" });
  });
  it("URL med spørrestreng som nøkkel", () => {
    expect(run("https://kontorcompaniet.no/?page_id=46")).toEqual({ kind: "redirect", location: "https://kontorcompaniet.no/inspirasjon" });
  });
  it("gamle Yoast-sitemaps går til ny sitemap", () => {
    expect(run("https://kontorcompaniet.no/product-sitemap.xml")).toEqual({ kind: "redirect", location: "https://kontorcompaniet.no/sitemap.xml" });
    expect(run("https://kontorcompaniet.no/sitemap_index.xml")).toEqual({ kind: "redirect", location: "https://kontorcompaniet.no/sitemap.xml" });
  });
  it("ny URL uten endring gir ingen redirect", () => {
    expect(run("https://kontorcompaniet.no/kontakt")).toEqual({ kind: "none" });
    expect(run("https://kontorcompaniet.no/sitemap.xml")).toEqual({ kind: "none" });
  });
  it("ukjent URL med skråstrek normaliseres, og preview beholder egen origin", () => {
    expect(run("https://preview.vercel.app/ny-side/")).toEqual({ kind: "redirect", location: "https://preview.vercel.app/ny-side" });
    expect(run("http://localhost:3100/om-oss/kontakt/")).toEqual({ kind: "redirect", location: "http://localhost:3100/kontakt" });
  });
  it("admin-redirects vinner over migreringskartet", () => {
    const db: RedirectMap = { "/produkt/hag-capisco-8106": { to: "/produkt/hag-capisco-8106-ny", status: 301 } };
    expect(run("https://kontorcompaniet.no/produkt/hag-capisco-8106/", [db, map])).toEqual({
      kind: "redirect", location: "https://kontorcompaniet.no/produkt/hag-capisco-8106-ny",
    });
  });
});

describe("redirect-kartet", () => {
  const entries = Object.entries(map);
  it("ingen kjeder: intet mål er selv en redirect-kilde", () => {
    const chains = entries.filter(([, e]) => e.to && map[e.to]);
    expect(chains).toEqual([]);
  });
  it("ingen redirect til forsiden (unntatt forsiden selv)", () => {
    expect(entries.filter(([from, e]) => e.to === "/" && from !== "/")).toEqual([]);
  });
  it("alle 301 har mål og alle 410 mangler mål", () => {
    for (const [from, e] of entries) {
      if (e.status === 301) expect(e.to, from).toMatch(/^\//);
      else expect(e.to, from).toBeNull();
    }
  });
  it("ingen mål peker til /produkt/ mens produktsidene er utsatt", () => {
    expect(entries.filter(([, e]) => e.to?.startsWith("/produkt/"))).toEqual([]);
  });
});
