/**
 * Kvalitetsporter (docs/01-sitemap.md). En side indekseres og kommer i sitemap
 * KUN når porten er bestått – ellers noindex,follow. Brukes av sider, sitemap og tester.
 */
export type GateResult = { pass: boolean; reasons: string[] };

const words = (s?: string | null) => (s ?? "").trim().split(/\s+/).filter(Boolean).length;

export function gate(checks: [boolean, string][]): GateResult {
  const reasons = checks.filter(([ok]) => !ok).map(([, why]) => why);
  return { pass: reasons.length === 0, reasons };
}

export function solutionGate(x: { bodyWords: number; projects: number; productsOrBrands: number; seoDescription?: string | null }): GateResult {
  return gate([
    [x.bodyWords >= 400, "under 400 ord eget innhold"],
    [x.projects >= 1, "mangler prosjekt"],
    [x.productsOrBrands >= 3, "færre enn 3 produkter/merker"],
    [Boolean(x.seoDescription), "mangler meta description"],
  ]);
}

export function categoryGate(x: { bodyWords: number; products: number; brands: number; projects: number; seoDescription?: string | null }): GateResult {
  return gate([
    [x.bodyWords >= 400, "under 400 ord rådgivende innhold"],
    [x.products >= 4 || x.brands >= 3, "færre enn 4 produkter og færre enn 3 merker"],
    [x.projects >= 1, "mangler prosjekt"],
    [Boolean(x.seoDescription), "mangler meta description"],
  ]);
}

export function brandGate(x: { introMd?: string | null; whyWeUseMd?: string | null; products: number; projects: number }): GateResult {
  return gate([
    [words(x.introMd) + words(x.whyWeUseMd) >= 250, "under 250 ord (intro + hvorfor vi bruker merket)"],
    [x.products >= 3 || x.projects >= 1, "færre enn 3 produkter og ingen prosjekter"],
  ]);
}

export function projectGate(x: { clientName?: string | null; industry?: string | null; images: number; challengeMd?: string | null; solutionMd?: string | null; resultMd?: string | null; solutions: number }): GateResult {
  return gate([
    [Boolean(x.clientName || x.industry), "mangler kunde eller bransje"],
    [x.images >= 4, "færre enn 4 bilder"],
    [Boolean(x.challengeMd && x.solutionMd && x.resultMd), "mangler utfordring/løsning/resultat"],
    [x.solutions >= 1, "ingen koblet løsning"],
  ]);
}

export function articleGate(x: { bodyWords: number; author?: string | null; published?: string | null; links: number }): GateResult {
  return gate([
    [x.bodyWords >= 600, "under 600 ord"],
    [Boolean(x.author), "mangler forfatter"],
    [Boolean(x.published), "mangler publiseringsdato"],
    [x.links >= 1, "ingen lenke til løsning/kategori/merke"],
  ]);
}

/** Endelig robots-beslutning: overstyring i admin vinner, ellers kvalitetsporten */
export function shouldIndex(result: GateResult, override?: "index" | "noindex" | null): boolean {
  if (override === "noindex") return false;
  if (override === "index") return true;
  return result.pass;
}

export { words as countWords };
