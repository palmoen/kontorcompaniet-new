/**
 * src/lib/content/seed.ts → supabase/seed/content.sql
 *
 * Gir Supabase samme startinnhold som seed-modus, slik at nettstedet ser likt ut når
 * NEXT_PUBLIC_SUPABASE_URL slås på. Idempotent: eksisterende rader (slug/navn) røres ikke,
 * så endringer gjort i admin overskrives aldri. Kjøres av `supabase db push --include-seed`.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { certificationNames, seedBrands, seedCategories, seedPeople, seedProducts, seedProjects, seedSolutions, seedTestimonials } from "../src/lib/content/seed";
import { defaultSiteSettings } from "../src/lib/site/settings";

type Value = string | number | boolean | null | undefined | string[];

function lit(v: Value): string {
  if (v == null) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `array[${v.map(lit).join(", ")}]::text[]`;
  return `'${v.replace(/'/g, "''")}'`;
}

/** VALUES-rader. `tail` er rå SQL som legges til hver rad (f.eks. status og tidspunkt). */
const values = (rows: Value[][], tail = "") => rows.map((r) => `  (${r.map(lit).join(", ")}${tail})`).join(",\n");
const PUBLISHED = ", 'published', now()";

const out: string[] = [
  "-- GENERERT av scripts/build-content-seed.ts fra src/lib/content/seed.ts. Ikke rediger for hånd:",
  "-- endre seed.ts og kjør `npm run content:seed`.",
  "-- Idempotent startinnhold for produksjon. Eksisterende rader røres ikke (admin-endringer beholdes).",
  "-- Uten egen transaksjon (Supabase CLI styrer den); hver setning tåler å kjøres på nytt.",
  "",
  "-- Nettstedsinnstillinger: raden lages i migreringen; fyll inn det som mangler",
  `update content.site_settings set org_number = ${lit(defaultSiteSettings.orgNumber)} where org_number is null;`,
  "",
  "insert into content.categories (slug, name, sort, status, published_at) values",
  values(seedCategories.map((c) => [c.slug, c.name, c.sort]), PUBLISHED),
  "on conflict (slug) do nothing;",
  "",
  "insert into content.brands (slug, name, country, parent_company, website_url, has_page, status, published_at) values",
  values(seedBrands.map((b) => [b.slug, b.name, b.country, b.parentCompany, b.websiteUrl, b.hasPage]), PUBLISHED),
  "on conflict (slug) do nothing;",
  "",
  "insert into content.brand_categories (brand_id, category_id)",
  "select b.id, c.id from (values",
  values(seedBrands.flatMap((b) => b.categories.map((c) => [b.slug, c]))),
  ") v (brand, category)",
  "join content.brands b on b.slug = v.brand join content.categories c on c.slug = v.category",
  "on conflict do nothing;",
  "",
  `insert into content.solutions (slug, name, "group", summary, priority, sort, status, published_at) values`,
  values(seedSolutions.map((s) => [s.slug, s.name, s.group, s.summary, s.priority, s.sort]), PUBLISHED),
  "on conflict (slug) do nothing;",
  "",
  "insert into content.solution_categories (solution_id, category_id, sort)",
  "select s.id, c.id, v.sort from (values",
  values(seedSolutions.flatMap((s) => s.categories.map((c, i) => [s.slug, c, i]))),
  ") v (solution, category, sort)",
  "join content.solutions s on s.slug = v.solution join content.categories c on c.slug = v.category",
  "on conflict do nothing;",
  "",
  "insert into content.certifications (slug, name) values",
  values(Object.entries(certificationNames)),
  "on conflict (slug) do nothing;",
  "",
  "insert into content.products (slug, name, brand_id, primary_category_id, tagline, featured, sort, status, published_at)",
  "select v.slug, v.name, b.id, c.id, v.tagline, v.featured, v.sort, 'published', now() from (values",
  values(seedProducts.map((p, i) => [p.slug, p.name, p.brandSlug, p.categorySlug, p.tagline, Boolean(p.featured), i + 1])),
  ") v (slug, name, brand, category, tagline, featured, sort)",
  "join content.brands b on b.slug = v.brand join content.categories c on c.slug = v.category",
  "on conflict (slug) do nothing;",
  "",
  "insert into content.product_certifications (product_id, certification_id)",
  "select p.id, ce.id from (values",
  values(seedProducts.flatMap((p) => p.certifications.map((c) => [p.slug, c]))),
  ") v (product, cert)",
  "join content.products p on p.slug = v.product join content.certifications ce on ce.slug = v.cert",
  "on conflict do nothing;",
  "",
  "-- Produktbilder fra dagens nettsted (public/images/produkter). Rettighetene er IKKE bekreftet",
  "-- (docs/00, åpent spørsmål 8), så de vises ikke før rights settes til 'manufacturer_licensed'.",
  "insert into content.media_assets (storage_path, mime, alt_text, rights, rights_note) values",
  values(seedProducts.filter((p) => p.image).map((p) => [p.image!, "image/webp", p.name, "unknown",
    "Hentet fra dagens kontorcompaniet.no, trolig produsentbilde. Bekreft lisens før publisering."])),
  "on conflict (storage_path) do nothing;",
  "",
  "insert into content.product_media (product_id, media_id, role)",
  "select p.id, m.id, 'primary' from (values",
  values(seedProducts.filter((p) => p.image).map((p) => [p.slug, p.image!])),
  ") v (product, path)",
  "join content.products p on p.slug = v.product join content.media_assets m on m.storage_path = v.path",
  "on conflict do nothing;",
  "",
  "insert into content.projects (slug, title, client_name, client_display, location_text, year, workstations, scope,",
  "                              challenge_md, solution_md, result_md, video_urls, featured, sort, status, published_at) values",
  values(seedProjects.map((p, i) => [p.slug, p.title, p.clientName ?? p.title, p.clientName ? "named" : "anonymous", p.location,
    p.year, p.workstations, p.scope, p.challengeMd, p.solutionMd, p.resultMd, p.videoUrls, p.featured, i + 1]), PUBLISHED),
  "on conflict (slug) do nothing;",
  "",
];

const links = (kind: "solution" | "product" | "brand", table: string, col: string, target: string) => {
  const rows = seedProjects.flatMap((p) => p.links.filter((l) => l.kind === kind).map((l) => [p.slug, l.slug]));
  if (!rows.length) return;
  out.push(
    `insert into content.${table} (project_id, ${col})`,
    "select pr.id, t.id from (values",
    values(rows),
    ") v (project, target)",
    `join content.projects pr on pr.slug = v.project join content.${target} t on t.slug = v.target`,
    "on conflict do nothing;",
    "",
  );
};
links("solution", "project_solutions", "solution_id", "solutions");
links("product", "project_products", "product_id", "products");
links("brand", "project_brands", "brand_id", "brands");

out.push(
  "-- Sitater publiseres ikke før tillatelsen er bekreftet (permission_confirmed_at)",
  "insert into content.testimonials (quote, person_name, person_title, company, project_id, permission_confirmed_at, sort)",
  "select v.quote, v.person_name, v.person_title, v.company, pr.id, case when v.confirmed then now() end, v.sort from (values",
  values(seedTestimonials.map((t, i) => [t.quote, t.personName, t.personTitle, t.company, t.projectSlug, t.permissionConfirmed, i + 1])),
  ") v (quote, person_name, person_title, company, project, confirmed, sort)",
  "left join content.projects pr on pr.slug = v.project",
  "where not exists (select 1 from content.testimonials t where t.quote = v.quote);",
  "",
  "insert into content.people (name, role_title, phone, email, handles, sort)",
  "select v.name, v.role_title, v.phone, v.email::citext, v.handles, v.sort from (values",
  values(seedPeople.map((p, i) => [p.name, p.roleTitle, p.phone, p.email, p.handles, i + 1])),
  ") v (name, role_title, phone, email, handles, sort)",
  "where not exists (select 1 from content.people pe where pe.name = v.name);",
  "",
);

const target = resolve(import.meta.dirname, "../supabase/seed/content.sql");
writeFileSync(target, out.join("\n"));
console.log(`Skrev ${target}`);
