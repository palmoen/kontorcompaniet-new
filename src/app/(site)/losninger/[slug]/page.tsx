import Link from "next/link";
import { notFound } from "next/navigation";
import { FaqList, LeadSection, PageIntro, ProjectTeaser } from "@/components/blocks";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ConnectionLine, type Connection } from "@/components/ConnectionLine";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/lib/content/markdown";
import { content } from "@/lib/content/repository";
import { faqPage, service } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAdvisor, projectImages, solutionPage } from "@/lib/site/pages";

export async function generateStaticParams() {
  return (await content.listSolutions()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/losninger/[slug]">) {
  const { slug } = await params;
  const p = await solutionPage(slug);
  if (!p) return {};
  return buildMetadata({
    title: p.solution.seoTitle ?? p.solution.name,
    description: p.solution.seoDescription ?? p.doc.data.description,
    path: `/losninger/${slug}`,
    image: p.doc.data.image ? { url: p.doc.data.image, alt: p.doc.data.imageAlt } : undefined,
    noindex: !p.index,
  });
}

export default async function SolutionPage({ params }: PageProps<"/losninger/[slug]">) {
  const { slug } = await params;
  const p = await solutionPage(slug);
  if (!p) notFound();
  const [settings, advisor, solutions] = await Promise.all([content.getSiteSettings(), getAdvisor(), content.listSolutions()]);
  const { solution, doc } = p;
  const path = `/losninger/${slug}`;
  const siblings = solutions.filter((s) => s.group === solution.group && s.slug !== slug);

  const links: Connection[] = [
    { type: "Løsning", name: solution.name },
    ...p.categories.slice(0, 2).map((c) => ({ type: "Produkter", name: c.name, href: `/produkter/${c.slug}` })),
    ...p.projects.slice(0, 1).map((pr) => ({ type: "Prosjekt", name: pr.clientName ?? pr.title, href: `/prosjekter/${pr.slug}` })),
    ...(advisor ? [{ type: "Rådgiver", name: advisor.name, href: "#foresporsel" }] : []),
    { type: "Brukt", name: "Møbelscout", href: "/mobelscout", scout: true },
  ];

  return (
    <>
      <div className="wrap"><Breadcrumbs crumbs={[{ name: "Løsninger", path: "/losninger" }, { name: solution.name, path }]} /></div>
      <PageIntro title={solution.name} lead={doc.data.lead} image={doc.data.image} imageAlt={doc.data.imageAlt}>
        <div className="btn-row">
          <a className="btn btn-primary" href="#foresporsel">Snakk med en rådgiver</a>
        </div>
      </PageIntro>
      <ConnectionLine items={links} />

      <section className="band">
        <div className="wrap article-grid">
          <Markdown source={p.body} />
          <aside className="side">
            {p.categories.length > 0 && (
              <div className="side-block">
                <h2>Produkter</h2>
                <ul className="link-list">
                  {p.categories.map((c) => <li key={c.slug}><Link href={`/produkter/${c.slug}`}>{c.name}</Link></li>)}
                </ul>
              </div>
            )}
            {p.brands.length > 0 && (
              <div className="side-block">
                <h2>Merker vi bruker</h2>
                <ul className="link-list">
                  {p.brands.slice(0, 8).map((b) => <li key={b.slug}><Link href={`/merkevarer/${b.slug}`}>{b.name}</Link></li>)}
                </ul>
              </div>
            )}
            {siblings.length > 0 && (
              <div className="side-block">
                <h2>{solution.group === "rom" ? "Andre rom" : "Andre tjenester"}</h2>
                <ul className="link-list">
                  {siblings.map((s) => <li key={s.slug}><Link href={`/losninger/${s.slug}`}>{s.name}</Link></li>)}
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
      <LeadSection settings={settings} advisor={advisor} context={{ solution: slug }} kind="advisor_request" />
      <JsonLd data={[
        service({ name: solution.name, description: doc.data.description ?? "", path }),
        ...(p.faq.length ? [faqPage(p.faq)] : []),
      ]} />
    </>
  );
}
