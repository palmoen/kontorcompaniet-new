import "server-only";
import { cache } from "react";
import { readDoc } from "@/lib/content/files";
import { countWords, splitFaq } from "@/lib/content/markdown-parse";
import { content } from "@/lib/content/repository";
import type { Brand, Category, Project, Solution } from "@/lib/content/types";
import { articleGate, brandGate, categoryGate, projectGate, shouldIndex, solutionGate, type GateResult } from "@/lib/seo/quality";

/**
 * Samler innhold, koblinger og kvalitetsport per side. Brukes av sidene selv og av sitemap,
 * slik at «indekseres» og «står i sitemap» alltid er samme beslutning.
 */

export const projectImages: Record<string, string[]> = {
  "norwegian-fornebu": ["/images/prosjekter/norwegian-fornebu.webp", "/images/prosjekter/norwegian-fornebu-2.webp"],
};

const projectsForSolutions = (projects: Project[], solutionSlugs: string[]) =>
  projects.filter((p) => p.links.some((l) => l.kind === "solution" && solutionSlugs.includes(l.slug)));

export const getAdvisor = cache(async () => {
  const people = await content.listPeople();
  return people.find((p) => p.handles.includes("salg")) ?? people[0];
});

export const solutionPage = cache(async (slug: string) => {
  const [solutions, projects, brands, doc] = await Promise.all([
    content.listSolutions(), content.listProjects(), content.listBrands(), readDoc("losninger", slug),
  ]);
  const solution = solutions.find((s) => s.slug === slug);
  if (!solution || !doc) return null;
  const categories = (await content.listCategories()).filter((c) => solution.categories.includes(c.slug));
  const related = projectsForSolutions(projects, [slug]);
  const relBrands = brands.filter((b) => b.hasPage && b.categories.some((c) => solution.categories.includes(c)));
  const { body, faq } = splitFaq(doc.body);
  const gate = solutionGate({
    bodyWords: countWords(doc.body), projects: related.length, productsOrBrands: relBrands.length,
    seoDescription: solution.seoDescription ?? doc.data.description,
  });
  return { solution, doc, body, faq, categories, projects: related, brands: relBrands, gate, index: shouldIndex(gate, solution.robotsOverride) };
});

export const categoryPage = cache(async (slug: string) => {
  const [categories, solutions, projects, brands, doc] = await Promise.all([
    content.listCategories(), content.listSolutions(), content.listProjects(), content.listBrands(), readDoc("produkter", slug),
  ]);
  const category = categories.find((c) => c.slug === slug);
  if (!category || !doc) return null;
  const products = await content.listProductCards(undefined, slug);
  const relSolutions = solutions.filter((s) => s.categories.includes(slug));
  const related = projectsForSolutions(projects, relSolutions.map((s) => s.slug));
  const relBrands = brands.filter((b) => b.categories.includes(slug));
  const { body, faq } = splitFaq(doc.body);
  const gate = categoryGate({
    bodyWords: countWords(doc.body), products: products.length, brands: relBrands.length, projects: related.length,
    seoDescription: category.seoDescription ?? doc.data.description,
  });
  return { category, doc, body, faq, products, solutions: relSolutions, projects: related, brands: relBrands, gate, index: shouldIndex(gate, category.robotsOverride) };
});

export const brandPage = cache(async (slug: string) => {
  const [brands, categories, projects, doc] = await Promise.all([
    content.listBrands(), content.listCategories(), content.listProjects(), readDoc("merkevarer", slug),
  ]);
  const brand = brands.find((b) => b.slug === slug);
  if (!brand) return null;
  const products = await content.listProductCards(slug);
  const relProjects = projects.filter((p) => p.links.some((l) => l.kind === "brand" && l.slug === slug));
  const text = [brand.introMd, brand.whyWeUseMd, doc?.body].filter(Boolean).join("\n\n");
  const gate = brandGate({ introMd: text, whyWeUseMd: null, products: products.length, projects: relProjects.length });
  // Merker uten egen tekst får en enkel side (redirect-mål), men indekseres ikke
  const index = brand.hasPage && shouldIndex(gate, brand.robotsOverride);
  return {
    brand, doc, text, products, projects: relProjects, gate, index,
    categories: categories.filter((c) => brand.categories.includes(c.slug)),
  };
});

export const projectPage = cache(async (slug: string) => {
  const [projects, doc] = await Promise.all([content.listProjects(), readDoc("prosjekter", slug)]);
  const project = projects.find((p) => p.slug === slug);
  if (!project) return null;
  const images = projectImages[slug] ?? [];
  const gate = projectGate({
    clientName: project.clientName, images: images.length, challengeMd: project.challengeMd, solutionMd: project.solutionMd,
    resultMd: project.resultMd, solutions: project.links.filter((l) => l.kind === "solution").length,
  });
  return { project, doc, images, gate, index: shouldIndex(gate, project.robotsOverride) };
});

export const ARTICLES = ["ergonomi-pa-arbeidsplassen", "stoy-og-akustikk-pa-kontoret"] as const;

export const articlePage = cache(async (slug: string) => {
  if (!(ARTICLES as readonly string[]).includes(slug)) return null;
  const doc = await readDoc("inspirasjon", slug);
  if (!doc) return null;
  const links = (doc.body.match(/\]\(\/(losninger|produkter|merkevarer)\//g) ?? []).length;
  const gate = articleGate({ bodyWords: countWords(doc.body), author: doc.data.author, published: doc.data.published, links });
  return { doc, gate, index: shouldIndex(gate) };
});

/** Enkle sider: publiserte (indekseres) og utkast (noindex til de er gjennomgått) */
export const SIMPLE_PAGES = {
  "om-oss": { title: "Om oss", draft: false },
  "baerekraft": { title: "Miljø og bærekraft", draft: false },
  "brukt": { title: "Brukte kontormøbler", draft: false },
  "salgsbetingelser": { title: "Salgsbetingelser", draft: true },
  "informasjonskapsler": { title: "Informasjonskapsler", draft: true },
} as const;

export type GateRow = { path: string; index: boolean; gate: GateResult };

/** Alle innholdssider med portstatus (sitemap + oversikt i admin/rapport) */
export async function allGatedPages(): Promise<GateRow[]> {
  const [solutions, categories, brands, projects] = await Promise.all([
    content.listSolutions(), content.listCategories(), content.listBrands(), content.listProjects(),
  ]);
  const rows: GateRow[] = [];
  for (const s of solutions as Solution[]) {
    const p = await solutionPage(s.slug);
    if (p) rows.push({ path: `/losninger/${s.slug}`, index: p.index, gate: p.gate });
  }
  for (const c of categories as Category[]) {
    const p = await categoryPage(c.slug);
    if (p) rows.push({ path: `/produkter/${c.slug}`, index: p.index, gate: p.gate });
  }
  for (const b of brands as Brand[]) {
    const p = await brandPage(b.slug);
    if (p) rows.push({ path: `/merkevarer/${b.slug}`, index: p.index, gate: p.gate });
  }
  for (const pr of projects) {
    const p = await projectPage(pr.slug);
    if (p) rows.push({ path: `/prosjekter/${pr.slug}`, index: p.index, gate: p.gate });
  }
  for (const a of ARTICLES) {
    const p = await articlePage(a);
    if (p) rows.push({ path: `/inspirasjon/${a}`, index: p.index, gate: p.gate });
  }
  return rows;
}
