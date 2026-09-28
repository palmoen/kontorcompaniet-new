/**
 * supabase/seed/content.sql gir samme innhold i public-viewene som seed-modus (src/lib/content/seed.ts),
 * slik at nettstedet ikke endrer seg når Supabase slås på. Krever at content.sql er lagt på
 * (scripts/db-local.sh og CI gjør det før dev-seed). Kjøres når TEST_DATABASE_URL er satt.
 */
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { seedBrands, seedCategories, seedPeople, seedProducts, seedProjects, seedSolutions, seedTestimonials } from "@/lib/content/seed";
import { defaultSiteSettings } from "@/lib/site/settings";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("innholdsseed (database)", () => {
  const sql = postgres(url ?? "postgres://x", { prepare: false, max: 2, onnotice: () => {} });
  afterAll(async () => { await sql.end(); });

  const bySlug = (rows: readonly postgres.Row[]) => new Map(rows.map((r) => [String(r.slug), r]));

  it("kategorier, merker og merke ↔ kategori", async () => {
    const cats = await sql`select slug, name, sort from public.categories_v`;
    for (const c of seedCategories) expect(bySlug(cats).get(c.slug)).toMatchObject({ name: c.name, sort: c.sort });

    const brands = bySlug(await sql`select slug, name, country, parent_company, has_page from public.brands_v`);
    const links = await sql`select brand_slug, category_slug from public.brand_categories_v`;
    for (const b of seedBrands) {
      expect(brands.get(b.slug), b.slug).toMatchObject({ name: b.name, has_page: b.hasPage, country: b.country ?? null, parent_company: b.parentCompany ?? null });
      expect(links.filter((l) => l.brand_slug === b.slug).map((l) => l.category_slug).sort()).toEqual([...b.categories].sort());
    }
  });

  it("løsninger med kategorier i riktig rekkefølge", async () => {
    const rows = bySlug(await sql`select slug, name, "group", priority, sort from public.solutions_v`);
    const links = await sql`select solution_slug, category_slug from public.solution_categories_v order by sort`;
    for (const s of seedSolutions) {
      expect(rows.get(s.slug), s.slug).toMatchObject({ name: s.name, group: s.group, priority: s.priority, sort: s.sort });
      expect(links.filter((l) => l.solution_slug === s.slug).map((l) => l.category_slug)).toEqual(s.categories);
    }
  });

  it("produktkort: merke, kategori og sertifiseringer", async () => {
    const rows = bySlug(await sql`select slug, name, brand_slug, category_slug, tagline, featured, has_page, certifications from public.products_v`);
    for (const p of seedProducts) {
      expect(rows.get(p.slug), p.slug).toMatchObject({
        name: p.name, brand_slug: p.brandSlug, category_slug: p.categorySlug, tagline: p.tagline,
        featured: Boolean(p.featured), has_page: false, certifications: [...p.certifications].sort(),
      });
    }
  });

  it("produktbilder er registrert, men vises ikke før rettighetene er bekreftet", async () => {
    const withImage = seedProducts.filter((p) => p.image);
    const registered = await sql`select m.storage_path, m.rights, p.slug from content.product_media pm
                                 join content.media_assets m on m.id = pm.media_id join content.products p on p.id = pm.product_id
                                 where pm.role = 'primary'`;
    for (const p of withImage) expect(registered.find((r) => r.slug === p.slug)).toMatchObject({ storage_path: p.image, rights: "unknown" });
    const [shown] = await sql`select count(*)::int as n from public.products_v where primary_media_id is not null`;
    expect(shown.n).toBe(0);

    // Når admin bekrefter lisensen, dukker bildet opp i produktkortet (rulles tilbake)
    await sql.begin(async (tx) => {
      await tx`update content.media_assets set rights = 'manufacturer_licensed' where storage_path = ${withImage[0].image!}`;
      const [row] = await tx`select m.storage_path from public.products_v p join public.media_v m on m.id = p.primary_media_id where p.slug = ${withImage[0].slug}`;
      expect(row?.storage_path).toBe(withImage[0].image);
      throw new Error("rollback");
    }).catch((e: Error) => { if (e.message !== "rollback") throw e; });
  });

  it("prosjekter, koblinger, sitater, folk og innstillinger", async () => {
    const projects = bySlug(await sql`select slug, title, client_name, workstations from public.projects_v`);
    const links = await sql`select project_slug, kind, target_slug from public.project_links_v`;
    for (const p of seedProjects) {
      expect(projects.get(p.slug), p.slug).toMatchObject({ title: p.title, client_name: p.clientName, workstations: p.workstations ?? null });
      expect(links.filter((l) => l.project_slug === p.slug).map((l) => `${l.kind}:${l.target_slug}`).sort())
        .toEqual(p.links.map((l) => `${l.kind}:${l.slug}`).sort());
    }
    const quotes = await sql`select quote from public.testimonials_v`;
    expect(quotes.map((q) => q.quote).sort()).toEqual(seedTestimonials.filter((t) => t.permissionConfirmed).map((t) => t.quote).sort());
    const people = await sql`select name, role_title, handles from public.people_v`;
    for (const p of seedPeople) expect(people.find((x) => x.name === p.name)).toMatchObject({ role_title: p.roleTitle ?? null, handles: p.handles });
    const [settings] = await sql`select org_number, email_general, phone from public.site_settings_v`;
    expect(settings).toMatchObject({ org_number: defaultSiteSettings.orgNumber, email_general: defaultSiteSettings.emailGeneral, phone: defaultSiteSettings.phone });
  });
});
