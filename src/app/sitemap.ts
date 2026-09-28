import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/metadata";
import { liveNav } from "@/lib/site/navigation";

/**
 * Kun indekserbare 200-sider. Nye sidetyper legges til her når de lanseres,
 * og hver side filtreres gjennom kvalitetsporten (src/lib/seo/quality.ts).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = ["/", ...liveNav().map((i) => i.href)];
  return [...new Set(staticPages)].map((path) => ({ url: absoluteUrl(path), lastModified: now }));
}
