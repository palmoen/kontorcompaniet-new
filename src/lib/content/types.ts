/** Domenetyper for offentlig innhold (speiler public.*_v i Supabase). */

export type SeoFields = {
  seoTitle?: string | null;
  seoDescription?: string | null;
  robotsOverride?: "index" | "noindex" | null;
  canonicalOverride?: string | null;
};

export type Brand = SeoFields & {
  slug: string;
  name: string;
  country?: string | null;
  parentCompany?: string | null;
  websiteUrl?: string | null;
  introMd?: string | null;
  whyWeUseMd?: string | null;
  sustainabilityMd?: string | null;
  hasPage: boolean;
  categories: string[]; // kategorislugs vi leverer merket i
  updatedAt: string;
};

export type Category = SeoFields & {
  slug: string;
  name: string;
  sort: number;
  introMd?: string | null;
  updatedAt: string;
};

export type ProductCard = {
  slug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  categorySlug: string;
  tagline?: string | null;
  certifications: string[];
  hasPage: boolean; // v1: alltid false
  updatedAt: string;
};

export type Solution = SeoFields & {
  slug: string;
  name: string;
  group: "rom" | "tjeneste";
  summary?: string | null;
  priority: "P1" | "P2";
  sort: number;
  updatedAt: string;
};

export type Project = SeoFields & {
  slug: string;
  title: string;
  clientName: string | null;
  location?: string | null;
  year?: number | null;
  workstations?: number | null;
  scope?: string | null;
  challengeMd?: string | null;
  solutionMd?: string | null;
  resultMd?: string | null;
  videoUrls: string[];
  imageCount: number;
  links: { kind: "solution" | "product" | "brand"; slug: string; name: string }[];
  featured: boolean;
  updatedAt: string;
};

export type Testimonial = {
  quote: string;
  personName: string;
  personTitle?: string | null;
  company: string;
  projectSlug?: string | null;
};

export type Person = {
  name: string;
  roleTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  handles: string[];
};
