import "server-only";
import { getPublicClient } from "@/lib/supabase/server";
import { defaultSiteSettings, type SiteSettings } from "@/lib/site/settings";
import type { ContentRepository } from "./repository";
import type { Brand, Category, Person, ProductCard, Project, Solution, Testimonial } from "./types";

type Row = Record<string, unknown>;

/** Det lille utsnittet av PostgREST-bygget vi bruker (holder typene lesbare). */
type Query = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> & {
  order(column: string): Query;
  eq(column: string, value: string): Query;
};

async function select<T extends Row>(view: string, refine?: (q: Query) => Query): Promise<T[]> {
  const client = getPublicClient();
  if (!client) return [];
  const base = client.from(view).select("*") as unknown as Query;
  const { data, error } = await (refine ? refine(base) : base);
  if (error) throw new Error(`Supabase ${view}: ${error.message}`);
  return (data ?? []) as T[];
}

const str = (v: unknown) => (v == null ? null : String(v));

export const supabaseRepository: ContentRepository = {
  async getSiteSettings(): Promise<SiteSettings> {
    const [r] = await select<Row>("site_settings_v");
    if (!r) return defaultSiteSettings;
    return {
      companyName: String(r.company_name),
      legalName: String(r.legal_name),
      orgNumber: str(r.org_number),
      streetAddress: String(r.street_address),
      addressNote: str(r.address_note),
      postalCode: String(r.postal_code),
      city: String(r.city),
      country: String(r.country),
      geo: r.geo_lat != null && r.geo_lng != null ? { lat: Number(r.geo_lat), lng: Number(r.geo_lng) } : null,
      phone: String(r.phone),
      emailGeneral: String(r.email_general),
      openingHours: (r.opening_hours as SiteSettings["openingHours"]) ?? [],
      social: (r.social as SiteSettings["social"]) ?? {},
      foundedYear: Number(r.founded_year),
      certifications: (r.certifications as string[]) ?? [],
    };
  },
  async listCategories(): Promise<Category[]> {
    const rows = await select<Row>("categories_v", (q) => q.order("sort"));
    return rows.map((r) => ({
      slug: String(r.slug), name: String(r.name), sort: Number(r.sort), introMd: str(r.intro_md),
      seoTitle: str(r.seo_title), seoDescription: str(r.seo_description),
      robotsOverride: r.robots_override as Category["robotsOverride"], canonicalOverride: str(r.canonical_override),
      updatedAt: String(r.updated_at),
    }));
  },
  async listBrands(): Promise<Brand[]> {
    const [rows, links] = await Promise.all([select<Row>("brands_v", (q) => q.order("name")), select<Row>("brand_categories_v")]);
    return rows.map((r) => ({
      slug: String(r.slug), name: String(r.name), country: str(r.country), parentCompany: str(r.parent_company),
      websiteUrl: str(r.website_url), introMd: str(r.intro_md), whyWeUseMd: str(r.why_we_use_md),
      sustainabilityMd: str(r.sustainability_md), hasPage: Boolean(r.has_page),
      categories: links.filter((l) => l.brand_slug === r.slug).map((l) => String(l.category_slug)),
      seoTitle: str(r.seo_title), seoDescription: str(r.seo_description),
      robotsOverride: r.robots_override as Brand["robotsOverride"], canonicalOverride: str(r.canonical_override),
      updatedAt: String(r.updated_at),
    }));
  },
  async listSolutions(): Promise<Solution[]> {
    const rows = await select<Row>("solutions_v", (q) => q.order("sort"));
    return rows.map((r) => ({
      slug: String(r.slug), name: String(r.name), group: r.group as Solution["group"], summary: str(r.summary),
      priority: r.priority as Solution["priority"], sort: Number(r.sort),
      seoTitle: str(r.seo_title), seoDescription: str(r.seo_description),
      robotsOverride: r.robots_override as Solution["robotsOverride"], canonicalOverride: str(r.canonical_override),
      updatedAt: String(r.updated_at),
    }));
  },
  async listProjects(): Promise<Project[]> {
    const [rows, links] = await Promise.all([select<Row>("projects_v", (q) => q.order("sort")), select<Row>("project_links_v")]);
    return rows.map((r) => ({
      slug: String(r.slug), title: String(r.title), clientName: str(r.client_name), location: str(r.location_text),
      year: r.year == null ? null : Number(r.year), workstations: r.workstations == null ? null : Number(r.workstations),
      scope: str(r.scope), challengeMd: str(r.challenge_md), solutionMd: str(r.solution_md), resultMd: str(r.result_md),
      videoUrls: (r.video_urls as string[]) ?? [], imageCount: r.hero_media_id ? 1 : 0,
      links: links.filter((l) => l.project_slug === r.slug)
        .map((l) => ({ kind: l.kind as Project["links"][number]["kind"], slug: String(l.target_slug), name: String(l.target_name) })),
      featured: Boolean(r.featured),
      seoTitle: str(r.seo_title), seoDescription: str(r.seo_description),
      robotsOverride: r.robots_override as Project["robotsOverride"], canonicalOverride: str(r.canonical_override),
      updatedAt: String(r.updated_at),
    }));
  },
  async listProductCards(filter): Promise<ProductCard[]> {
    const rows = await select<Row>("products_v", (q) => {
      let x = q.order("sort");
      if (filter?.brandSlug) x = x.eq("brand_slug", filter.brandSlug);
      if (filter?.categorySlug) x = x.eq("category_slug", filter.categorySlug);
      return x;
    });
    return rows.map((r) => ({
      slug: String(r.slug), name: String(r.name), brandSlug: String(r.brand_slug), brandName: String(r.brand_name),
      categorySlug: String(r.category_slug), tagline: str(r.tagline), certifications: (r.certifications as string[]) ?? [],
      hasPage: Boolean(r.has_page), updatedAt: String(r.updated_at),
    }));
  },
  async listTestimonials(): Promise<Testimonial[]> {
    const rows = await select<Row>("testimonials_v", (q) => q.order("sort"));
    return rows.map((r) => ({
      quote: String(r.quote), personName: String(r.person_name), personTitle: str(r.person_title),
      company: String(r.company), projectSlug: str(r.project_slug),
    }));
  },
  async listPeople(): Promise<Person[]> {
    const rows = await select<Row>("people_v", (q) => q.order("sort"));
    return rows.map((r) => ({
      name: String(r.name), roleTitle: str(r.role_title), phone: str(r.phone), email: str(r.email),
      handles: (r.handles as string[]) ?? [],
    }));
  },
};
