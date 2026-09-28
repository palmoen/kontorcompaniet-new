import { describe, expect, it } from "vitest";
import { breadcrumbList, organization, serializeJsonLd } from "@/lib/seo/jsonld";
import { isIndexable } from "@/lib/env";
import { absoluteUrl, buildMetadata, formatTitle } from "@/lib/seo/metadata";
import { brandGate, categoryGate, shouldIndex } from "@/lib/seo/quality";
import { defaultSiteSettings } from "@/lib/site/settings";

describe("metadata", () => {
  it("absoluteUrl uten avsluttende skråstrek", () => {
    expect(absoluteUrl("/")).toBe("https://kontorcompaniet.no");
    expect(absoluteUrl("/kontakt/")).toBe("https://kontorcompaniet.no/kontakt");
    expect(absoluteUrl("produkter/kontorstoler")).toBe("https://kontorcompaniet.no/produkter/kontorstoler");
  });
  it("tittel får merkenavn, men ikke dobbelt og ikke over 60 tegn", () => {
    expect(formatTitle("Kontorstoler")).toBe("Kontorstoler | Kontorcompaniet");
    expect(formatTitle("Kontorcompaniet – fra idé til ferdig arbeidsplass")).toBe("Kontorcompaniet – fra idé til ferdig arbeidsplass");
    const long = "En veldig lang sidetittel som ikke har plass til merkenavnet sitt";
    expect(formatTitle(long)).toBe(long);
  });
  it("canonical, og robots følger SITE_INDEXABLE", () => {
    const m = buildMetadata({ title: "Kontakt oss", description: "Kontakt.", path: "/kontakt/" });
    expect(m.alternates?.canonical).toBe("https://kontorcompaniet.no/kontakt");
    expect(m.robots).toEqual({ index: isIndexable, follow: true });
  });
  it("noindex på siden vinner alltid", () => {
    expect(buildMetadata({ title: "X", description: "Y", path: "/x", noindex: true }).robots).toEqual({ index: false, follow: true });
  });
});

describe("strukturerte data", () => {
  it("serialisering hindrer </script>-injeksjon", () => {
    expect(serializeJsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
  it("Organization bruker sentral konfigurasjon og nytt e-postdomene", () => {
    const o = organization(defaultSiteSettings);
    expect(o.email).toBe("post@kontorcompaniet.no");
    expect(JSON.stringify(o)).not.toContain("kcdrammen");
    expect(o.foundingDate).toBe("1981");
  });
  it("BreadcrumbList har posisjoner og absolutte URL-er", () => {
    const b = breadcrumbList([{ name: "Forside", path: "/" }, { name: "Kontakt", path: "/kontakt" }]);
    expect(b.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Forside", item: "https://kontorcompaniet.no" },
      { "@type": "ListItem", position: 2, name: "Kontakt", item: "https://kontorcompaniet.no/kontakt" },
    ]);
  });
});

describe("kvalitetsporter", () => {
  it("kategori med få produkter består via merker, men krever innhold og prosjekt", () => {
    expect(categoryGate({ bodyWords: 450, products: 1, brands: 4, projects: 1, seoDescription: "x" }).pass).toBe(true);
    const r = categoryGate({ bodyWords: 120, products: 1, brands: 2, projects: 0, seoDescription: null });
    expect(r.pass).toBe(false);
    expect(r.reasons).toHaveLength(4);
  });
  it("merke uten innhold indekseres ikke", () => {
    expect(brandGate({ introMd: "kort", whyWeUseMd: null, products: 5, projects: 0 }).pass).toBe(false);
  });
  it("admin-overstyring vinner", () => {
    expect(shouldIndex({ pass: false, reasons: ["x"] }, "index")).toBe(true);
    expect(shouldIndex({ pass: true, reasons: [] }, "noindex")).toBe(false);
  });
});
