import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/metadata";
import { liveNav, footerNav } from "@/lib/site/navigation";
import { allGatedPages, SIMPLE_PAGES } from "@/lib/site/pages";

/**
 * Kun indekserbare 200-sider. Innholdssider filtreres gjennom kvalitetsporten
 * (src/lib/site/pages.ts) – samme beslutning som styrer robots på selve siden.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const simple = Object.entries(SIMPLE_PAGES).filter(([, p]) => !p.draft).map(([slug]) => `/${slug}`);
  const gated = (await allGatedPages()).filter((r) => r.index).map((r) => r.path);
  const paths = ["/", ...liveNav().map((i) => i.href), ...footerNav.map((i) => i.href), ...simple, ...gated];
  return [...new Set(paths)].map((path) => ({ url: absoluteUrl(path), lastModified: now }));
}
