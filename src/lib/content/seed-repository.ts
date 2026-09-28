import { defaultSiteSettings } from "@/lib/site/settings";
import type { ContentRepository } from "./repository";
import { seedBrands, seedCategories, seedPeople, seedProjects, seedSolutions, seedTestimonials } from "./seed";

export const seedRepository: ContentRepository = {
  async getSiteSettings() { return defaultSiteSettings; },
  async listCategories() { return [...seedCategories].sort((a, b) => a.sort - b.sort); },
  async listBrands() { return seedBrands; },
  async listSolutions() { return [...seedSolutions].sort((a, b) => a.sort - b.sort); },
  async listProjects() { return seedProjects; },
  async listProductCards() { return []; }, // produktkort legges inn i fase 3/4
  async listTestimonials() {
    return seedTestimonials
      .filter((t) => t.permissionConfirmed)
      .map((t) => ({ quote: t.quote, personName: t.personName, personTitle: t.personTitle, company: t.company, projectSlug: t.projectSlug }));
  },
  async listPeople() { return seedPeople; },
};
