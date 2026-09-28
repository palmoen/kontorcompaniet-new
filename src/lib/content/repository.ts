import "server-only";
import { cache } from "react";
import { hasSupabase } from "@/lib/env";
import type { SiteSettings } from "@/lib/site/settings";
import type { Brand, Category, Person, ProductCard, Project, Solution, Testimonial } from "./types";
import { seedRepository } from "./seed-repository";
import { supabaseRepository } from "./supabase-repository";

/**
 * Alt innhold leses gjennom dette grensesnittet. Sidene vet ikke om innholdet
 * kommer fra Supabase, seed eller (senere) MDX – å flytte innhold er en dataendring.
 */
export interface ContentRepository {
  getSiteSettings(): Promise<SiteSettings>;
  listCategories(): Promise<Category[]>;
  listBrands(): Promise<Brand[]>;
  listSolutions(): Promise<Solution[]>;
  listProjects(): Promise<Project[]>;
  listProductCards(filter?: { brandSlug?: string; categorySlug?: string }): Promise<ProductCard[]>;
  listTestimonials(): Promise<Testimonial[]>;
  listPeople(): Promise<Person[]>;
}

function pick(): ContentRepository {
  return hasSupabase ? supabaseRepository : seedRepository;
}

// Memoisert per forespørsel
export const content = {
  getSiteSettings: cache(() => pick().getSiteSettings()),
  listCategories: cache(() => pick().listCategories()),
  listBrands: cache(() => pick().listBrands()),
  listSolutions: cache(() => pick().listSolutions()),
  listProjects: cache(() => pick().listProjects()),
  listProductCards: cache((brandSlug?: string, categorySlug?: string) => pick().listProductCards({ brandSlug, categorySlug })),
  listTestimonials: cache(() => pick().listTestimonials()),
  listPeople: cache(() => pick().listPeople()),
};
