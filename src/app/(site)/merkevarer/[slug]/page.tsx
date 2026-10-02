import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadSection, PageIntro, ProductGrid } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ConnectionLine, type Connection } from "@/components/ConnectionLine";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/lib/content/markdown";
import { content } from "@/lib/content/repository";
import { collectionPage } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { brandPage, getAdvisor } from "@/lib/site/pages";

export async function generateStaticParams() {
  return (await content.listBrands()).map((b) => ({ slug: b.slug }));
}

const fallbackDescription = (name: string, cats: string[]) =>
  `${name} ${cats.length ? `(${cats.join(", ").toLowerCase()}) ` : ""}fra Kontorcompaniet. Be om tilbud, eller snakk med en rådgiver om hva som passer.`.slice(0, 160);

export async function generateMetadata({ params }: PageProps<"/merkevarer/[slug]">) {
  const { slug } = await params;
  const p = await brandPage(slug);
  if (!p) return {};
  return buildMetadata({
    title: p.brand.seoTitle ?? p.brand.name,
    description: p.brand.seoDescription ?? p.doc?.data.description ?? fallbackDescription(p.brand.name, p.categories.map((c) => c.name)),
    path: `/merkevarer/${slug}`,
    noindex: !p.index,
  });
}

export default async function BrandPage({ params }: PageProps<"/merkevarer/[slug]">) {
  const { slug } = await params;
  const p = await brandPage(slug);
  if (!p) notFound();
  const [settings, advisor] = await Promise.all([content.getSiteSettings(), getAdvisor()]);
  const { brand } = p;
  const path = `/merkevarer/${slug}`;
  const facts = [brand.country && `Fra ${brand.country}`, brand.parentCompany && `Del av ${brand.parentCompany}`].filter(Boolean) as string[];
  const lead = p.doc?.data.lead ?? `Vi leverer ${brand.name}${p.categories.length ? ` innen ${p.categories.map((c) => c.name.toLowerCase()).join(", ")}` : ""}. Ta kontakt, så hjelper vi dere finne det som passer.`;

  const links: Connection[] = [
    { type: "Merke", name: brand.name },
    ...p.categories.slice(0, 2).map((c) => ({ type: "Produkter", name: c.name, href: `/produkter/${c.slug}` })),
    ...p.projects.slice(0, 1).map((pr) => ({ type: "Prosjekt", name: pr.clientName ?? pr.title, href: `/prosjekter/${pr.slug}` })),
  ];

  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Merkevarer", path: "/merkevarer" }, { name: brand.name, path }]} /></div>
      <PageIntro kicker="Merkevare" title={brand.name} lead={lead}>
        {facts.length > 0 && <p className="facts-inline">{facts.join(" · ")}</p>}
        <div className="btn-row"><a className="btn btn-primary" href="#foresporsel">Be om tilbud på {brand.name}</a></div>
      </PageIntro>
      <ConnectionLine items={links} />

      {p.products.length > 0 && (
        <section className="band tight green" aria-labelledby="h-modeller">
          <div className="wrap">
            <div className="sec-head"><h2 id="h-modeller">Et utvalg fra {brand.name}</h2></div>
            <ProductGrid products={p.products} />
          </div>
        </section>
      )}

      {p.text && (
        <section className="band">
          <div className="wrap article-grid">
            <Markdown source={p.text} />
            {p.categories.length > 0 && (
              <aside className="side">
                <div className="side-block">
                  <h2>{brand.name} hos oss</h2>
                  <ul className="link-list">
                    {p.categories.map((c) => <li key={c.slug}><Link href={`/produkter/${c.slug}`}>{c.name}</Link></li>)}
                  </ul>
                </div>
              </aside>
            )}
          </div>
        </section>
      )}

      <LeadSection
        settings={settings} advisor={advisor} kind="quote_request" context={{ brand: slug }} showList
        title={`Be om tilbud på ${brand.name}`}
        placeholder={`For eksempel: Hvilke ${brand.name}-modeller passer til et landskap med 30 arbeidsplasser?`}
      />
      {p.products.length > 0 && (
        <JsonLd data={collectionPage({ name: brand.name, path, items: p.products.map((pr) => ({ name: pr.name, path: `/produkter/${pr.categorySlug}` })) })} />
      )}
    </>
  );
}
