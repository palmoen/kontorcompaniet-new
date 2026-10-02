import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqList, LeadSection, PageIntro, ProductGrid, ProjectTeaser } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ConnectionLine, type Connection } from "@/components/ConnectionLine";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/lib/content/markdown";
import { content } from "@/lib/content/repository";
import { collectionPage, faqPage } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { categoryPage, getAdvisor, projectImages } from "@/lib/site/pages";

export async function generateStaticParams() {
  return (await content.listCategories()).map((c) => ({ kategori: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/produkter/[kategori]">) {
  const { kategori } = await params;
  const p = await categoryPage(kategori);
  if (!p) return {};
  return buildMetadata({
    title: p.category.seoTitle ?? p.category.name,
    description: p.category.seoDescription ?? p.doc.data.description,
    path: `/produkter/${kategori}`,
    image: p.doc.data.image ? { url: p.doc.data.image, alt: p.doc.data.imageAlt } : undefined,
    noindex: !p.index,
  });
}

export default async function CategoryPage({ params }: PageProps<"/produkter/[kategori]">) {
  const { kategori } = await params;
  const p = await categoryPage(kategori);
  if (!p) notFound();
  const [settings, advisor] = await Promise.all([content.getSiteSettings(), getAdvisor()]);
  const { category, doc } = p;
  const path = `/produkter/${kategori}`;
  const featuredBrands = p.brands.filter((b) => b.hasPage);
  const otherBrands = p.brands.filter((b) => !b.hasPage);

  const links: Connection[] = [
    { type: "Produkter", name: category.name },
    ...p.solutions.slice(0, 2).map((s) => ({ type: "Løsning", name: s.name, href: `/losninger/${s.slug}` })),
    ...featuredBrands.slice(0, 1).map((b) => ({ type: "Merke", name: b.name, href: `/merkevarer/${b.slug}` })),
    ...p.projects.slice(0, 1).map((pr) => ({ type: "Prosjekt", name: pr.clientName ?? pr.title, href: `/prosjekter/${pr.slug}` })),
  ];

  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Produkter", path: "/produkter" }, { name: category.name, path }]} /></div>
      <PageIntro title={category.name} lead={doc.data.lead} image={doc.data.image} imageAlt={doc.data.imageAlt}>
        <div className="btn-row">
          <a className="btn btn-primary" href="#foresporsel">Be om tilbud</a>
        </div>
      </PageIntro>
      <ConnectionLine items={links} />

      {p.products.length > 0 && (
        <section className="band tight green" aria-labelledby="h-utvalg">
          <div className="wrap">
            <div className="sec-head">
              <h2 id="h-utvalg">Et utvalg vi leverer</h2>
              <p className="muted measure">
                Dette er modeller vi kjenner godt. Vi leverer mye mer enn det som står her, så spør gjerne om andre modeller.
                Priser får dere i tilbudet, tilpasset antall og utførelse.
              </p>
            </div>
            <ProductGrid products={p.products} />
          </div>
        </section>
      )}

      <section className="band">
        <div className="wrap article-grid">
          <Markdown source={p.body} />
          <aside className="side">
            {featuredBrands.length > 0 && (
              <div className="side-block">
                <h2>Merker</h2>
                <ul className="link-list">
                  {featuredBrands.map((b) => <li key={b.slug}><Link href={`/merkevarer/${b.slug}`}>{b.name}</Link></li>)}
                </ul>
                {otherBrands.length > 0 && <p className="muted small">Også {otherBrands.map((b) => b.name).join(", ")}.</p>}
              </div>
            )}
            {p.solutions.length > 0 && (
              <div className="side-block">
                <h2>Brukes i</h2>
                <ul className="link-list">
                  {p.solutions.map((s) => <li key={s.slug}><Link href={`/losninger/${s.slug}`}>{s.name}</Link></li>)}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>

      {p.projects[0] && (
        <section className="band tight">
          <div className="wrap"><ProjectTeaser project={p.projects[0]} image={projectImages[p.projects[0].slug]?.[0]} /></div>
        </section>
      )}

      <FaqList items={p.faq} />
      <LeadSection
        settings={settings} advisor={advisor} kind="quote_request" context={{ category: kategori }} showList
        title="Be om tilbud"
        intro="Legg produkter i prosjektlisten, eller skriv hva dere trenger. Vi svarer med forslag og pris, og tar gjerne en befaring."
        placeholder={`For eksempel: 20 ${category.name.toLowerCase()} til et nytt kontor i Drammen, levert i februar.`}
      />
      <JsonLd data={[
        collectionPage({ name: category.name, path, items: p.products.map((pr) => ({ name: pr.name, path: `/merkevarer/${pr.brandSlug}` })) }),
        ...(p.faq.length ? [faqPage(p.faq)] : []),
      ]} />
    </>
  );
}
