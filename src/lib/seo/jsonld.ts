import type { SiteSettings } from "@/lib/site/settings";
import { absoluteUrl, SITE_NAME } from "./metadata";

/** Strukturerte data. Kun det innholdet faktisk støtter – ingen «schema-spam». */
type Thing = Record<string, unknown>;

const ORG_ID = () => absoluteUrl("/#organisasjon");

export function organization(s: SiteSettings): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID(),
    name: s.legalName,
    alternateName: s.companyName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo.png"),
    foundingDate: String(s.foundedYear),
    email: s.emailGeneral,
    telephone: s.phone,
    sameAs: Object.values(s.social).filter(Boolean),
  };
}

export function localBusiness(s: SiteSettings): Thing {
  const dayMap: Record<string, string[]> = {
    "Mo-Fr": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  };
  return {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    "@id": absoluteUrl("/kontakt#showroom"),
    name: `${s.companyName} – showroom`,
    parentOrganization: { "@id": ORG_ID() },
    url: absoluteUrl("/kontakt"),
    telephone: s.phone,
    email: s.emailGeneral,
    address: {
      "@type": "PostalAddress",
      streetAddress: s.streetAddress,
      postalCode: s.postalCode,
      addressLocality: s.city,
      addressCountry: s.country,
    },
    ...(s.geo ? { geo: { "@type": "GeoCoordinates", latitude: s.geo.lat, longitude: s.geo.lng } } : {}),
    openingHoursSpecification: s.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayMap[h.days] ?? h.days,
      opens: h.opens,
      closes: h.closes,
    })),
  };
}

export function website(): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#nettsted"),
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "nb-NO",
    publisher: { "@id": ORG_ID() },
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbList(crumbs: Crumb[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
}

export function service(opts: { name: string; description: string; path: string; areaServed?: string[] }): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    provider: { "@id": ORG_ID() },
    areaServed: (opts.areaServed ?? ["Norge"]).map((a) => ({ "@type": "Place", name: a })),
  };
}

export function collectionPage(opts: { name: string; path: string; items: { name: string; path: string }[] }): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    url: absoluteUrl(opts.path),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: opts.items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: absoluteUrl(it.path) })),
    },
  };
}

export function article(opts: { headline: string; path: string; datePublished?: string; dateModified?: string; author?: string; image?: string }): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    url: absoluteUrl(opts.path),
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    ...(opts.image ? { image: absoluteUrl(opts.image) } : {}),
    author: opts.author ? { "@type": "Person", name: opts.author } : { "@id": ORG_ID() },
    publisher: { "@id": ORG_ID() },
  };
}

export function faqPage(items: { q: string; a: string }[]): Thing {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

/** Trygg serialisering for <script type="application/ld+json"> (hindrer </script>-injeksjon) */
export function serializeJsonLd(data: Thing | Thing[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
