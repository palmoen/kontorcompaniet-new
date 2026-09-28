import type { Metadata } from "next";
import { isIndexable, siteUrl } from "@/lib/env";

export const SITE_NAME = "Kontorcompaniet";
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

export type PageSeo = {
  /** Sidens egen tittel uten merkenavn, f.eks. «Kontorstoler» */
  title: string;
  description: string;
  /** Relativ sti, f.eks. «/produkter/kontorstoler». Blir kanonisk URL. */
  path: string;
  image?: { url: string; width?: number; height?: number; alt?: string };
  noindex?: boolean;
  canonicalOverride?: string | null;
  type?: "website" | "article";
};

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const clean = `/${path.replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return clean ? `${siteUrl}${clean}` : siteUrl;
}

/** «Kontorstoler» → «Kontorstoler | Kontorcompaniet». Merkenavnet droppes hvis tittelen blir for lang. */
export function formatTitle(title: string): string {
  if (title.includes(SITE_NAME)) return title;
  const full = `${title} | ${SITE_NAME}`;
  return full.length <= TITLE_MAX ? full : title;
}

export function buildMetadata(seo: PageSeo): Metadata {
  if (seo.description.length > DESCRIPTION_MAX) {
    // Hard grense: lange beskrivelser kuttes av Google. Fanges også av SEO-testene.
    console.warn(`[seo] description > ${DESCRIPTION_MAX} tegn for ${seo.path}`);
  }
  const canonical = seo.canonicalOverride ? absoluteUrl(seo.canonicalOverride) : absoluteUrl(seo.path);
  const title = formatTitle(seo.title);
  const index = isIndexable && !seo.noindex;
  return {
    title: { absolute: title },
    description: seo.description,
    alternates: { canonical },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      type: seo.type ?? "website",
      locale: "nb_NO",
      siteName: SITE_NAME,
      url: canonical,
      title,
      description: seo.description,
      images: seo.image ? [{ ...seo.image, url: absoluteUrl(seo.image.url) }] : undefined,
    },
    twitter: { card: seo.image ? "summary_large_image" : "summary", title, description: seo.description },
  };
}
