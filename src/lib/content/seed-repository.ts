import { defaultSiteSettings } from "@/lib/site/settings";
import type { ContentRepository } from "./repository";
import { seedBrands, seedCategories, seedPeople, seedProducts, seedProjects, seedSolutions, seedTestimonials } from "./seed";

export const seedRepository: ContentRepository = {
  async getSiteSettings() { return defaultSiteSettings; },
  async listCategories() { return [...seedCategories].sort((a, b) => a.sort - b.sort); },
  async listBrands() { return seedBrands; },
  async listSolutions() { return [...seedSolutions].sort((a, b) => a.sort - b.sort); },
  async listProjects() { return seedProjects; },
  async listProductCards(filter) {
    return seedProducts.filter((p) =>
      (!filter?.brandSlug || p.brandSlug === filter.brandSlug) && (!filter?.categorySlug || p.categorySlug === filter.categorySlug));
  },
  async listTestimonials() {
    return seedTestimonials
      .filter((t) => t.permissionConfirmed)
      .map((t) => ({ quote: t.quote, personName: t.personName, personTitle: t.personTitle, company: t.company, projectSlug: t.projectSlug }));
  },
  async listPeople() { return seedPeople; },
};
