import { describe, expect, it } from "vitest";
import { matchItem, needsSemanticCheck, type InventoryItem } from "@/lib/scout/matching";
import { followUps, summarizeNeed } from "@/lib/scout/need";
import { parseNeedRules } from "@/lib/scout/parse-rules";
import { customerPrice, DEFAULT_RULE, pickRule } from "@/lib/scout/pricing";

const NOW = new Date("2026-09-28T10:00:00Z");
const EXAMPLE = "Vi trenger ca. 30 ergonomiske kontorstoler fra HÅG eller RH, maks 4–5.000 kr per stol. Oslo/Drammen. Vi trenger dem før november.";

describe("tolkning (regelbasert)", () => {
  const need = parseNeedRules(EXAMPLE, NOW);
  const item = need.items[0];
  it("forstår briefens eksempel", () => {
    expect(item.category).toBe("office_chair");
    expect(item.quantity).toEqual({ target: 30, minimum: 20 });
    expect(item.brands).toEqual(["HÅG", "RH"]);
    expect(item.max_unit_price_ex_vat).toBe(5000);
    expect(need.locations).toEqual(["Oslo", "Drammen"]);
    expect(need.deadline).toBe("2026-11-01");
    expect(item.condition).toEqual(["used", "refurbished"]);
    expect(item.accept_alternatives).toBe(true);
    expect(need.missing_critical).toEqual([]);
  });
  it("skiller harde krav og ønsker", () => {
    expect(need.hard_constraints).toContainEqual({ field: "price", value: "5000" });
    expect(need.hard_constraints).toContainEqual({ field: "deadline", value: "2026-11-01" });
    expect(need.hard_constraints).toContainEqual({ field: "attribute", value: "ergonomiske" });
    const p = parseNeedRules("20 kontorstoler, gjerne sorte, Oslo", NOW);
    expect(p.preferences).toContainEqual({ field: "color", value: "sort" });
  });
  it("oppsummering til kunden", () => {
    expect(summarizeNeed(need).map((l) => l.text.replace(/\s/g, " "))).toEqual([
      "30 ergonomiske kontorstoler (minst 20)",
      "HÅG eller RH eller tilsvarende",
      "Maks 5 000 kr/stk eks. mva.",
      "Brukt eller refurbished",
      "Levering Oslo eller Drammen",
      "Før 1. november 2026",
    ]);
  });
  it("modeller, totalbudsjett og «kun»", () => {
    const n = parseNeedRules("Kun 12 stk HÅG Capisco, budsjett 60 000 totalt, Bergen", NOW);
    expect(n.items[0].models).toEqual(["HÅG Capisco"]);
    expect(n.items[0].max_unit_price_ex_vat).toBe(5000);
    expect(n.items[0].accept_alternatives).toBe(false);
  });
  it("spør når kritisk informasjon mangler (maks 3 spørsmål)", () => {
    const n = parseNeedRules("Vi ser etter noe fint til kontoret", NOW);
    expect(n.missing_critical).toEqual(["category", "quantity", "location"]);
    expect(followUps(n)).toHaveLength(3);
  });
  it("hev/senk-skrivebord og datoformat", () => {
    const n = parseNeedRules("15 hev/senk skrivebord til Asker innen 15. januar", NOW);
    expect(n.items[0].category).toBe("desk");
    expect(n.items[0].quantity.target).toBe(15);
    expect(n.deadline).toBe("2027-01-15");
  });
});

describe("prising", () => {
  it("10 % påslag rundet opp til nærmeste tier", () => {
    expect(customerPrice(3170, DEFAULT_RULE)).toEqual({ price: 3490, margin: 320 });
  });
  it("minste påslag og mest spesifikke regel", () => {
    const rules = [DEFAULT_RULE, { scope: "category" as const, scopeValue: "desk", markupPct: 12, minMarkupNok: 300, rounding: "50" as const }];
    expect(pickRule(rules, { sourceKey: "mock", category: "desk" }).markupPct).toBe(12);
    expect(customerPrice(1000, pickRule(rules, { sourceKey: "mock", category: "desk" }))).toEqual({ price: 1300, margin: 300 });
  });
});

describe("matching", () => {
  const need = parseNeedRules(EXAMPLE, NOW);
  const line = need.items[0];
  const base: InventoryItem = {
    id: "i1", sourceKey: "mock", category: "office_chair", brand: "RH", model: "Logic 400", quantity: 24,
    condition: "used", municipality: "Oslo", locationText: "Oslo", sourcePrice: 3170, availability: "available",
  };
  const run = (item: Partial<InventoryItem>, extra = {}) =>
    matchItem({ need, line, lineNo: 1, item: { ...base, ...item }, rules: [DEFAULT_RULE], ...extra });

  it("delvis treff med forklaring og komplettering", () => {
    const m = run({}, { completionProduct: { slug: "rh-logic", name: "RH Logic" } })!;
    expect(m.customerPrice).toBe(3490);
    expect(m.coveredQty).toBe(24);
    expect(m.score).toBeGreaterThanOrEqual(80);
    expect(m.explanation).toMatch(/^\d+ % match\. Riktig merke, innenfor budsjett og ønsket område\. 24 tilgjengelig mot ønsket 30\.$/);
    expect(m.completion).toEqual({ missing: 6, suggestedProductSlug: "rh-logic", text: "Dette partiet dekker 24 av 30 kontorstoler. Vi kan komplettere de resterende 6 med nye RH Logic." });
  });
  it("harde krav filtrerer bort", () => {
    expect(run({ sourcePrice: 4800 })).toBeNull(); // 5 280 kr med påslag > 5 000
    expect(run({ category: "desk" })).toBeNull();
    expect(run({ condition: "new" })).toBeNull();
    expect(run({ availability: "gone" })).toBeNull();
  });
  it("annet merke godtas som «tilsvarende», men scorer lavere og flagges for semantisk vurdering", () => {
    const other = run({ brand: "Kinnarps", model: "8000", municipality: "Drammen" })!;
    expect(other.score).toBeLessThan(run({})!.score);
    expect(needsSemanticCheck(line, { ...base, brand: "Kinnarps" })).toBe(true);
  });
  it("«kun» merke avviser andre merker", () => {
    const strict = parseNeedRules("Kun HÅG, 10 kontorstoler i Oslo", NOW);
    expect(matchItem({ need: strict, line: strict.items[0], lineNo: 1, item: { ...base, brand: "Kinnarps" }, rules: [DEFAULT_RULE] })).toBeNull();
  });
  it("fjern geografi gir lavere poeng, men ikke utelukkelse", () => {
    const far = run({ municipality: "Bergen", locationText: "Bergen" })!;
    expect(far.breakdown.geo).toBe(2);
  });
});
