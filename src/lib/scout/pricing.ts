/**
 * Kundepris på bruktvare: kildepris + konfigurerbart påslag (standard 10 %).
 * Bruktvaren er inngangen til totalleveransen, ikke der marginen tas.
 */
export type PricingRule = {
  scope: "default" | "category" | "source";
  scopeValue: string | null;
  markupPct: number;
  minMarkupNok: number;
  rounding: "none" | "10" | "50" | "100";
};

export const DEFAULT_RULE: PricingRule = { scope: "default", scopeValue: null, markupPct: 10, minMarkupNok: 0, rounding: "10" };

/** Mest spesifikke regel vinner: kilde > kategori > standard */
export function pickRule(rules: PricingRule[], ctx: { sourceKey: string; category: string }): PricingRule {
  return (
    rules.find((r) => r.scope === "source" && r.scopeValue === ctx.sourceKey) ??
    rules.find((r) => r.scope === "category" && r.scopeValue === ctx.category) ??
    rules.find((r) => r.scope === "default") ??
    DEFAULT_RULE
  );
}

export function customerPrice(sourcePrice: number, rule: PricingRule): { price: number; margin: number } {
  const markup = Math.max(sourcePrice * (rule.markupPct / 100), rule.minMarkupNok);
  const raw = sourcePrice + markup;
  const step = rule.rounding === "none" ? 1 : Number(rule.rounding);
  const price = rule.rounding === "none" ? Math.round(raw * 100) / 100 : Math.ceil(raw / step) * step;
  return { price, margin: Math.round((price - sourcePrice) * 100) / 100 };
}
