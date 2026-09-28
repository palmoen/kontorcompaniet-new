import type { CategoryKey, Condition } from "../need";
import type { ScoutItemInput, ScoutRawItem, ScoutSourceAdapter } from "./types";

/**
 * MOCK-KILDE: realistisk, deterministisk testlager for utvikling og tester.
 * Ekte kilder kobles på én etter én etter teknisk og juridisk vurdering.
 */
const INVENTORY: (Omit<ScoutItemInput, "images" | "sourceUrl" | "description" | "material"> & { note?: string })[] = [
  { externalId: "m-001", category: "office_chair", brand: "RH", model: "Logic 400", title: "RH Logic 400, sort tekstil", quantity: 24, condition: "used", color: "sort", locationText: "Oslo", municipality: "Oslo", sourcePrice: 3170 },
  { externalId: "m-002", category: "office_chair", brand: "HÅG", model: "Futu", title: "HÅG Futu, grå", quantity: 12, condition: "refurbished", color: "grå", locationText: "Drammen", municipality: "Drammen", sourcePrice: 3860 },
  { externalId: "m-003", category: "office_chair", brand: "HÅG", model: "Capisco 8106", title: "HÅG Capisco 8106, sort", quantity: 6, condition: "used", color: "sort", locationText: "Bergen", municipality: "Bergen", sourcePrice: 4200 },
  { externalId: "m-004", category: "office_chair", brand: "Kinnarps", model: "8000", title: "Kinnarps 8000-serien", quantity: 40, condition: "used", color: "sort", locationText: "Trondheim", municipality: "Trondheim", sourcePrice: 1500 },
  { externalId: "m-005", category: "office_chair", brand: "Vitra", model: "ID Trim", title: "Vitra ID Trim, utstillingsmodeller", quantity: 10, condition: "demo", color: "sort", locationText: "Oslo", municipality: "Oslo", sourcePrice: 5600 },
  { externalId: "m-006", category: "office_chair", brand: "Sedus", model: "se:motion", title: "Sedus se:motion", quantity: 15, condition: "used", color: "blå", locationText: "Asker", municipality: "Asker", sourcePrice: 2900 },
  { externalId: "m-007", category: "desk", brand: "Dencon", model: "hev/senk 160x80", title: "Dencon hev/senk-skrivebord 160×80", quantity: 18, condition: "used", color: "hvit", locationText: "Oslo", municipality: "Oslo", sourcePrice: 2200 },
  { externalId: "m-008", category: "meeting_table", brand: "Fora Form", model: "Kvart 240", title: "Fora Form Kvart møtebord 240 cm", quantity: 1, condition: "used", color: "eik", locationText: "Drammen", municipality: "Drammen", sourcePrice: 9000 },
  { externalId: "m-009", category: "acoustics", brand: "Abstracta", model: "Soneo", title: "Abstracta Soneo bordskjerm", quantity: 30, condition: "used", color: "grå", locationText: "Asker", municipality: "Asker", sourcePrice: 450 },
  { externalId: "m-010", category: "storage", brand: "Dencon", model: "Skap 3xA4", title: "Dencon skap 3×A4", quantity: 8, condition: "used", color: "hvit", locationText: "Lier", municipality: "Lier", sourcePrice: 1400 },
];

export const mockAdapter: ScoutSourceAdapter = {
  adapter: "mock",
  async fetchItems({ category, config }) {
    // config.overrides lar tester simulere endringer (pris/antall/fjernet) mellom kjøringer
    const overrides = (config.overrides ?? {}) as Record<string, Partial<{ quantity: number; sourcePrice: number; gone: boolean }>>;
    return INVENTORY.filter((i) => i.category === category)
      .filter((i) => !overrides[i.externalId]?.gone)
      .map((i) => ({ ...i, ...overrides[i.externalId] })) as ScoutRawItem[];
  },
  normalize(raw) {
    const r = raw as (typeof INVENTORY)[number];
    if (!r.externalId || !r.category) return null;
    return {
      externalId: r.externalId, category: r.category as CategoryKey, brand: r.brand, model: r.model, title: r.title,
      description: null, quantity: Number(r.quantity), condition: (r.condition ?? null) as Condition | null, color: r.color,
      material: null, locationText: r.locationText, municipality: r.municipality, sourcePrice: r.sourcePrice,
      sourceUrl: `https://example.invalid/mock/${r.externalId}`, images: [],
    };
  },
};
