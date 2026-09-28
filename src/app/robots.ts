import type { MetadataRoute } from "next";
import { isIndexable, siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) {
    // Preview/staging: aldri indekser
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/mobelscout/resultat/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
