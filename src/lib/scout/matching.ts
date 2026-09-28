/**
 * Deterministisk matching: billig filter først, så poengsum 0–100 med forklaring.
 * Delvise treff er tillatt (24 av 30) og får forslag om komplettering med nye produkter.
 * AI brukes kun for «tilsvarende»-vurderinger i gråsonen (se ai/provider.ts).
 */
import { SCOUT_CATEGORIES, type Condition, type NeedItem, type ScoutNeed } from "./need";
import { customerPrice, pickRule, type PricingRule } from "./pricing";

export type InventoryItem = {
  id: string;
  sourceKey: string;
  category: string;
  brand: string | null;
  model: string | null;
  quantity: number;
  condition: Condition | null;
  municipality: string | null;
  locationText: string | null;
  sourcePrice: number | null;
  availability: "available" | "reserved" | "gone" | "unknown";
};

export type ScoreBreakdown = { model: number; price: number; quantity: number; geo: number; condition: number; semantic: number };

export type MatchResult = {
  itemId: string;
  lineNo: number;
  score: number;
  breakdown: ScoreBreakdown;
  explanation: string;
  coveredQty: number;
  customerPrice: number | null;
  margin: number | null;
  sourcePrice: number | null;
  completion: { missing: number; text: string; suggestedProductSlug: string | null } | null;
};

export const MATCH_THRESHOLD = 50;

// Grov regional nærhet for Østlandet (logistikk er løsbart – derfor poeng, ikke filter)
const REGIONS: string[][] = [
  ["oslo", "nydalen", "skøyen", "lysaker", "fornebu", "bærum", "sandvika", "asker", "lillestrøm", "ski", "jessheim", "gardermoen", "østlandet", "viken"],
  ["drammen", "lier", "asker", "kongsberg", "hønefoss", "tønsberg", "sandefjord", "larvik", "holmestrand", "viken", "østlandet"],
  ["bergen"], ["stavanger", "sandnes", "haugesund"], ["trondheim"], ["kristiansand"],
];

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();

function geoScore(item: InventoryItem, locations: string[]): { points: number; label: string | null } {
  if (!locations.length) return { points: 10, label: null };
  const place = norm(item.municipality ?? item.locationText);
  if (!place) return { points: 5, label: null };
  const wanted = locations.map(norm);
  if (wanted.some((w) => place.includes(w) || w.includes(place))) return { points: 15, label: "ønsket område" };
  if (REGIONS.some((r) => r.includes(place) && wanted.some((w) => r.includes(w)))) return { points: 9, label: "nærliggende område" };
  return { points: 2, label: null };
}

function modelScore(item: InventoryItem, line: NeedItem): { points: number; label: string | null; brandOk: boolean } {
  const brand = norm(item.brand);
  const model = norm(`${item.brand ?? ""} ${item.model ?? ""}`);
  const modelHit = (m: string) => model.includes(norm(m)) || (Boolean(item.model) && norm(m).includes(norm(item.model)));
  if (line.models.some(modelHit)) {
    return { points: 30, label: "riktig modell", brandOk: true };
  }
  if (!line.brands.length) return { points: 18, label: null, brandOk: true };
  if (line.brands.some((b) => norm(b) === brand)) return { points: 24, label: "riktig merke", brandOk: true };
  return { points: line.accept_alternatives ? 8 : 0, label: null, brandOk: line.accept_alternatives };
}

function conditionScore(c: Condition | null, wanted: Condition[]): number {
  if (!c) return 5;
  if (!wanted.includes(c)) return 0;
  return c === "refurbished" ? 10 : c === "demo" ? 9 : 8;
}

export function matchItem(opts: {
  need: ScoutNeed;
  line: NeedItem;
  lineNo: number;
  item: InventoryItem;
  rules: PricingRule[];
  completionProduct?: { slug: string; name: string } | null;
  semanticBonus?: number; // 0–15 fra AI-vurdering i gråsonen
}): MatchResult | null {
  const { need, line, item } = opts;

  // --- Deterministisk filter (harde krav) ---
  if (item.availability !== "available" || item.quantity < 1) return null;
  if (norm(item.category) !== line.category) return null;
  if (item.condition && !line.condition.includes(item.condition)) return null;
  const m = modelScore(item, line);
  if (!m.brandOk) return null;

  const priced = item.sourcePrice != null ? customerPrice(item.sourcePrice, pickRule(opts.rules, { sourceKey: item.sourceKey, category: item.category })) : null;
  if (line.max_unit_price_ex_vat != null && priced && priced.price > line.max_unit_price_ex_vat) return null;

  // --- Poeng ---
  const priceWithin = line.max_unit_price_ex_vat != null && priced != null;
  const pricePoints = priceWithin ? 25 : priced ? 18 : 10;
  const covered = Math.min(item.quantity, line.quantity.target);
  const coverage = covered / line.quantity.target;
  const qtyPoints = Math.round(coverage * 20);
  const geo = geoScore(item, need.locations);
  const condPoints = conditionScore(item.condition, line.condition);
  const semantic = Math.max(0, Math.min(15, opts.semanticBonus ?? 0));
  const breakdown: ScoreBreakdown = { model: m.points, price: pricePoints, quantity: qtyPoints, geo: geo.points, condition: condPoints, semantic };
  const score = Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0));
  if (score < MATCH_THRESHOLD) return null;

  // --- Forklaring (fra poengkomponentene, ikke AI) ---
  const good = [m.label, priceWithin ? "innenfor budsjett" : null, geo.label].filter(Boolean) as string[];
  const cat = SCOUT_CATEGORIES[line.category];
  let explanation = `${score} % match.`;
  if (good.length) explanation += ` ${good.join(", ").replace(/, ([^,]*)$/, " og $1").replace(/^./, (c) => c.toUpperCase())}.`;
  explanation += covered >= line.quantity.target
    ? ` Dekker hele behovet på ${line.quantity.target}.`
    : ` ${item.quantity} tilgjengelig mot ønsket ${line.quantity.target}.`;

  const missing = line.quantity.target - covered;
  const completion = missing > 0
    ? {
        missing,
        suggestedProductSlug: opts.completionProduct?.slug ?? null,
        text: `Dette partiet dekker ${covered} av ${line.quantity.target} ${cat.many}. Vi kan komplettere de resterende ${missing}${
          opts.completionProduct ? ` med nye ${opts.completionProduct.name}` : " med nye"
        }.`,
      }
    : null;

  return {
    itemId: item.id, lineNo: opts.lineNo, score, breakdown, explanation, coveredQty: covered,
    customerPrice: priced?.price ?? null, margin: priced?.margin ?? null, sourcePrice: item.sourcePrice, completion,
  };
}

/** Gråsone: kandidater som bare feilet på merke, der kunden godtar «tilsvarende» */
export function needsSemanticCheck(line: NeedItem, item: InventoryItem): boolean {
  return line.accept_alternatives && line.brands.length > 0 && !line.brands.some((b) => norm(b) === norm(item.brand)) && norm(item.category) === line.category;
}
