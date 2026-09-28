import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countWords, headings, parseBlocks, parseFrontmatter, plain, splitFaq } from "@/lib/content/markdown";
import { seedBrands, seedCategories, seedProducts, seedSolutions } from "@/lib/content/seed";
import { leadEmail, leadSchema } from "@/lib/leads";

const ROOT = join(__dirname, "../../content");

describe("markdown", () => {
  it("leser frontmatter og blokker", () => {
    const d = parseFrontmatter("---\ntitle: Hei\ndescription: En tekst: med kolon\n---\n## Overskrift\n\nAvsnitt en\nfortsetter.\n\n- a\n- b\n\n1. en\n2. to");
    expect(d.data).toEqual({ title: "Hei", description: "En tekst: med kolon" });
    expect(parseBlocks(d.body).map((b) => b.t)).toEqual(["h2", "p", "ul", "ol"]);
    expect(headings(d.body)).toEqual([{ id: "overskrift", text: "Overskrift" }]);
  });

  it("skiller ut FAQ og beholder resten", () => {
    const { body, faq } = splitFaq("## Intro\n\nTekst.\n\n## Spørsmål vi ofte får\n\n### Hvor lenge?\n\nLenge.\n\n## Etter\n\nMer.");
    expect(faq).toEqual([{ q: "Hvor lenge?", a: "Lenge." }]);
    expect(body).toContain("## Etter");
    expect(body).not.toContain("Hvor lenge");
  });

  it("fjerner inline-markdown i ren tekst", () => {
    expect(plain("Se **fet** og [lenke](/x).")).toBe("Se fet og lenke.");
  });
});

describe("innholdsfiler", () => {
  const types = ["losninger", "produkter", "merkevarer", "prosjekter", "sider", "inspirasjon"];
  const files = types.flatMap((t) => readdirSync(join(ROOT, t)).map((f) => ({ t, slug: f.replace(/\.md$/, ""), src: readFileSync(join(ROOT, t, f), "utf8") })));

  it.each(files.map((f) => [`${f.t}/${f.slug}`, f] as const))("%s har gyldig meta description", (_, f) => {
    const { data } = parseFrontmatter(f.src);
    expect(data.description, "description mangler").toBeTruthy();
    expect(data.description.length).toBeLessThanOrEqual(160);
  });

  it("interne lenker i teksten peker til sider som finnes", () => {
    const known = new Set([
      "/mobelscout", "/kontakt", "/personvern", "/baerekraft", "/brukt", "/om-oss",
      ...seedSolutions.map((s) => `/losninger/${s.slug}`), ...seedCategories.map((c) => `/produkter/${c.slug}`),
      ...seedBrands.map((b) => `/merkevarer/${b.slug}`),
    ]);
    const bad = files.flatMap((f) => [...f.src.matchAll(/\]\((\/[^)\s#]*)\)/g)].map((m) => m[1]).filter((p) => !known.has(p)).map((p) => `${f.t}/${f.slug}: ${p}`));
    expect(bad).toEqual([]);
  });

  it("hver løsning og kategori har en tekstfil", () => {
    for (const s of seedSolutions) expect(files.some((f) => f.t === "losninger" && f.slug === s.slug), s.slug).toBe(true);
    for (const c of seedCategories) expect(files.some((f) => f.t === "produkter" && f.slug === c.slug), c.slug).toBe(true);
  });

  it("de migrerte artiklene har nok innhold til å indekseres (≥ 600 ord)", () => {
    for (const f of files.filter((x) => x.t === "inspirasjon")) expect(countWords(parseFrontmatter(f.src).body), f.slug).toBeGreaterThanOrEqual(600);
  });
});

describe("produktkort (ikke nettbutikk)", () => {
  it("peker til merker og kategorier som finnes, og har ingen produktsider", () => {
    const brands = new Set(seedBrands.map((b) => b.slug));
    const cats = new Set(seedCategories.map((c) => c.slug));
    for (const p of seedProducts) {
      expect(brands.has(p.brandSlug), p.slug).toBe(true);
      expect(cats.has(p.categorySlug), p.slug).toBe(true);
      expect(p.hasPage).toBe(false);
    }
  });
});

describe("henvendelser", () => {
  const base = { kind: "quote_request", name: "Kari Nordmann", email: "kari@eksempel.no", consent: true, message: "Vi trenger 20 stoler." };

  it("krever samtykke, gyldig e-post og innhold", () => {
    expect(leadSchema.safeParse(base).success).toBe(true);
    expect(leadSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, email: "x" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, message: "" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, message: "", items: [{ slug: "hag-capisco-8106", name: "HÅG Capisco" }] }).success).toBe(true);
    expect(leadSchema.safeParse({ ...base, website: "spam" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, items: [{ slug: "../x", name: "x" }] }).success).toBe(false);
  });

  it("lager lesbar e-post til salg med prosjektlisten", () => {
    const d = leadSchema.parse({ ...base, company: "Eksempel AS", items: [{ slug: "hag-tribute", name: "HÅG Tribute", brand: "HÅG", qty: 12 }] });
    const m = leadEmail(d, "https://kontorcompaniet.no/admin");
    expect(m.subject).toBe("Tilbudsforespørsel: Eksempel AS");
    expect(m.text).toContain("- HÅG Tribute (HÅG) × 12");
  });
});
